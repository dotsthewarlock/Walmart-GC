import { createSyncEngine } from './lib/syncEngine';
import { fingerprint } from './lib/syncProtocol';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { calculateVisibleCards, calculateCardSummary } from './lib/cards';
import { useSettings } from './features/settings/useSettings';
import { SettingsPanel } from './features/settings/SettingsPanel';
import { CardsPanel } from './features/cards/CardsPanel';
import { CheckoutPanel } from './features/checkout/CheckoutPanel';
import { credentialAmbiguous } from './lib/inventoryRecovery';
import { recoverySummary } from './lib/reconciliationPolicy';
import { CheckoutOverlays } from './features/checkout/CheckoutOverlays';
import { useCheckout } from './features/checkout/useCheckout';
import { cardsToCsv, parseRawCardData, wouldDiscardCardMetadata } from './lib/csv';
import { fetchWorkerJson, googleOAuthStatuses, directSheetsStatuses, syncStatuses } from './lib/api';
import { Button } from './components/primitives/Button';
import { IconButton } from './components/primitives/IconButton';
import { Card } from './components/primitives/Card';
import { Dialog } from './components/primitives/Dialog';
import { NavigationBar, NavigationBarItem } from './components/primitives/NavigationBar';
import { TextArea } from './components/primitives/TextArea';
import { BalanceReview } from './components/BalanceReview';
import {useVerificationSession} from './features/verification/useVerificationSession';
import { openInventory, operationId, profileOf, inventoryContext, assertInventoryContext, savedCompartments, compartmentCards, recoveryExport, recoveryWarning, validateInventory } from './lib/inventory';
import { Settings2, ClipboardCheck } from 'lucide-react';
import { StatusChip } from './components/primitives/Chip';

function isCardsHeaderError(message) {
  return /(?:Missing|Duplicate) required Cards header|Cards header row|Cards headers do not match|cards_header_schema/i.test(String(message || ""));
}

function maskCardNumber(cardNumber) {
  const digits = String(cardNumber ?? "").replace(/\D/g, "");
  if (!digits) {
    return "—";
  }
  if (digits.length <= 8) {
    return digits;
  }
  const firstFour = digits.slice(0, 4);
  const lastFour = digits.slice(-4);
  const middleMaskLength = digits.length - 8;
  const maskedDigits = `${firstFour}${"•".repeat(middleMaskLength)}${lastFour}`;
  return maskedDigits.replace(/(.{4})/g, "$1 ").trim();
}

function getSyncChipStatus(summaryKey) {
  if (summaryKey === 'connected') {
    return 'success';
  }
  if (summaryKey === 'checking') {
    return 'warning';
  }
  if (['conflict', 'unavailable', 'unsynced', 'error'].includes(summaryKey)) {
    return 'danger';
  }
  return 'neutral';
}

async function writeClipboardText(text, isCurrent = () => true, validate = async () => isCurrent()) {
  if (!isCurrent()) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea copy path for browsers that block Clipboard API writes.
    }
  }

  let relevant=false;
  try { relevant=await validate(); } catch { /* obsolete or unreadable saved context */ }
  if (!relevant || !isCurrent() || typeof document === "undefined" || !document.body) {
    return false;
  }

  const trigger = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (isCurrent() && document.activeElement === document.body && trigger?.isConnected) {
      trigger.focus({ preventScroll: true });
    }
  }
}

function App() {
  const cardsLoaded = useRef(false);
  const inventoryStore = useRef(null);
  const walletRef = useRef(null);
  const selectionIdentity = useRef(null);
  const [walletSnapshot, setWalletSnapshot] = useState(null);
  const syncEngine = useRef(null);
  const [syncUi,setSyncUi] = useState({phase:'local',message:'Saved on this device.'});
  const csvTarget = useRef(null);
  const recoveryReloadRequired = useRef(false);
  const panelScroll = useRef({});
  const pendingPanelFocus = useRef(null);
  const navigationAction = useRef(0);
  const reviewReturn = useRef({ panel: 'list', focusId: 'review-balances' });
  const verificationSession=useVerificationSession(walletSnapshot,{
    readWallet,commitWallet,getTransferWallet,copyText:writeClipboardText,
  });
  const verificationBusy = useRef(false);
  verificationBusy.current = verificationSession.busy;
  useLayoutEffect(() => {
    // Starting a command supersedes any asynchronous Exit already resolving.
    if (verificationSession.busy) navigationAction.current++;
  }, [verificationSession.busy]);
  const contextualTask = useRef(null);
  const mainTouchStart = useRef(null);
  const [cards, setCards] = useState([]);
  const [localCardsError, setLocalCardsError] = useState("");
  const [inventoryNotice, setInventoryNotice] = useState("");
  const [transferMutationError, setTransferMutationError] = useState("");
  const sheetMutation = useRef(false);
  const transferWallet = useRef(null);
  const [activePanel, setActivePanel] = useState('list'); // list, detail, review, settings
  const [previousPrimaryPanel, setPreviousPrimaryPanel] = useState('list');
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  // Raw CSV Editor Modal and backup states
  const SHOW_RAW_CSV_EDITOR = false;
  const [isRawDataModalOpen, setIsRawDataModalOpen] = useState(false);
  const [rawDataText, setRawDataText] = useState("");
  const [isRawDataLocked, setIsRawDataLocked] = useState(true);
  const [validationSummary, setValidationSummary] = useState("No validation run yet.");
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Worker session and Google OAuth States
  const [oauthState, setOauthState] = useState({
    status: googleOAuthStatuses.disconnected,
    connectedEmail: "",
    connectedName: "",
    message: "Local cards are saved on this device. Connect Google for synchronization.",
    lastErrorMessage: "",
    workerVersion: "unknown",
    schemaMode: "unknown",
  });

  // Direct Google Sheets sync state
  const [directSheetsState, setDirectSheetsState] = useState({
    spreadsheetId: "",
    spreadsheetUrl: "",
    spreadsheetName: "",
    status: directSheetsStatuses.notConfigured,
    cardsSheetInitialized: "unknown",
    remoteSheetVersion: "",
    lastSuccessfulSyncAt: "",
    pendingUnsynced: false,
    message: "Connect Google for synchronization.",
    lastErrorMessage: "",
  });

  // General Concurrency tracking Sync State
  const [syncState, setSyncState] = useState({
    status: syncStatuses.unsynced,
    lastSyncTimestamp: "",
    lastSyncAttemptTimestamp: "",
    lastKnownSheetVersion: "",
    message: "Waiting for a verified Google account and Sheet.",
    lastErrorMessage: "",
    pendingOperation: null,
  });

  const settingsController = useSettings({
    active: activePanel === 'settings', connectionStatus: oauthState.status,
    summaryKey: getAppSyncSummaryState().key,
    onAutomaticEnabled: () => syncEngine.current?.foreground(),
  });
  const { settings, current: preferences } = settingsController;

  const selectedCard = cards[selectedCardIndex];
  const credentialBlocked=walletSnapshot&&credentialAmbiguous(profileOf(walletSnapshot).recoveryEvidence,selectedCard?.cardNumber);
  const checkout = useCheckout({
    active: activePanel === 'detail',
    contextKey: JSON.stringify([walletSnapshot?.active, walletSnapshot?.contextGeneration ?? 0]),
    selectedCard, copyText: writeClipboardText,
    commands: {
      captureTarget: cardTarget,
      isContextCurrent: target => {
        try { assertInventoryContext(walletRef.current, target); return true; }
        catch { return false; }
      },
      validateCopyTarget: async target => {
        const saved=await readWallet();assertInventoryContext(saved,target);
        const p=profileOf(saved),matches=p.cards.filter(card=>card.cardNumber===target.cardNumber);
        return matches.length===1&&p.versions[target.cardNumber]===target.version
          &&!credentialAmbiguous(p.recoveryEvidence,target.cardNumber)&&matches[0].pin===selectedCard?.pin;
      },
      saveBalance: (target, value, isCurrent) => commitWallet({ kind: "patch", action: "set-balance", ...target,
        patch: { currentBalance: value, dateUpdated: new Date().toISOString().slice(0, 10) } }, isCurrent),
      saveNotes: (target, notes, isCurrent) => commitWallet({ kind: "patch", action: "set-notes", ...target, patch: { notes } }, isCurrent),
    },
  });

  transferWallet.current = { cards, sheets: directSheetsState, sync: syncState };
  selectionIdentity.current = cards[selectedCardIndex]?.cardNumber ?? null;

  function adoptWallet(state) {
    if (walletRef.current && walletRef.current.revision > state.revision) return;
    const currentNumber = selectionIdentity.current;
    const sameContext = walletRef.current?.active === state.active;
    const contextChanged = walletRef.current && (walletRef.current.contextGeneration ?? 0) !== (state.contextGeneration ?? 0);
    if (contextChanged) {
      // A response abandoned by a persistent context change must not leave an
      // indefinite connection spinner or imply a verified selected owner.
      setOauthState(prev => prev.status === googleOAuthStatuses.connecting
        ? { ...prev, status: googleOAuthStatuses.disconnected, connectedEmail: "", connectedName: "",
          message: "Connection check was superseded. Saved inventories remain available offline.", lastErrorMessage: "" }
        : prev);
    }
    walletRef.current = state;
    const profile = profileOf(state);
    setWalletSnapshot(state);
    setInventoryNotice(state.quarantine.length ? `${state.quarantine.length} recovery item(s) are quarantined. Original data remains preserved on this device.` : "");
    setCards(profile.cards);
    const selected = profile.cards.findIndex(card => card.cardNumber === currentNumber);
    const visible = calculateVisibleCards(profile.cards, preferences.current, preferences.current.sortMode);
    setSelectedCardIndex(sameContext && selected >= 0 ? selected : (visible[0] ?? -1));
    if (profile.sheets) setDirectSheetsState({ ...profile.sheets, message: "Saved Sheet inventory. Pending work stays on this device until confirmed.", pendingUnsynced: profile.pending.length > 0 });
    else setDirectSheetsState(prev => ({ ...prev, spreadsheetId: "", spreadsheetUrl: "", remoteSheetVersion: "", pendingUnsynced: profile.pending.length > 0, status: directSheetsStatuses.notConfigured, message: "Unbound inventory saved on this device. Select your connected inventory to synchronize." }));
    if (profile.sync) setSyncState({ ...profile.sync, message: "Local inventory saved on this device.", pendingOperation: profile.pending.length ? "local-changes" : null });
    else setSyncState(prev => ({ ...prev, status: syncStatuses.unsynced, lastKnownSheetVersion: "", message: "Local inventory saved on this device.", pendingOperation: profile.pending.length ? "local-changes" : null }));
  }

  async function readWallet() {
    if (!inventoryStore.current) throw new Error("Local inventory is still opening.");
    return inventoryStore.current.read();
  }

  async function responseIsCurrent(context) {
    if (!context) return false;
    try { assertInventoryContext(await readWallet(), context); return true; }
    catch { return false; }
  }

  async function commitWallet(command, feedbackIsCurrent = () => true) {
    if (!inventoryStore.current) throw new Error("Local inventory is still opening.");
    if (command.kind === "discard-batch" && recoveryReloadRequired.current) throw new Error("Reload the wallet before discarding the preserved Batch.");
    try {
      const state = await inventoryStore.current.commit({ id: operationId(), ...command });
      adoptWallet(state);
      // A late transaction notification may follow a newer context adoption.
      // It must not clear errors or change feedback in that newer context.
      if (command.profile) {
        try { assertInventoryContext(walletRef.current, inventoryContext(state)); }
        catch { return state; }
      }
      if (feedbackIsCurrent()) setTransferMutationError("");
      if (['patch','manual-verification','mark-zero-used','csv-recovery','apply-batch','resolve-conflict','select-compartment'].includes(command.kind)) {
        if(command.kind==='select-compartment'||profileOf(state).pending.length||profileOf(state).inFlight){
          setSyncUi({phase:'local',message:'Changes saved on this device.'});
          if(command.kind==='select-compartment')syncEngine.current?.foreground();
          if(profileOf(state).pending.length||profileOf(state).inFlight)syncEngine.current?.schedule();
        }
      }
      return state;
    } catch (error) {
      if (command.kind === "discard-batch") recoveryReloadRequired.current = true;
      let current = true;
      if (command.profile) {
        try { assertInventoryContext(walletRef.current, command); }
        catch { current = false; }
      }
      if (current && feedbackIsCurrent()) setTransferMutationError(error.message);
      throw error;
    }
  }

  function cardTarget(card) {
    const state = walletSnapshot;
    if (!state || !card) throw new Error("Local inventory is still opening.");
    return { ...inventoryContext(state), cardNumber: card.cardNumber, version: profileOf(state).versions[card.cardNumber] };
  }

  async function beginSheetMutation() {
    if (sheetMutation.current) return null;
    sheetMutation.current = true;
    try {
      return await commitWallet({ kind: "begin-context", ...inventoryContext(walletSnapshot) });
    } catch { sheetMutation.current = false; return null; }
  }

  function getTransferWallet() {
    if (sheetMutation.current) throw new Error("Wait for the current Sheet operation to finish.");
    return transferWallet.current;
  }

  function getAppSyncSummaryState() {
    const current=walletRef.current&&profileOf(walletRef.current);
    const pending = current&&(current.pending.length||current.inFlight||current.remoteBase?.needsRepair
      ||walletRef.current.controlFlights?.[current.context.principal]);
    if(syncUi.phase==='checking')return {key:'checking',label:'Checking sync…',help:'Local cards stay available'};
    if(['error','blocked','maintenance'].includes(syncUi.phase))return {key:'error',label:'Sync blocked',help:syncUi.message};
    if(syncUi.phase==='saved'&&!pending)return {key:'connected',label:'Synced',help:syncUi.message};
    return {key:'local-only',label:pending?'Saved locally':'Local inventory',help:syncUi.message};
  }

  // Handle theme mode changes dynamically
  useEffect(() => {
    const applyTheme = () => {
      const mode = settings.themeMode || "system";
      let isDark = false;
      if (activePanel === 'detail' && settings.checkoutDark) {
        isDark = true;
      } else if (mode === "dark") {
        isDark = true;
      } else if (mode === "light") {
        isDark = false;
      } else {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (settings.themeMode === "system" || !settings.themeMode) {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [settings.themeMode, settings.checkoutDark, activePanel]);

  // Inventory and Batch state have one transaction boundary. Legacy values are
  // migration inputs only; cached Sheet context is never restored as ownership.
  useEffect(() => {
    let cancelled = false;
    let channel;
    try { channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("walmartGc.inventory") : null; } catch { /* focus reload fallback */ }
    const store = openInventory({ notify: () => channel?.postMessage("committed") });
    async function reload() {
      try {
        const state = await store.captureLegacyChanges();
        if (!cancelled && state) {
          adoptWallet(state);
          if(profileOf(state).pending.length||profileOf(state).inFlight)syncEngine.current?.schedule();
        }
      } catch (error) { if (!cancelled) setTransferMutationError(error.message); }
    }
    if (channel) channel.onmessage = reload;
    window.addEventListener("focus", reload);
    const legacyChanged = event => {
      if (event.key === null || event.key === 'walmartGc.cards' || event.key === 'walmartGc.balanceTransfer') reload();
    };
    window.addEventListener("storage", legacyChanged);
    (async () => {
      try {
        const state = await store.initialize();
        if (cancelled) return;
        inventoryStore.current = store;
        cardsLoaded.current = true;
        settingsController.initialize();
        adoptWallet(state);
        const url = new URL(window.location.href);
        const authReturn = url.searchParams.get("auth") === "connected";
        if (authReturn) {
          url.searchParams.delete("auth");
          window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
        }
        const engine=createSyncEngine({store,request:fetchWorkerJson,automatic:()=>preferences.current.automaticSync!==false,
          onState:state=>{if(!cancelled)adoptWallet(state);},
          onStatus:value=>{if(!cancelled)setSyncUi(value);},
          onAuth:status=>{if(!cancelled)setOauthState({status:status.authenticated?'connected':'disconnected',connectedEmail:status.email||'',connectedName:status.name||'',principal:status.principal||'',message:status.authenticated?'Google account connected.':'Connect Google for automatic synchronization.',lastErrorMessage:'',workerVersion:status.workerVersion||'',schemaMode:status.schemaMode||''});}});
        syncEngine.current=engine;engine.start({authReturn});
      } catch (error) { if (!cancelled) setLocalCardsError(error.message); }
    })();
    const foreground=()=>{if(document.visibilityState==='visible')syncEngine.current?.foreground();};
    const reconnect=foreground;
    window.addEventListener("online",reconnect);document.addEventListener("visibilitychange",foreground);window.addEventListener("focus",reconnect);
    return () => { cancelled = true; syncEngine.current?.stop();window.removeEventListener("online",reconnect);document.removeEventListener("visibilitychange",foreground);window.removeEventListener("focus",reconnect); window.removeEventListener("focus", reload); window.removeEventListener("storage", legacyChanged); channel?.close(); store.close().catch(() => {}); };
  }, []);

  // UI-only destination continuity. Inventory and credential-bearing workflows
  // keep their existing owners; nothing here is persisted.
  useLayoutEffect(() => {
    const target = document.getElementById(pendingPanelFocus.current)
      ?? document.getElementById('wallet-section-heading');
    pendingPanelFocus.current = null;
    target?.focus({ preventScroll: true });
    window.scrollTo(0, panelScroll.current[activePanel] ?? 0);
  }, [activePanel]);

  function navigate(panel, focusId = null) {
    if (verificationSession.getSnapshot().busy || panel === activePanel) return;
    if(activePanel==='review'&&verificationSession.getSnapshot().contextual)return;
    navigationAction.current++;
    panelScroll.current[activePanel] = window.scrollY;
    pendingPanelFocus.current = focusId;
    setActivePanel(panel);
  }

  function openSettings() {
    if (activePanel === 'settings') navigate(previousPrimaryPanel, 'open-settings');
    else {
      setPreviousPrimaryPanel(activePanel);
      navigate('settings');
    }
  }

  function openBalanceReview(flagged = false) {
    if (verificationSession.busy || activePanel === 'review') return;
    if (flagged || activePanel !== 'settings' || previousPrimaryPanel !== 'review') {
      reviewReturn.current = { panel: activePanel,
        ...(activePanel === 'detail' ? { ...inventoryContext(walletSnapshot),
          cardIdentity: fingerprint(selectedCard?.cardNumber).catch(() => null) } : {}),
        focusId: flagged ? 'review-flagged' : activePanel === 'list' ? 'review-balances' : 'nav-review' };
    }
    if (flagged) verificationSession.startFlaggedReview();
    else verificationSession.enter();
    navigate('review');
  }

  async function verifyCheckoutCard() {
    if(verificationSession.busy||!selectedCard||credentialBlocked)return;
    const origin={panel:'detail',...inventoryContext(walletSnapshot),
      cardIdentity:fingerprint(selectedCard.cardNumber).catch(()=>null),focusId:'verify-balance'};
    await verificationSession.startContextual(cardTarget(selectedCard));
    const task=verificationSession.getSnapshot().contextual;
    if(!task){setTransferMutationError(verificationSession.getSnapshot().feedback.selectionError);return;}
    reviewReturn.current=origin;
    contextualTask.current=task.id;
    navigate('review');
  }

  useEffect(()=>{
    if(!contextualTask.current||verificationSession.busy)return;
    if(verificationSession.contextual?.id===contextualTask.current&&!verificationSession.contextual.done)return;
    contextualTask.current=null;
    verificationSession.finishContextual();
    void exitBalanceReview();
  },[verificationSession.contextual,verificationSession.busy]);

  async function exitBalanceReview() {
    if(verificationSession.getSnapshot().busy)return;
    contextualTask.current=null;
    verificationSession.finishContextual();
    setTransferMutationError('');
    const origin = reviewReturn.current;
    const action = navigationAction.current;
    if (origin.panel === 'detail') {
      try {
        const identity = await origin.cardIdentity;
        let state = await readWallet();
        // Bound retries under continuous inventory activity. Reordering or a
        // restored card gets resolved afresh instead of using a stale index.
        for (let attempt = 0; attempt < 3; attempt++) {
          const identities = await Promise.all(profileOf(state).cards.map(card => fingerprint(card.cardNumber)));
          const saved = await readWallet();
          if (action !== navigationAction.current || verificationBusy.current) return;
          const latest = walletRef.current.revision > saved.revision ? walletRef.current : saved;
          adoptWallet(latest);
          if (latest.active !== origin.profile || (latest.contextGeneration ?? 0) !== origin.generation) break;
          if (latest.revision !== state.revision) { state = latest; continue; }
          const index = identity ? identities.indexOf(identity) : -1;
          const eligible = index >= 0 && calculateVisibleCards(profileOf(latest).cards, preferences.current, preferences.current.sortMode).includes(index)
            && !credentialAmbiguous(profileOf(latest).recoveryEvidence, profileOf(latest).cards[index].cardNumber);
          if (!eligible) break;
          setSelectedCardIndex(index);
          navigate(origin.panel, origin.focusId);
          return;
        }
        navigate('list');
        return;
      } catch {
        if (action === navigationAction.current) navigate('list');
        return;
      }
    }
    navigate(origin.panel, origin.focusId);
  }

  function openCheckout() {
    const nextIndex = ensureVisibleSelection();
    if (nextIndex === -1 || verificationSession.busy) return;
    setSelectedCardIndex(nextIndex);
    navigate('detail');
  }


  // Compute card summaries based on state
  const { totalCount, activeCount, totalBalance, activeBalance } = calculateCardSummary(cards, settings);

  // Compute visible indices
  const visibleIndexes = calculateVisibleCards(cards, settings, settings.sortMode);

  const ensureVisibleSelection = (preferredIndex = selectedCardIndex) => {
    if (visibleIndexes.length === 0) {
      return -1;
    }
    if (visibleIndexes.includes(preferredIndex)) {
      return preferredIndex;
    }
    return visibleIndexes[0];
  };

  // Handle used toggles on specific card items
  const handleToggleUsed = async (index) => {
    const card = cards[index];
    if (!card) return;
    const target = cardTarget(card);
    try {
      await commitWallet({ kind: "patch", action: "set-used", ...target, patch: { used: !card.used,
        dateUsed: card.used ? "" : new Date().toISOString().slice(0, 10) } });
      if (!card.used && settings.advanceOnMarkUsed) {
        const currentPosition = visibleIndexes.indexOf(index);
        if (walletRef.current.active === target.profile && currentPosition >= 0 && visibleIndexes.length > 1) {
          const nextNumber = cards[visibleIndexes[(currentPosition + 1) % visibleIndexes.length]].cardNumber;
          setSelectedCardIndex(profileOf(walletRef.current).cards.findIndex(c => c.cardNumber === nextNumber));
        }
      }
    } catch { /* save error is displayed; inventory remains committed state */ }
  };

  const handleMarkZeroBalanceUsed = async () => {
    if (!window.confirm(`Mark all ${zeroBalanceCount} zero-balance card(s) as used?`)) return;
    const state = walletSnapshot;
    const profile = profileOf(state);
    try {
      await commitWallet({ kind: "mark-zero-used", ...inventoryContext(state),
        targets: profile.cards.filter(card => card.currentBalance === 0 && !card.used)
          .map(card => ({ cardNumber: card.cardNumber, version: profile.versions[card.cardNumber] })),
        date: new Date().toISOString().slice(0, 10) });
    } catch { /* save error displayed */ }
  };

  const zeroBalanceCount = cards.filter(card => card.currentBalance === 0 && !card.used).length;

  const visiblePosition = visibleIndexes.indexOf(selectedCardIndex);

  // Shared selection; Checkout resets its own editors on previous/next.
  const handlePrevCard = () => {
    if (visibleIndexes.length === 0) return;
    const currentPosition = visibleIndexes.indexOf(selectedCardIndex);
    const nextPosition = (currentPosition - 1 + visibleIndexes.length) % visibleIndexes.length;
    setSelectedCardIndex(visibleIndexes[nextPosition]);
    checkout.resetForCardNavigation();
  };

  const handleNextCard = () => {
    if (visibleIndexes.length === 0) return;
    const currentPosition = visibleIndexes.indexOf(selectedCardIndex);
    const nextPosition = (currentPosition + 1) % visibleIndexes.length;
    setSelectedCardIndex(visibleIndexes[nextPosition]);
    checkout.resetForCardNavigation();
  };

  // Touch Swiping for Page Navigation (Cards <-> Checkout)
  const handleMainTouchStart = (event) => {
    if (isRawDataModalOpen || checkout.isEditingBalance || checkout.isEditingNotes) {
      mainTouchStart.current = null;
      return;
    }
    if (event.touches.length !== 1) {
      mainTouchStart.current = null;
      return;
    }
    const target = event.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      mainTouchStart.current = null;
      return;
    }
    mainTouchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handleMainTouchEnd = (event) => {
    if (!mainTouchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - mainTouchStart.current.x;
    const deltaY = touch.clientY - mainTouchStart.current.y;
    mainTouchStart.current = null;

    // Check thresholds: horizontal delta >= 120, vertical tolerance <= 70, horizontal dominant
    if (Math.abs(deltaX) < 120 || Math.abs(deltaY) > 70 || Math.abs(deltaY) > Math.abs(deltaX) * 0.7) {
      return;
    }

    if (deltaX < 0) {
      // Swipe left: Cards (list) -> Checkout (detail)
      if (activePanel === 'list') {
        openCheckout();
      }
    } else if (deltaX > 0) {
      // Swipe right: Checkout (detail) -> Cards (list)
      if (activePanel === 'detail') {
        navigate('list');
      }
    }
  };



  // CSV Export Action
  const handleExportCsv = async (filename = "walmart-gift-cards-export.csv", key = walletSnapshot.active) => {
    try {
      const saved = await readWallet();
      const csvContent = cardsToCsv(compartmentCards(saved, key));
      downloadFile(csvContent, filename, "text/csv;charset=utf-8");
      return true;
    } catch (error) { setTransferMutationError(error.message); return false; }
  };

  function downloadFile(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const handleExportRecovery = async () => {
    if (!window.confirm(recoveryWarning)) return;
    try {
      downloadFile(recoveryExport(await readWallet()), "gc-wallet-private-recovery.json", "application/json");
    } catch (error) { setTransferMutationError(error.message); }
  };

  const handleSelectCompartment = async (target) => {
    try { await commitWallet({ kind: "select-compartment", ...inventoryContext(walletSnapshot), target }); }
    catch { /* transaction error is displayed */ }
  };

  // CSV Import File Processing Action
  const handleImportCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const source = walletSnapshot;
    csvTarget.current = { ...inventoryContext(source), revision: profileOf(source).revision };
    const reader = new FileReader();
    const context = inventoryContext(source);
    reader.onload = async () => {
      if (!await responseIsCurrent(context)) return;
      setRawDataText(String(reader.result ?? ""));
      setIsRawDataLocked(true);
      setValidationSummary("CSV imported into raw editor. Press Done to validate and save.");
      setValidationWarnings([]);
      setIsRawDataModalOpen(true);
    };
    reader.onerror = async () => {
      if (!await responseIsCurrent(context)) return;
      setValidationSummary("CSV import failed.");
      setValidationWarnings(["Unable to read the selected CSV file."]);
    };
    reader.readAsText(file);
    // Reset file input value to allow importing the same file again
    e.target.value = "";
  };

  // Raw editor actions
  const handleRefreshRawEditor = () => {
    const source = walletSnapshot;
    csvTarget.current = { ...inventoryContext(source), revision: profileOf(source).revision };
    setRawDataText(cardsToCsv(cards));
    setIsRawDataLocked(true);
    setValidationSummary(`Refreshed ${cards.length} card(s) into the editor.`);
    setValidationWarnings([]);
  };

  const handleOpenRawEditor = () => {
    handleRefreshRawEditor();
    setIsRawDataModalOpen(true);
  };

  const handleUpdateRawEditor = async () => {
    const { parsedCards, warnings } = parseRawCardData(rawDataText);

    if (warnings.length > 0) {
      setValidationSummary(`Validation failed: ${warnings.length} warning(s) found.`);
      setValidationWarnings(warnings);
      return false;
    }

    if (wouldDiscardCardMetadata(cards, parsedCards)) {
      const confirmed = window.confirm(
        "This CSV will replace or remove saved balance-check metadata. Export a backup CSV of the current session before continuing. Apply the CSV anyway?",
      );
      if (!confirmed) return false;
    }
    try {
      await commitWallet({ kind: "csv-recovery", ...csvTarget.current, cards: parsedCards });
      const state = walletRef.current;
      csvTarget.current = { ...inventoryContext(state), revision: profileOf(state).revision };
    } catch (error) {
      setValidationSummary("CSV recovery was not saved.");
      setValidationWarnings([error.message]);
      return false;
    }

    // Auto-select first visible card if possible
    const visible = calculateVisibleCards(profileOf(walletRef.current).cards, settings, settings.sortMode);
    if (visible.length > 0) {
      setSelectedCardIndex(visible[0]);
    } else {
      setSelectedCardIndex(-1);
    }

    setValidationSummary(`Recovered ${parsedCards.length} card(s). Existing cards missing from the CSV were retained.`);
    setValidationWarnings([]);
    return true;
  };

  const handleDoneRawEditor = async () => {
    const success = await handleUpdateRawEditor();
    if (success) {
      setIsRawDataModalOpen(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!navigator.onLine) {
      setOauthState(prev => ({
        ...prev,
        status: googleOAuthStatuses.error,
        message: "Connection unavailable. Local data remains available.",
        lastErrorMessage: "Browser is offline.",
      }));
      return;
    }

    try {
      let state = await commitWallet({ kind: "begin-context", ...inventoryContext(walletSnapshot) });
      if (state.active !== 'unbound') state = await commitWallet({ kind: "use-unbound", ...inventoryContext(state) });
      if (!await responseIsCurrent(inventoryContext(state))) return;
    } catch { return; }
    setOauthState(prev => ({
      ...prev,
      status: googleOAuthStatuses.connecting,
      message: "Redirecting to Google sign-in...",
      lastErrorMessage: "",
    }));
    window.location.href = "/auth/init";
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Google Account? Saved inventory compartments remain available offline. Pending work is preserved.")) {
      return;
    }

    const source = await beginSheetMutation();
    if (!source) return;

    let context;
    try {
      context = inventoryContext(await commitWallet({ kind: "use-unbound", ...inventoryContext(source) }));
      setOauthState(prev => ({
        ...prev,
        status: googleOAuthStatuses.connecting,
        message: "Disconnecting Google...",
        lastErrorMessage: "",
      }));
      await fetchWorkerJson("/api/logout", { method: "POST" });
      if (!await responseIsCurrent(context)) return;
      const nextOauth = {
        status: googleOAuthStatuses.disconnected,
        connectedEmail: "",
        connectedName: "",
        message: "Google account disconnected. Local cards and saved Sheet settings were not changed.",
        lastErrorMessage: "",
        workerVersion: oauthState.workerVersion,
        schemaMode: oauthState.schemaMode,
      };
      setOauthState(nextOauth);
    } catch (error) {
      if (!await responseIsCurrent(context)) return;
      setOauthState(prev => ({
        ...prev,
        status: googleOAuthStatuses.error,
        message: "Connection unavailable. Local data remains available.",
        lastErrorMessage: error instanceof Error ? error.message : "Worker logout failed",
      }));
    } finally {
      sheetMutation.current = false;
    }
  };

  const downloadSessionCsvBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (!await handleExportCsv(`walmart-gift-cards-session-backup-${timestamp}.csv`)) return;
    setValidationWarnings([]);
    setValidationSummary("CSV backup download requested for the selected saved inventory.");
  };

  const syncNow = async (bind=false) => syncEngine.current?.manual({bind});
  const handleEnsureSheet = async (exactSheetId = "") => {
    try { await syncEngine.current?.control('ensure',{sheetId:exactSheetId.trim()}); }
    catch(error){setTransferMutationError(error.message);}
  };
  const handleLoadCardsFromSheet = async () => syncNow(true);
  const handleSaveCardsToSheet = async () => syncNow();
  const maintenance = async (action, deletedIds = "") => {
    if(!window.confirm(action==='pause'?'Pause shared Sheet writes before directly editing Cards or _META? Keep a private backup.':'Accept direct Sheet edits and resume synchronization? Confirm only the explicitly listed deleted identities.'))return;
    try { await syncEngine.current?.control(action,{deletedIds:action==='resume'?deletedIds.split(/[\s,]+/).filter(Boolean):[]}); }
    catch(error){setTransferMutationError(error.message);}
  };
  const recoverUnbound = async () => {
    const source=walletSnapshot?.profiles.unbound.cards??[],target=walletSnapshot?profileOf(walletSnapshot).cards:[];
    const additions=source.filter(c=>!target.some(t=>t.cardNumber===c.cardNumber)).length;
    const conflicts=source.filter(c=>target.some(t=>t.cardNumber===c.cardNumber&&t.pin!==c.pin)).length;
    if(!window.confirm(`Recover ${source.length} unbound cards: ${additions} additions, ${source.length-additions} matching identities, ${conflicts} credential conflicts for review? Compatible records will continue; disputed balances need verification. The original inventory remains preserved.`))return;
    try { await syncEngine.current?.recoverUnbound(); }
    catch(error) { setTransferMutationError(error.message); }
  };
  const resolveConflict = async (cardNumber,conflict,choice) => {
    if(!window.confirm('Resolve this recovery item using '+choice+' values? Export a private recovery backup before changing credentials.'))return;
    try { await commitWallet({kind:'resolve-conflict',...inventoryContext(walletSnapshot),cardNumber,version:profileOf(walletSnapshot).versions[cardNumber],conflictId:conflict.id,choice}); }
    catch { /* durable save error is displayed */ }
  };

  if (localCardsError) {
    return <p role="alert" className="p-4 text-m3-error">{localCardsError}</p>;
  }

  if (!walletSnapshot) {
    return <p role="status" className="p-4 text-m3-on-surface">Opening saved cards…</p>;
  }

  return (
    <>
      <input
        id="csv-file-input"
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportCsvFile}
        className="hidden"
      />
      {/* Header Region */}
      <header className="bg-m3-primary-container text-m3-on-primary-container border-b border-m3-outline-variant/60 py-3 md:py-4 px-4 sm:px-8">
        <div className="max-w-[60rem] mx-auto flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Gift Card Manager
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <IconButton
              id="open-settings"
              onClick={openSettings}
              disabled={verificationSession.busy||Boolean(verificationSession.contextual)}
              variant={activePanel === 'settings' ? 'tonal' : 'standard'}
              size="standard"
              className="text-m3-on-primary-container"
              title={activePanel === 'settings' ? "Close settings and return" : "Open settings"}
              aria-label="Open settings"
              aria-expanded={activePanel === 'settings'}
            >
              <Settings2 className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Persistent Merchant Balance Strip */}
      {(() => {
        const summary = getAppSyncSummaryState();
        const syncLabel = summary.label;

        const isInteractive = ['local-only', 'conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key);

        return (
          <div
            className="w-full bg-m3-surface-container border-b border-m3-outline-variant/30 select-none"
            role="status"
            aria-live="polite"
            aria-label={`Available Walmart balance: $${activeBalance.toFixed(2)}. Sync status: ${syncLabel}.`}
          >
            <div className="max-w-[60rem] mx-auto h-12 grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-4 sm:px-8">
            <span className="text-[15px] font-semibold text-m3-on-surface text-left">Walmart</span>

            <div className="flex justify-center min-w-0">
              {isInteractive ? (
                <StatusChip
                  id="checkout-feedback-btn"
                  onClick={openSettings}
                  disabled={verificationSession.busy||Boolean(verificationSession.contextual)}
                  size="compact"
                  status={getSyncChipStatus(summary.key)}
                  indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                  className="max-w-full min-w-0 cursor-pointer"
                  data-sync-summary={summary.key}
                  title="Review synchronization in Settings"
                >
                  {syncLabel}
                </StatusChip>
              ) : (
                <StatusChip
                  id="checkout-feedback"
                  size="compact"
                  status={getSyncChipStatus(summary.key)}
                  indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                  className="max-w-full min-w-0"
                  data-sync-summary={summary.key}
                >
                  {syncLabel}
                </StatusChip>
              )}
            </div>

            <span className="text-[15px] font-semibold tabular-nums text-m3-on-surface text-right">${activeBalance.toFixed(2)}</span>
            </div>
          </div>
        );
      })()}

      {/* Navigation bar: mobile bottom fixed, desktop below header (static flow) */}
      <NavigationBar aria-label="App sections">
        <div className="max-w-[60rem] mx-auto w-full flex h-full">
          <NavigationBarItem
            id="nav-list"
            onClick={() => navigate('list')}
            disabled={verificationSession.busy||Boolean(verificationSession.contextual)}
            selected={activePanel === 'list'}
            label="Cards"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            }
          >
          </NavigationBarItem>
          <NavigationBarItem
            id="nav-detail"
            onClick={openCheckout}
            disabled={verificationSession.busy || Boolean(verificationSession.contextual) || visibleIndexes.length === 0}
            selected={activePanel === 'detail'}
            label="Checkout"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14M9 5v14M13 5v14M17 5v14M20 5v14" />
              </svg>
            }
          >
          </NavigationBarItem>
          <NavigationBarItem id="nav-review" onClick={() => openBalanceReview()}
            disabled={verificationSession.busy||Boolean(verificationSession.contextual)} selected={activePanel === 'review'}
            label="Balance Check" icon={<ClipboardCheck className="size-6" aria-hidden="true" />} />
        </div>
      </NavigationBar>

      <div 
        className="bg-m3-surface flex flex-col items-center px-0 sm:px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12 antialiased font-sans relative"
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        <div className="w-full bg-m3-surface overflow-hidden transition-all duration-300 max-w-[60rem]">
          <h2 id="wallet-section-heading" tabIndex={-1}
            className="px-4 sm:px-6 md:px-8 pt-4 text-lg font-semibold focus:outline-none">
            {{ list: 'Cards', detail: 'Checkout', review: 'Balance Check', settings: 'Settings' }[activePanel]}
          </h2>
          {((activePanel !== 'review' && transferMutationError) || inventoryNotice) && <p role="alert" className="px-4 pt-4 text-sm text-m3-error">{(activePanel !== 'review' && transferMutationError) || inventoryNotice}</p>}
          {activePanel === 'list' ? (
            <CardsPanel
              cards={cards}
              visibleIndexes={visibleIndexes}
              selectedCardIndex={selectedCardIndex}
              loaded={cardsLoaded.current}
              googleConnected={oauthState.status === googleOAuthStatuses.connected}
              maskCardNumber={maskCardNumber}
              commands={{ reviewBalances: () => openBalanceReview(), connectGoogle: handleConnectGoogle,
                importCsv: () => document.getElementById('csv-file-input').click(),
                resetFilters: settingsController.resetFilters, openSettings,
                selectCard: index => { setSelectedCardIndex(index); navigate('detail'); } }}
            />
           ) : activePanel === 'settings' ? (
              <SettingsPanel
                preferences={settingsController.panel}
                connection={oauthState}
                synchronization={{ summary: getAppSyncSummaryState(), chipStatus: getSyncChipStatus(getAppSyncSummaryState().key),
                  message: syncUi.message, diagnostics: syncUi.diagnostics, diagnosticSheetId: syncUi.sheetId, sheetMessage: directSheetsState.message,
                  diagnosticMessage: syncState.message || directSheetsState.message,
                  hasPendingChanges: Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced) }}
                inventory={{ activeKey: walletSnapshot.active, compartments: savedCompartments(walletSnapshot),
                  label: savedCompartments(walletSnapshot).find(item => item.key === walletSnapshot.active)?.label,
                  context: profileOf(walletSnapshot).context, pendingCount: profileOf(walletSnapshot).pending.length,
                  confirming: Boolean(profileOf(walletSnapshot).inFlight), lastConfirmedAt: profileOf(walletSnapshot).sync?.lastConfirmedAt,
                  syncBlocked: profileOf(walletSnapshot).syncBlocked, recoveryCards: profileOf(walletSnapshot).recoveryEvidence?.cards,
                  recoverySummary: recoverySummary(profileOf(walletSnapshot)),
                  controlFlight: walletSnapshot.controlFlights?.[oauthState.principal]?.request, zeroBalanceCount }}
                commands={{ markZeroBalanceUsed: handleMarkZeroBalanceUsed, connectGoogle: handleConnectGoogle,
                  disconnectGoogle: handleDisconnectGoogle, syncNow, ensureSheet: handleEnsureSheet,
                  importSheet: handleLoadCardsFromSheet, saveSheet: handleSaveCardsToSheet, maintenance,
                  recoverExpired: async () => {
                    try { await syncEngine.current?.recoverExpired(); }
                    catch (error) { setTransferMutationError(error.message); }
                  }, recoverUnbound, resolveConflict, reviewFlagged:()=>openBalanceReview(true), selectCompartment: handleSelectCompartment,
                  exportCsv: handleExportCsv, exportRecovery: handleExportRecovery,
                  openRawEditor: handleOpenRawEditor }}
                showRawCsvEditor={SHOW_RAW_CSV_EDITOR}
                onBack={() => navigate(previousPrimaryPanel, 'open-settings')}
              />
          ) : activePanel === 'review' ? (
            <BalanceReview session={verificationSession} walletSnapshot={walletSnapshot}
              onExit={exitBalanceReview}
              maskCardNumber={maskCardNumber} />
          ) : (
            <CheckoutPanel selectedCard={selectedCard} visiblePosition={visiblePosition}
              credentialBlocked={credentialBlocked} onReviewCredentials={openSettings} onVerifyBalance={verifyCheckoutCard}
              visibleCount={visibleIndexes.length} workflow={checkout}
              onPrevious={handlePrevCard} onNext={handleNextCard}
              onToggleUsed={() => handleToggleUsed(selectedCardIndex)}
              onBack={() => navigate('list')} />
          )}
        </div>
      </div>



      {activePanel === 'detail'&&!credentialBlocked&&<CheckoutOverlays selectedCard={selectedCard} workflow={checkout} />}

      {/* Raw CSV Editor Modal */}
      {isRawDataModalOpen && (
        <Dialog
          id="raw-data-modal"
          className="max-w-lg w-full p-6 rounded-3xl"
          titleId="raw-data-modal-title"
        >
            <h2 id="raw-data-modal-title" className="text-lg font-bold text-m3-on-surface border-b border-m3-outline-variant/20 pb-2">
              Raw CSV editor
            </h2>

            <div className="flex flex-col gap-2">
              <label htmlFor="raw-data-input" className="text-xs font-bold text-m3-outline uppercase">
                Raw CSV card data
              </label>
              <TextArea
                id="raw-data-input"
                className="w-full text-xs border border-m3-outline-variant hover:border-m3-outline focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3.5 focus:outline-none bg-m3-surface-container disabled:bg-m3-surface-container-low text-m3-on-surface disabled:text-m3-on-surface-variant/75 leading-relaxed transition-all duration-200"
                spellCheck="false"
                rows="8"
                placeholder="Paste or import card data here..."
                value={rawDataText}
                onChange={e => setRawDataText(e.target.value)}
                disabled={isRawDataLocked}
              />
            </div>

            {/* Validation warnings card details */}
            <Card className="p-4 flex flex-col gap-2 max-h-36 overflow-y-auto">
              <h4 className="text-xs font-bold text-m3-on-surface uppercase">Validation details</h4>
              <div id="data-validation-warnings" className="text-xs font-semibold text-m3-on-surface-variant leading-relaxed" role="status">
                <p>{validationSummary}</p>
                {validationWarnings.length > 0 && (
                  <ul className="list-disc pl-4 mt-1 flex flex-col gap-1 text-m3-error">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            {/* Actions panel */}
            <div className="flex flex-col gap-3 border-t border-m3-outline-variant/20 pt-4 mt-2">
              <div className="flex gap-2">
                <Button
                  id="toggle-data-lock" 
                  onClick={() => setIsRawDataLocked(!isRawDataLocked)}
                  variant="elevated"
                  density="compact"
                  title={isRawDataLocked ? "Raw CSV editor locked" : "Raw CSV editor unlocked"}
                >
                  {isRawDataLocked ? "Unlock 🔓" : "Lock 🔒"}
                </Button>
                
                <Button
                  id="refresh-card-data" 
                  onClick={handleRefreshRawEditor}
                  variant="outlined"
                  density="compact"
                >
                  Refresh
                </Button>
                <Button
                  id="update-card-data" 
                  onClick={handleUpdateRawEditor}
                  variant="outlined"
                  density="compact"
                >
                  Update
                </Button>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  id="cancel-raw-data-update" 
                  onClick={() => setIsRawDataModalOpen(false)}
                  variant="elevated"
                  density="standard"
                >
                  Cancel
                </Button>
                <Button
                  id="done-raw-data-update" 
                  onClick={handleDoneRawEditor}
                  variant="filled"
                  density="standard"
                >
                  Done
                </Button>
              </div>
            </div>
        </Dialog>
      )}

    </>
  );
}

export default App;
