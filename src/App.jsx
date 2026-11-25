import { createSyncEngine } from './lib/syncEngine';
import React, { useState, useEffect, useRef } from 'react';
import { calculateVisibleCards, calculateCardSummary, getBarcodePayload, getBarcodeFallbackMessage } from './lib/cards';
import { loadSettings, saveSettings } from './lib/settings';
import { getCode128BarcodeBars } from './lib/barcode';
import { cardsToCsv, parseRawCardData, wouldDiscardCardMetadata } from './lib/csv';
import { fetchWorkerJson, googleOAuthStatuses, directSheetsStatuses, syncStatuses } from './lib/api';
import { Button } from './components/primitives/Button';
import { IconButton } from './components/primitives/IconButton';
import { Card } from './components/primitives/Card';
import { Dialog } from './components/primitives/Dialog';
import { ListItem } from './components/primitives/ListItem';
import { NavigationBar, NavigationBarItem } from './components/primitives/NavigationBar';
import { Switch } from './components/primitives/Switch';
import { Surface } from './components/primitives/Surface';
import { TextArea } from './components/primitives/TextArea';
import { TextField } from './components/primitives/TextField';
import { SelectField } from './components/primitives/SelectField';
import { BalanceReview } from './components/BalanceReview';
import { openInventory, operationId, profileOf, inventoryContext, assertInventoryContext, savedCompartments, compartmentCards, recoveryExport, recoveryWarning, validateInventory } from './lib/inventory';
import { ClipboardCheck, Settings2, X } from 'lucide-react';
import { Chip, StatusChip } from './components/primitives/Chip';

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

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length >= 5) {
    return `${local.slice(0, 2)}…${local.slice(-2)}@${domain}`;
  }
  if (local.length === 4) {
    return `${local.slice(0, 1)}…${local.slice(-1)}@${domain}`;
  }
  return `${local}@${domain}`;
}

function getCardCode(card) {
  return String(card?.cardNumber ?? "").replace(/\D/g, "");
}

function formatCodePin(card) {
  const code = getCardCode(card);
  const pin = String(card?.pin ?? "").trim();
  return `${code}/${pin}`;
}

function isDesktopCopyTarget() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
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

async function writeClipboardText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea copy path for browsers that block Clipboard API writes.
    }
  }

  if (typeof document === "undefined" || !document.body) {
    return false;
  }

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
  }
}

function ActionIcon({ name }) {
  if (name === 'wrench') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (name === 'external') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    );
  }
  if (name === 'download') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    );
  }
  if (name === 'upload') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    );
  }
  return null;
}

function ActionButton({ id, onClick, icon, label, className = "", href, target, rel, disabled, variant = "tonal", compact }) {
  const content = (
    <>
      {icon && <ActionIcon name={icon} />}
      <span>{label}</span>
    </>
  );
  const mappedVariant = variant === "primary" ? "filled" : variant === "outlined" ? "outlined" : "tonal";
  const density = compact ? "compact" : "standard";

  return (
    <Button
      id={id}
      onClick={onClick}
      disabled={disabled}
      href={href}
      target={target}
      rel={rel}
      variant={mappedVariant}
      density={density}
      className={`w-full justify-center ${className}`}
      type="button"
    >
      {content}
    </Button>
  );
}

function App() {
  const cardsLoaded = useRef(false);
  const inventoryStore = useRef(null);
  const walletRef = useRef(null);
  const selectionIdentity = useRef(null);
  const [walletSnapshot, setWalletSnapshot] = useState(null);
  const syncEngine = useRef(null);
  const [syncUi,setSyncUi] = useState({phase:'local',message:'Saved on this device.'});
  const [exactSheetId,setExactSheetId] = useState('');
  const [deletedIds,setDeletedIds] = useState('');
  const balanceTarget = useRef(null);
  const notesTarget = useRef(null);
  const csvTarget = useRef(null);
  const recoveryReloadRequired = useRef(false);
  const restoreReviewFocus = useRef(false);
  const [balanceReviewOpen, setBalanceReviewOpen] = useState(false);
  const mainTouchStart = useRef(null);
  const copyFeedbackTimer = useRef(null);
  const [cards, setCards] = useState([]);
  const [localCardsError, setLocalCardsError] = useState("");
  const [inventoryNotice, setInventoryNotice] = useState("");
  const [transferMutationError, setTransferMutationError] = useState("");
  const sheetMutation = useRef(false);
  const transferWallet = useRef(null);
  const [settings, setSettings] = useState({
    advanceOnMarkUsed: true,
    hideUsedCards: true,
    hideZeroBalanceCards: false,
    sortMode: "balance-asc",
    themeMode: "system",
    checkoutDark: true,
  });
  const preferences = useRef(settings);
  preferences.current = settings;
  const [activePanel, setActivePanel] = useState('list'); // 'list', 'detail', or 'settings'
  const [previousPrimaryPanel, setPreviousPrimaryPanel] = useState('list');
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  const [revealNumber, setRevealNumber] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  
  // Balance Editor Form State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalanceValue, setNewBalanceValue] = useState("");
  const [amountUsedValue, setAmountUsedValue] = useState("");
  const [balanceError, setBalanceError] = useState("");

  const handleCancelBalanceEdit = () => {
    setIsEditingBalance(false);
  };

  // Notes Editor Form State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newNotesValue, setNewNotesValue] = useState("");

  const [wakeLock, setWakeLock] = useState(null);

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

  async function commitWallet(command) {
    if (!inventoryStore.current) throw new Error("Local inventory is still opening.");
    if (command.kind === "discard-batch" && recoveryReloadRequired.current) throw new Error("Reload the wallet before discarding the preserved Batch.");
    try {
      const state = await inventoryStore.current.commit({ id: operationId(), ...command });
      adoptWallet(state);
      setTransferMutationError("");
      if (['patch','manual-verification','mark-zero-used','csv-recovery','apply-batch','resolve-conflict','select-compartment'].includes(command.kind)) {
        setSyncUi({phase:'local',message:'Changes saved on this device.'});
        syncEngine.current?.schedule();
      }
      return state;
    } catch (error) {
      if (command.kind === "discard-batch") recoveryReloadRequired.current = true;
      setTransferMutationError(error.message);
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
      const state = await commitWallet({ kind: "begin-context", ...inventoryContext(walletSnapshot) });
      return await commitWallet({ kind: "invalidate-batch", ...inventoryContext(state) });
    } catch { sheetMutation.current = false; return null; }
  }

  function getTransferWallet() {
    if (sheetMutation.current) throw new Error("Wait for the current Sheet operation to finish.");
    return transferWallet.current;
  }

  const getAppSyncSummaryState = () => {
    const pending = walletRef.current && profileOf(walletRef.current).pending.length;
    if(syncUi.phase==='checking')return {key:'checking',label:'Checking sync…',help:'Local cards stay available'};
    if(['error','review'].includes(syncUi.phase))return {key:'error',label:'Review sync',help:syncUi.message};
    if(syncUi.phase==='saved'&&!pending)return {key:'connected',label:'Synced',help:syncUi.message};
    return {key:'local-only',label:pending?'Saved locally':'Local inventory',help:syncUi.message};
  };

  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);
  const [hasInitializedSettingsSyncOpen, setHasInitializedSettingsSyncOpen] = useState(false);
  const prevOauthStatus = useRef(oauthState.status);
  const prevSyncError = useRef(false);

  // Reset the settings initialization flag when leaving the Settings panel
  useEffect(() => {
    if (activePanel !== 'settings') {
      setHasInitializedSettingsSyncOpen(false);
    }
  }, [activePanel]);

  // Set the default expanded state on entering Settings, when connection status transitions to connected, or when a new error occurs
  useEffect(() => {
    if (activePanel === 'settings') {
      const summary = getAppSyncSummaryState();
      const hasSyncError = ['conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key);
      const isSyncing = summary.key === 'checking';
      const isConnected = oauthState.status === googleOAuthStatuses.connected;
      const justConnected = prevOauthStatus.current !== googleOAuthStatuses.connected && isConnected;
      const errorJustOccurred = !prevSyncError.current && hasSyncError;

      if (!hasInitializedSettingsSyncOpen || justConnected || errorJustOccurred) {
        if (isConnected && !hasSyncError && !isSyncing) {
          setIsGoogleSyncOpen(false);
        } else {
          setIsGoogleSyncOpen(true);
        }
        setHasInitializedSettingsSyncOpen(true);
      }
      prevSyncError.current = hasSyncError;
    }
    prevOauthStatus.current = oauthState.status;
  }, [activePanel, oauthState.status, hasInitializedSettingsSyncOpen, syncState.status, directSheetsState.status]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
      }
    };
  }, []);

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

  // Handle escape key listener for balance modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleCancelBalanceEdit();
      }
    };

    if (isEditingBalance) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditingBalance]);

  // Handle screen wake lock passively for Checkout scanning
  useEffect(() => {
    let activeLock = null;
    async function requestLock() {
      if ("wakeLock" in navigator && activePanel === 'detail') {
        try {
          activeLock = await navigator.wakeLock.request("screen");
          setWakeLock(activeLock);
        } catch {
          // ignore
        }
      }
    }
    
    if (activePanel === 'detail') {
      requestLock();
    } else {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        setWakeLock(null);
      }
    }

    return () => {
      if (activeLock) {
        activeLock.release().catch(() => {});
      }
    };
  }, [activePanel]);

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
        preferences.current = loadSettings();
        setSettings(preferences.current);
        adoptWallet(state);
        const url = new URL(window.location.href);
        const authReturn = url.searchParams.get("auth") === "connected";
        if (authReturn) {
          url.searchParams.delete("auth");
          window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
        }
        const engine=createSyncEngine({store,request:fetchWorkerJson,
          onState:state=>{if(!cancelled)adoptWallet(state);},
          onStatus:value=>{if(!cancelled)setSyncUi(value);},
          onAuth:status=>{if(!cancelled)setOauthState({status:status.authenticated?'connected':'disconnected',connectedEmail:status.email||'',connectedName:status.name||'',principal:status.principal||'',message:status.authenticated?'Google account connected.':'Connect Google for automatic synchronization.',lastErrorMessage:'',workerVersion:status.workerVersion||'',schemaMode:status.schemaMode||''});}});
        syncEngine.current=engine;engine.start();
      } catch (error) { if (!cancelled) setLocalCardsError(error.message); }
    })();
    const foreground=()=>{if(document.visibilityState==='visible')syncEngine.current?.sync();};
    const reconnect=()=>syncEngine.current?.sync();
    window.addEventListener("online",reconnect);document.addEventListener("visibilitychange",foreground);window.addEventListener("focus",reconnect);
    return () => { cancelled = true; syncEngine.current?.stop();window.removeEventListener("online",reconnect);document.removeEventListener("visibilitychange",foreground);window.removeEventListener("focus",reconnect); window.removeEventListener("focus", reload); window.removeEventListener("storage", legacyChanged); channel?.close(); store.close().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (!balanceReviewOpen && restoreReviewFocus.current) {
      restoreReviewFocus.current = false;
      document.getElementById('review-balances')?.focus();
    }
  }, [balanceReviewOpen]);


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

  // Handle setting toggles
  const handleToggleSetting = (key) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleResetFilters = () => {
    const nextSettings = {
      ...settings,
      hideUsedCards: false,
      hideZeroBalanceCards: false,
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  // Handle sort mode changes
  const handleSortChange = (e) => {
    const nextSettings = {
      ...settings,
      sortMode: e.target.value,
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleThemeModeChange = (e) => {
    const nextSettings = {
      ...settings,
      themeMode: e.target.value,
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
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

  // Checkout Navigation Controls
  const handlePrevCard = () => {
    if (visibleIndexes.length === 0) return;
    const currentPosition = visibleIndexes.indexOf(selectedCardIndex);
    const nextPosition = (currentPosition - 1 + visibleIndexes.length) % visibleIndexes.length;
    setSelectedCardIndex(visibleIndexes[nextPosition]);
    setRevealNumber(false);
    setIsEditingBalance(false);
    setIsEditingNotes(false);
  };

  const handleNextCard = () => {
    if (visibleIndexes.length === 0) return;
    const currentPosition = visibleIndexes.indexOf(selectedCardIndex);
    const nextPosition = (currentPosition + 1) % visibleIndexes.length;
    setSelectedCardIndex(visibleIndexes[nextPosition]);
    setRevealNumber(false);
    setIsEditingBalance(false);
    setIsEditingNotes(false);
  };

  // Touch Swiping for Page Navigation (Cards <-> Checkout)
  const handleMainTouchStart = (event) => {
    if (isRawDataModalOpen || isEditingBalance || isEditingNotes) {
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
        setActivePanel('detail');
      }
    } else if (deltaX > 0) {
      // Swipe right: Checkout (detail) -> Cards (list)
      if (activePanel === 'detail') {
        setActivePanel('list');
      }
    }
  };



  const handleCopyCodePin = async (event, card) => {
    event?.stopPropagation();
    if (!isDesktopCopyTarget()) {
      return false;
    }

    const copied = await writeClipboardText(formatCodePin(card));
    if (copyFeedbackTimer.current) {
      clearTimeout(copyFeedbackTimer.current);
    }
    setCopyFeedback(copied ? "Code/PIN copied" : "Copy unavailable");
    copyFeedbackTimer.current = setTimeout(() => {
      setCopyFeedback("");
      copyFeedbackTimer.current = null;
    }, 2500);
    return copied;
  };

  // Balance Update Action
  const handleAmountUsedChange = (e) => {
    const val = e.target.value;
    setAmountUsedValue(val);
    const parsedUsed = parseFloat(val);
    if (!isNaN(parsedUsed) && selectedCard) {
      setNewBalanceValue((selectedCard.currentBalance - parsedUsed).toFixed(2));
    } else if (selectedCard) {
      setNewBalanceValue(selectedCard.currentBalance.toString());
    }
  };

  const handleRemainingBalanceChange = (e) => {
    const val = e.target.value;
    setNewBalanceValue(val);
    const parsedRemaining = parseFloat(val);
    if (!isNaN(parsedRemaining) && selectedCard) {
      setAmountUsedValue((selectedCard.currentBalance - parsedRemaining).toFixed(2));
    } else {
      setAmountUsedValue("");
    }
  };

  const handleOpenBalanceEdit = (currentVal) => {
    balanceTarget.current = cardTarget(cards[selectedCardIndex]);
    setNewBalanceValue(currentVal.toString());
    setAmountUsedValue("");
    setBalanceError("");
    setIsEditingBalance(true);
  };

  const handleSaveBalance = async () => {
    const value = Number(newBalanceValue);
    if (!newBalanceValue.trim() || !Number.isFinite(value) || value < 0) {
      setBalanceError("Enter a valid non-negative balance value");
      return;
    }
    try {
      await commitWallet({ kind: "patch", action: "set-balance", ...balanceTarget.current, patch: {
        currentBalance: Math.round(value * 100) / 100, dateUpdated: new Date().toISOString().slice(0, 10) } });
      setIsEditingBalance(false);
    } catch (error) { setBalanceError(error.message); }
  };

  const selectedCard = cards[selectedCardIndex];
  const visiblePosition = visibleIndexes.indexOf(selectedCardIndex);

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
      state = await commitWallet({ kind: "invalidate-batch", ...inventoryContext(state) });
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

  const syncNow = async (bind=false) => syncEngine.current?.sync({bind});
  const handleEnsureSheet = async () => {
    try { await syncEngine.current?.control('ensure',{sheetId:exactSheetId.trim()}); }
    catch(error){setTransferMutationError(error.message);}
  };
  const handleLoadCardsFromSheet = async () => syncNow(true);
  const handleSaveCardsToSheet = async () => syncNow();
  const maintenance = async (action) => {
    if(!window.confirm(action==='pause'?'Pause shared Sheet writes before directly editing Cards or _META? Keep a private backup.':'Accept direct Sheet edits and resume synchronization? Confirm only the explicitly listed deleted identities.'))return;
    try { await syncEngine.current?.control(action,{deletedIds:action==='resume'?deletedIds.split(/[\s,]+/).filter(Boolean):[]}); }
    catch(error){setTransferMutationError(error.message);}
  };
  const recoverUnbound = async () => {
    if(!window.confirm('Copy unbound inventory into this verified account? Conflicting credentials are blocked; uncertain recovered balances require verification. The original inventory remains preserved.'))return;
    const state=walletSnapshot;
    if(profileOf(state).context.ownershipVerified!==true)return;
    try {
      const status=await fetchWorkerJson('/api/status',{cache:'no-store'});
      if(!await responseIsCurrent(inventoryContext(state)))throw new Error('Inventory context changed.');
      const owner=profileOf(state).context;
      if(!status.authenticated||!status.ownershipVerified||status.principal!==owner.principal||status.sheetId!==owner.sheetId){
        await commitWallet({kind:'begin-context',...inventoryContext(state)});
        setOauthState(prev=>({...prev,status:'disconnected',principal:'',connectedEmail:'',connectedName:''}));
        throw new Error('Reconnect the matching Google account and exact Sheet before copying unbound data.');
      }
      await commitWallet({kind:'csv-recovery',...inventoryContext(state),revision:profileOf(state).revision,cards:state.profiles.unbound.cards,recovery:true});
    }
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

  if (balanceReviewOpen) {
    return (
      <BalanceReview
        cards={cards}
        walletSnapshot={walletSnapshot}
        readWallet={readWallet}
        commitWallet={commitWallet}
        getTransferWallet={getTransferWallet}
        onExit={() => {
          restoreReviewFocus.current = true;
          setTransferMutationError("");
          setBalanceReviewOpen(false);
        }}
        copyText={writeClipboardText}
        maskCardNumber={maskCardNumber}
      />
    );
  }

  return (
    <>
      {/* Header Region */}
      <header className="bg-m3-primary text-m3-on-primary border-b border-m3-outline-variant/60 py-3 md:py-4 px-6 sm:px-8">
        <div className="max-w-[60rem] mx-auto flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-m3-on-primary">
              Gift Card Manager
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <IconButton
              id="open-settings"
              onClick={() => {
                if (activePanel === 'settings') {
                  setActivePanel(previousPrimaryPanel);
                } else {
                  setPreviousPrimaryPanel(activePanel);
                  setActivePanel('settings');
                }
              }}
              variant={activePanel === 'settings' ? 'tonal' : 'standard'}
              size="compact"
              className={`md:text-xl ${
                activePanel === 'settings'
                  ? 'bg-m3-on-primary text-m3-primary border-m3-on-primary'
                  : 'bg-m3-primary-container text-m3-on-primary-container border-m3-on-primary-container/20 opacity-50 hover:opacity-100'
              }`}
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
      {(activePanel === 'list' || activePanel === 'detail') && (() => {
        const summary = getAppSyncSummaryState();
        const syncLabel = summary.label;

        const isInteractive = ['local-only', 'conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key);

        return (
          <div
            className="w-full bg-m3-surface-container border-b border-m3-outline-variant/30 h-10 grid grid-cols-3 items-center px-6 select-none"
            role="status"
            aria-live="polite"
            aria-label={`Available Walmart balance: $${activeBalance.toFixed(2)}. Sync status: ${syncLabel}.`}
          >
            <span className="text-[15px] font-semibold text-m3-on-surface text-left">Walmart</span>

            <div className="flex justify-center min-w-0">
              {isInteractive ? (
                <StatusChip
                  id="checkout-feedback-btn"
                  onClick={handleConnectGoogle}
                  size="compact"
                  status={getSyncChipStatus(summary.key)}
                  indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                  className="max-w-full min-w-0 cursor-pointer"
                  data-sync-summary={summary.key}
                  title="Google connection and backup"
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

            <span className="text-[15px] font-semibold text-m3-on-surface text-right">${activeBalance.toFixed(2)}</span>
          </div>
        );
      })()}

      {/* Navigation bar: mobile bottom fixed, desktop below header (static flow) */}
      <NavigationBar aria-label="App sections">
        <div className="max-w-[60rem] mx-auto w-full flex h-full">
          <NavigationBarItem
            id="nav-list"
            onClick={() => {
              setActivePanel('list');
              setPreviousPrimaryPanel('list');
            }}
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
            onClick={() => {
              const nextIndex = ensureVisibleSelection();
              if (nextIndex !== -1) {
                setSelectedCardIndex(nextIndex);
                setActivePanel('detail');
                setPreviousPrimaryPanel('detail');
              }
            }}
            disabled={visibleIndexes.length === 0}
            selected={activePanel === 'detail'}
            label="Checkout"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14M9 5v14M13 5v14M17 5v14M20 5v14" />
              </svg>
            }
          >
          </NavigationBarItem>
        </div>
      </NavigationBar>

      <div 
        className="bg-m3-surface flex flex-col items-center px-0 sm:px-4 pb-24 md:pb-12 antialiased font-sans relative"
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        <div className="w-full bg-m3-surface overflow-hidden transition-all duration-300 max-w-[60rem]">
          {(transferMutationError || inventoryNotice) && <p role="alert" className="px-4 pt-4 text-sm text-m3-error">{transferMutationError || inventoryNotice}</p>}
          {activePanel === 'list' ? (
            <main className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-panel-enter">
              <Button id="review-balances" onClick={() => setBalanceReviewOpen(true)} disabled={!cardsLoaded.current} className="self-start">
                <ClipboardCheck size={20} aria-hidden="true" />
                Review balances
              </Button>

              {/* Cards Inventory Ledger */}
              <section className="flex flex-col gap-3">

                <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
                  {cards.length === 0 ? (
                    <Surface as="div" variant="dashed" className="md:col-span-2 text-center py-10 px-6 flex flex-col items-center gap-4">
                      <div className="flex flex-col gap-1.5 max-w-sm">
                        <h4 className="text-sm font-bold text-m3-on-surface">No gift cards yet</h4>
                        <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                          Add your Walmart gift cards to get started. Checkout and barcode scan views will become available once you have cards registered.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md justify-center mt-2">
                        {oauthState.status !== googleOAuthStatuses.connected && (
                          <button
                            id="empty-state-connect-google"
                            onClick={handleConnectGoogle}
                            className="flex-1 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-bold py-3 px-4 rounded-full transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2"
                            type="button"
                          >
                            Connect Google
                          </button>
                        )}
                        <button
                          id="empty-state-import-csv"
                          onClick={() => document.getElementById('csv-file-input').click()}
                          className="flex-1 bg-m3-surface hover:bg-m3-surface-container text-m3-on-surface text-xs font-bold py-3 px-4 rounded-full border border-m3-outline transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2"
                          type="button"
                        >
                          ↓ Import CSV
                        </button>
                      </div>
                    </Surface>
                  ) : visibleIndexes.length === 0 ? (
                    <Surface as="div" variant="dashed" className="md:col-span-2 text-center py-10 px-6 flex flex-col items-center gap-4">
                      <div className="flex flex-col gap-1.5 max-w-sm">
                        <span className="text-sm font-bold text-m3-on-surface">All registered cards are filtered out</span>
                        <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                          Your settings are currently hiding all {cards.length} card{cards.length === 1 ? "" : "s"}. Reset filters or adjust them in settings to show cards.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center mt-1">
                        <Button
                          onClick={handleResetFilters}
                          variant="filled"
                          density="standard"
                          className="flex-1"
                        >
                          Reset Filters
                        </Button>
                        <Button
                          onClick={() => setActivePanel('settings')}
                          variant="outlined"
                          density="standard"
                          className="flex-1"
                        >
                          Go to Settings
                        </Button>
                      </div>
                    </Surface>
                  ) : (
                    visibleIndexes.map((cardIndex) => {
                      const card = cards[cardIndex];
                      const isSelected = selectedCardIndex === cardIndex;
                      return (
                        <ListItem
                          key={card.cardNumber}
                          selected={isSelected}
                          used={card.used}
                          onClick={() => {
                            setSelectedCardIndex(cardIndex);
                            setActivePanel('detail');
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${card.used ? 'line-through decoration-m3-on-surface-variant/60' : ''}`}>
                              {maskCardNumber(card.cardNumber)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {card.used && (
                              <Chip
                                variant="outlined"
                                size="compact"
                                className="uppercase tracking-wider"
                              >
                                Used
                              </Chip>
                            )}
                            <span className="text-sm font-medium tabular-nums">
                              ${card.currentBalance.toFixed(2)}
                            </span>
                          </div>
                        </ListItem>
                      );
                    })
                  )}
                </div>
              </section>
            </main>
           ) : activePanel === 'settings' ? (
              <main className="p-3 pb-28 md:pb-16 flex flex-col gap-3 animate-panel-enter">

                {/* Local Settings / Filtering Controls */}
                <Card as="section" className="p-3 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider px-2 py-1">Preferences</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Sort Order</span>
                      <SelectField
                        value={settings.sortMode}
                        onChange={handleSortChange}
                        aria-label="Sort gift cards"
                        title="Sort gift cards"
                        className="text-sm font-medium border border-m3-outline-variant/60 rounded-lg py-1 px-2 bg-m3-surface text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary cursor-pointer text-center [text-align-last:center] max-w-[160px] sm:max-w-none"
                      >
                        <option value="balance-asc">Lowest balance first</option>
                        <option value="balance-desc">Highest balance first</option>
                        <option value="date-updated-desc">Recently updated first</option>
                        <option value="date-added-asc">Sheet order</option>
                        <option value="date-added-desc">Date added ↓</option>
                        <option value="date-updated-asc">Date updated ↑</option>
                        <option value="card-number">Card #</option>
                      </SelectField>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Appearance</span>
                      <SelectField
                        value={settings.themeMode || "system"}
                        onChange={handleThemeModeChange}
                        className="text-sm font-medium border border-m3-outline-variant/60 rounded-lg py-1 px-2 bg-m3-surface text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary cursor-pointer text-center [text-align-last:center]"
                      >
                        <option value="system">System (Auto)</option>
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                      </SelectField>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <div className="flex flex-col text-left">
                        <span>Checkout auto-dark</span>
                        <span className="text-[10px] text-m3-on-surface-variant font-normal">Overrides Appearance on Checkout</span>
                      </div>
                      <Switch checked={settings.checkoutDark} onChange={() => handleToggleSetting('checkoutDark')} />
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Hide Used Cards</span>
                      <Switch checked={settings.hideUsedCards} onChange={() => handleToggleSetting('hideUsedCards')} />
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Hide $0 Cards</span>
                      <Switch checked={settings.hideZeroBalanceCards} onChange={() => handleToggleSetting('hideZeroBalanceCards')} />
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Auto-Advance</span>
                      <Switch checked={settings.advanceOnMarkUsed} onChange={() => handleToggleSetting('advanceOnMarkUsed')} />
                    </label>

                    {zeroBalanceCount > 0 && (
                      <button
                        id="mark-zero-used"
                        onClick={handleMarkZeroBalanceUsed}
                        className="w-full sm:col-span-2 text-xs font-medium bg-m3-surface-container hover:bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant/30 rounded-lg py-2 px-3 flex justify-between items-center transition-all active:scale-95 shadow-sm font-sans cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px]"
                        type="button"
                      >
                        <span>Mark {zeroBalanceCount} zero-balance card(s) used</span>
                        <span className="bg-m3-surface-container-low text-m3-on-surface px-2 py-0.5 rounded text-[10px]" aria-hidden="true">Mark</span>
                      </button>
                    )}
                  </div>
                </Card>

                {/* Google connection Connection Panel */}
                <Card as="section" className="p-3 flex flex-col gap-2">
                  {oauthState.status === googleOAuthStatuses.connected ? (
                    <details
                      className="group"
                      open={isGoogleSyncOpen}
                      onToggle={(e) => setIsGoogleSyncOpen(e.target.open)}
                    >
                      <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
                        <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Google connection</h3>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const summary = getAppSyncSummaryState();
                            const syncLabel = summary.label;
                            return (
                              <StatusChip
                                size="compact"
                                status={getSyncChipStatus(summary.key)}
                                indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                                className="max-w-full min-w-0"
                              >
                                {syncLabel}
                              </StatusChip>
                            );
                          })()}
                          <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform ml-2 shrink-0">▼</span>
                        </div>
                      </summary>
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-m3-outline-variant/20 w-full">
                        {/* Connected email address */}
                        {oauthState.connectedEmail && (
                          <p className="text-xs text-m3-on-surface-variant font-medium leading-relaxed px-2">
                            Connected: {maskEmail(oauthState.connectedEmail)}
                          </p>
                        )}

                        {/* Disconnect Action */}
                        <div className="px-2">
                          <Button
                            id="disconnect-google"
                            onClick={handleDisconnectGoogle}
                            variant="elevated"
                            density="compact"
                            className="w-full sm:w-auto self-start text-xs"
                          >
                            Disconnect
                          </Button>
                        </div>

                        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-m3-outline-variant/20 w-full">
                          <p id="direct-sheet-status" className="text-xs font-medium text-m3-on-surface-variant px-2">
                            {directSheetsState.message}
                          </p>

                          <div className="grid grid-cols-2 gap-2 w-full px-2 pb-1">
                            <ActionButton
                              id="ensure-sheet"
                              onClick={handleEnsureSheet}
                              icon="wrench"
                              label="Set up Sheet"
                              compact
                            />
                            {directSheetsState.spreadsheetUrl && (
                              <ActionButton
                                id="open-direct-sheet"
                                href={directSheetsState.spreadsheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                icon="external"
                                label="Open Sheet"
                                compact
                              />
                            )}
                            <ActionButton
                              id="load-from-sheets"
                              onClick={handleLoadCardsFromSheet}
                              icon="download"
                              label="Import Sheet"
                              compact
                            />
                            <ActionButton
                              id="save-to-sheets"
                              onClick={handleSaveCardsToSheet}
                              icon="upload"
                              label="Save to Sheet"
                              className={!directSheetsState.spreadsheetUrl ? "col-span-2" : ""}
                              compact
                            />
                          </div>

                        </div>
                      </div>
                    </details>
                  ) : (
                    <div className="flex flex-col gap-2 w-full px-2 py-1">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Google connection</h3>
                          {(() => {
                            const summary = getAppSyncSummaryState();
                            const syncLabel = summary.label;
                            return (
                              <span className="text-xs font-medium text-m3-on-surface-variant">
                                {syncLabel}
                              </span>
                            );
                          })()}
                        </div>

                        <p className="text-xs text-m3-on-surface-variant font-medium leading-relaxed mt-0.5">
                          {oauthState.message}
                        </p>
                      </div>

                      <button
                        id="connect-google"
                        onClick={handleConnectGoogle}
                        className="w-full sm:w-auto self-start bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-medium py-2 px-3.5 rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px]"
                        type="button"
                      >
                        Connect Google account
                      </button>
                    </div>
                  )}

                  {oauthState.lastErrorMessage && (
                    <p id="google-oauth-status" className="text-xs font-medium text-m3-error border-t border-m3-outline-variant/20 pt-2 mt-1 px-2">
                      {oauthState.lastErrorMessage}
                    </p>
                  )}
                </Card>

                <Card as="section" className="p-3 flex flex-col gap-2" aria-label="Synchronization recovery">
                  <p role="status" className="text-sm">{syncUi.message}</p>
                  <Button variant="outlined" onClick={()=>syncNow()}>Sync now</Button>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">Connection and recovery</summary>
                    <div className="flex flex-col gap-2 pt-2">
                      <label htmlFor="exact-sheet-id">Exact Sheet ID (optional)</label>
                      <TextField id="exact-sheet-id" value={exactSheetId} onChange={e=>setExactSheetId(e.target.value)} />
                      <Button variant="outlined" onClick={handleEnsureSheet}>Create or initialize private Sheet</Button>
                      <p className="text-sm">Pause shared maintenance before direct card edits and export a private backup first. Keep managed _META recovery fields intact.</p>
                      <Button variant="outlined" onClick={()=>maintenance('pause')}>Pause shared maintenance</Button>
                      <label htmlFor="deleted-identities">Explicitly deleted card numbers (optional)</label>
                      <TextField id="deleted-identities" value={deletedIds} onChange={e=>setDeletedIds(e.target.value)} />
                      <Button variant="outlined" onClick={()=>maintenance('resume')}>Accept maintenance and resume</Button>
                      {profileOf(walletSnapshot).syncBlocked==='baseline_expired'&&<Button variant="outlined" onClick={async()=>{
                        if(!window.confirm('Preserve a private recovery backup first. Reconcile this expired commit against the current Sheet? Uncertain monetary actions will require verification.'))return;
                        try{await syncEngine.current?.recoverExpired();}catch(error){setTransferMutationError(error.message);}
                      }}>Recover expired synchronization safely</Button>}
                      <Button variant="outlined" disabled={profileOf(walletSnapshot).context.ownershipVerified!==true||oauthState.status!=='connected'||oauthState.principal!==profileOf(walletSnapshot).context.principal} onClick={recoverUnbound}>Recover unbound inventory into connected account</Button>
                      {Object.entries(profileOf(walletSnapshot).recoveryEvidence?.cards??{}).flatMap(([number,entry])=>(entry.conflicts??[]).filter(c=>!c.resolution).map(conflict=>(
                        <div key={conflict.id} className="border border-m3-outline-variant rounded-xl p-3 text-sm">
                          <p>Card ending {number.slice(-4)}: {conflict.kind==='balance'?'Balance needs fresh merchant verification':conflict.kind==='missing-remote'?'Recovered a missing Sheet card. Verify its balance.':conflict.kind}</p>
                          <details><summary className="cursor-pointer">Compare recovery values (may contain credentials)</summary><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify({recovered:conflict.local,sheet:conflict.remote},null,2)}</pre></details>
                          {conflict.kind!=='balance'&&<div className="flex flex-wrap gap-2">
                            <Button variant="outlined" onClick={()=>resolveConflict(number,conflict,conflict.kind==='deleted-identity'?'restore':'local')}>{conflict.kind==='missing-remote'?'Keep recovered card':'Use recovered values'}</Button>
                            {conflict.kind!=='missing-remote'&&<Button variant="outlined" onClick={()=>resolveConflict(number,conflict,'remote')}>Keep Sheet values</Button>}
                          </div>}
                        </div>
                      )))}
                    </div>
                  </details>
                </Card>

                <Card as="section" className="p-3 flex flex-col gap-2" aria-label="Saved inventories">
                  <label htmlFor="saved-inventory" className="text-sm font-medium">Saved inventory (available offline)</label>
                  <SelectField id="saved-inventory" value={walletSnapshot.active}
                    onChange={event => handleSelectCompartment(event.target.value)}>
                    {savedCompartments(walletSnapshot).map(item => <option key={item.key} value={item.key}>{item.label} · {item.count} cards</option>)}
                  </SelectField>
                  <p className="text-xs text-m3-on-surface-variant">Selection never claims ownership or merges inventories. Only the matching verified account can synchronize.</p>
                  <Button variant="outlined" onClick={() => handleExportCsv(undefined, walletSnapshot.active)}>Back up selected inventory CSV</Button>
                  <p className="text-xs text-m3-on-surface-variant">{recoveryWarning} CSV backups also contain card credentials.</p>
                  <Button variant="outlined" onClick={handleExportRecovery}>Export original and quarantined recovery data</Button>
                </Card>

                {/* Data Panel / Backup Controls */}
                <Card as="section" className="p-3 flex flex-col gap-2">
                  <details className="group">
                    <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
                      <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Backup & CSV Controls</span>
                      <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-m3-outline-variant/20 px-2 pb-1">
                      <div className="flex gap-2">
                        <input
                          id="csv-file-input"
                          type="file"
                          accept=".csv,text/csv"
                          onChange={handleImportCsvFile}
                          className="hidden"
                        />
                        <ActionButton
                          id="import-csv"
                          onClick={() => {
                            if (window.confirm("Import this CSV into the recovery editor? Saving applies explicit additions and updates; omitted cards are retained and conflicting credentials are rejected.")) {
                              document.getElementById('csv-file-input').click();
                            }
                          }}
                          icon="download"
                          label="Import CSV"
                          className="flex-1"
                          compact
                        />
                        <ActionButton
                          id="export-csv"
                          onClick={() => handleExportCsv()}
                          icon="upload"
                          label="Export CSV"
                          className="flex-1"
                          compact
                        />
                      </div>

                      {SHOW_RAW_CSV_EDITOR && (
                        <div className="border border-m3-outline-variant/20 bg-m3-surface-container rounded-xl p-2.5 flex justify-between items-center gap-2.5">
                          <div>
                            <h4 className="text-xs font-medium text-m3-on-surface uppercase">Raw CSV Editor</h4>
                            <p className="text-[10px] text-m3-on-surface-variant mt-0.5">Open a locked editor to view or paste diagnostic card data.</p>
                          </div>
                          <Button
                            id="open-raw-data-modal"
                            onClick={handleOpenRawEditor}
                            variant="elevated"
                            density="compact"
                            className="text-m3-primary shrink-0"
                          >
                            Open Editor
                          </Button>
                        </div>
                      )}
                    </div>
                  </details>
                </Card>

                {/* Troubleshooting (Unified Container) */}
                <Card as="section" className="p-3 flex flex-col gap-2">
                  <details className="group">
                    <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
                      <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Troubleshooting</span>
                      <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-m3-outline-variant/20 px-2 pb-1">
                      <Card variant="container" className="p-2.5 flex flex-col gap-2">
                        <h4 className="text-xs font-medium text-m3-on-surface uppercase mb-0.5">System Status</h4>
                        <ul className="text-xs text-m3-on-surface-variant font-medium list-none flex flex-col gap-1.5">
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Google Account</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {oauthState.status === googleOAuthStatuses.connected ? "Connected" : "Disconnected"}
                            </span>
                          </li>
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Sheet status</span>
                            {(() => {
                              const summary = getAppSyncSummaryState();
                              const syncStatusLabel = summary.label;
                              return (
                                <StatusChip
                                  size="compact"
                                  status={getSyncChipStatus(summary.key)}
                                  indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                                  className="max-w-full min-w-0"
                                >
                                  {syncStatusLabel}
                                </StatusChip>
                              );
                            })()}
                          </li>
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Pending Changes</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced) ? "Yes" : "No"}
                            </span>
                          </li>
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Last Sheet read</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {directSheetsState.lastSuccessfulSyncAt || "No Sheet read yet"}
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>Network State</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {navigator.onLine !== false ? "Online" : "Offline"}
                            </span>
                          </li>
                        </ul>
                        <div id="advanced-sync-diagnostics" className="text-[10px] text-m3-on-surface-variant leading-relaxed border-t border-m3-outline-variant/20 pt-2 mt-1">
                          {syncState.message || directSheetsState.message}
                        </div>
                      </Card>
                    </div>
                  </details>
                </Card>

                <ActionButton
                  id="settings-back"
                  onClick={() => setActivePanel(previousPrimaryPanel)}
                  label="Back"
                  variant="outlined"
                  compact
                />
              </main>
          ) : (
            /* Checkout Detail Panel Layout */
            <main className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-panel-enter">
              {selectedCard ? (
                <div id="card-detail" className="w-full flex flex-col gap-6">
                  
                  {/* Detail Card Navigation Header */}
                  <div className="flex justify-between items-center px-1">
                    <button
                      id="prev-card"
                      onClick={handlePrevCard}
                      disabled={visiblePosition <= 0}
                      className="text-xs font-bold text-m3-primary hover:text-m3-primary/80 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-md px-1 flex items-center gap-1"
                    >
                      ← Prev
                    </button>
                    <span id="card-position" className="text-xs font-bold text-m3-on-surface-variant">
                      Card {visiblePosition + 1} of {visibleIndexes.length}
                    </span>
                    <button
                      id="next-card"
                      onClick={handleNextCard}
                      disabled={visiblePosition === visibleIndexes.length - 1}
                      className="text-xs font-bold text-m3-primary hover:text-m3-primary/80 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-md px-1 flex items-center gap-1"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Large Barcode Frame */}
                  {(() => {
                    const payload = getBarcodePayload(selectedCard);
                    const barcodeData = payload ? getCode128BarcodeBars(payload, { quietZone: 0 }) : null;
                    
                    return (
                      <div className="rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center gap-3 shadow-none min-h-[140px] w-full text-left bg-m3-surface-container-low border border-m3-outline-variant">
                        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl text-left">
                          <div className="flex justify-between items-center w-full border-b border-m3-outline-variant pb-2">
                            <span id="detail-barcode-status" className="text-sm font-bold text-m3-on-surface-variant">
                              {selectedCard.merchant === 'walmart-ca' ? 'Walmart Canada' : 'Barcode Preview'}
                            </span>
                            <strong id="detail-barcode-balance" className="text-sm font-bold text-m3-on-surface">
                              ${selectedCard.currentBalance.toFixed(2)}
                            </strong>
                          </div>

                          {barcodeData ? (
                             <div className="w-full pt-2">
                               <div className="bg-white flex items-center justify-center w-full h-32 sm:h-48 rounded-xl p-2 border border-m3-outline-variant/50 shadow-inner">
                                 <svg
                                   viewBox={`0 0 ${barcodeData.width} ${barcodeData.height}`}
                                   preserveAspectRatio="none"
                                   role="img"
                                   aria-label="Code 128 checkout barcode"
                                   className="w-full h-full"
                                 >
                                   <rect width={barcodeData.width} height={barcodeData.height} fill="#ffffff" />
                                   {barcodeData.rects.map((r, i) => (
                                     <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill="#000000" />
                                   ))}
                                 </svg>
                               </div>
                             </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 border border-m3-outline-variant bg-m3-surface-container-low rounded-xl p-4 w-full text-center">
                              <span className="text-sm text-m3-error font-bold">
                                {getBarcodeFallbackMessage(selectedCard)}
                              </span>
                              <span className="text-[10px] text-m3-on-surface-variant">
                                Card number and PIN remain available below.
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-2 w-full border-t border-m3-outline-variant pt-2 text-xs font-bold text-m3-on-surface-variant">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <button
                              id="detail-barcode-caption"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isDesktopCopyTarget()) {
                                  await handleCopyCodePin(e, selectedCard);
                                  return;
                                }
                                setRevealNumber(!revealNumber);
                              }}
                              className="tabular-nums cursor-pointer hover:text-m3-primary rounded px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-1"
                              title="Copy code and PIN"
                              aria-label="Copy code and PIN"
                              type="button"
                            >
                              {revealNumber
                                ? selectedCard.cardNumber
                                : `${selectedCard.cardNumber.slice(0, 4)} •••• •••• ${selectedCard.cardNumber.slice(-4)}`
                              }
                            </button>
                          </div>
                          <button
                            id="detail-barcode-pin"
                            onClick={(e) => handleCopyCodePin(e, selectedCard)}
                            className="tabular-nums cursor-pointer hover:text-m3-primary rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-1"
                            title="Copy code and PIN"
                            aria-label="Copy code and PIN"
                            type="button"
                          >
                            {selectedCard.pin || "—"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedCard.pendingReconciliation && <p role="status" className="p-3 rounded-xl bg-m3-warning-container text-m3-on-warning-container text-sm">Balance needs verification. The recorded balance is provisional; verify it with Walmart before relying on the amount.</p>}
                  {/* Update and Mark used side-by-side */}
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <ActionButton
                      id="open-balance-modal"
                      onClick={() => {
                        handleOpenBalanceEdit(selectedCard.currentBalance);
                      }}
                      label="Update Balance"
                      variant="tonal"
                    />

                    <ActionButton
                      id="mark-used"
                      onClick={() => handleToggleUsed(selectedCardIndex)}
                      label={selectedCard.used ? "Mark Active" : "Mark Used"}
                      variant={selectedCard.used ? "outlined" : "primary"}
                    />
                  </div>

                  {/* Add note row */}
                  <div className="p-1 flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-1">
                      <span className="text-[10px] sm:text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Notes</span>
                      {!isEditingNotes && (
                        <Button
                          onClick={() => {
                            notesTarget.current = cardTarget(selectedCard);
                            setNewNotesValue(selectedCard.notes || "");
                            setIsEditingNotes(true);
                          }}
                          variant="text"
                          density="compact"
                        >
                          {selectedCard.notes ? "Edit" : "Add Note"}
                        </Button>
                      )}
                    </div>
                    
                    {isEditingNotes ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <TextArea
                          value={newNotesValue}
                          onChange={e => setNewNotesValue(e.target.value)}
                          className="w-full text-sm bg-m3-surface border border-m3-outline-variant hover:border-m3-outline focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3.5 focus:outline-none transition-all duration-200 min-h-[80px]"
                          placeholder="Add card notes..."
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={async () => {
                              try {
                                await commitWallet({ kind: "patch", action: "set-notes", ...notesTarget.current, patch: { notes: newNotesValue.trim() } });
                                setIsEditingNotes(false);
                              } catch { /* save error displayed */ }
                            }}
                            variant="filled"
                            density="compact"
                          >
                            Save Notes
                          </Button>
                          <Button
                            onClick={() => setIsEditingNotes(false)}
                            variant="outlined"
                            density="compact"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p id="detail-notes" className="text-xs text-m3-on-surface-variant leading-relaxed">
                        {selectedCard.notes || <span className="italic opacity-60">No notes added to this card.</span>}
                      </p>
                    )}
                  </div>

                  {/* Back Button */}
                  <ActionButton
                    id="checkout-back"
                    onClick={() => setActivePanel('list')}
                    label="Back"
                    variant="outlined"
                  />

                </div>
              ) : (
                <Surface variant="dashed" shape="xl" className="text-center py-12 text-m3-on-surface-variant font-semibold w-full">
                  No card selected. Select a card from the inventory list first.
                </Surface>
              )}
            </main>
          )}
        </div>
      </div>



      {/* Update Balance Modal */}
      {isEditingBalance && selectedCard && (
        <Dialog
          id="balance-modal"
          className="max-w-sm w-full p-6 rounded-3xl"
          titleId="balance-modal-title"
        >
            {/* Close Button */}
            <IconButton
              onClick={handleCancelBalanceEdit}
              variant="standard"
              size="standard"
              className="absolute top-2 right-2"
              aria-label="Close update balance modal"
            >
              <X className="size-5" aria-hidden="true" />
            </IconButton>

            <h2 id="balance-modal-title" className="text-lg font-bold text-m3-on-surface border-b border-m3-outline-variant/20 pb-2">
              Update Balance
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm font-semibold text-m3-on-surface">
                <span>Current Balance</span>
                <span>${selectedCard.currentBalance.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="amount-used-input" className="text-xs font-bold text-m3-outline uppercase tracking-wider">
                  Amount Used
                </label>
                <TextField
                  id="amount-used-input"
                  type="number"
                  step="0.01"
                  value={amountUsedValue}
                  onChange={handleAmountUsedChange}
                  className="w-full text-sm bg-m3-surface-container border border-m3-outline-variant focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3 focus:bg-m3-surface-container-lowest focus:outline-none transition-all duration-200"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="balance-input" className="text-xs font-bold text-m3-outline uppercase tracking-wider">
                  Remaining Balance
                </label>
                <TextField
                  id="balance-input"
                  type="number"
                  step="0.01"
                  value={newBalanceValue}
                  onChange={handleRemainingBalanceChange}
                  className="w-full text-sm bg-m3-surface-container border border-m3-outline-variant focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3 focus:bg-m3-surface-container-lowest focus:outline-none transition-all duration-200"
                  placeholder="0.00"
                />
              </div>

              {balanceError && (
                <span id="balance-error" className="text-[10px] text-m3-error font-semibold mt-1">
                  {balanceError}
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t border-m3-outline-variant/20 pt-4 mt-2">
              <Button
                id="cancel-balance-update"
                onClick={handleCancelBalanceEdit}
                variant="outlined"
                density="standard"
              >
                Cancel
              </Button>
              <Button
                id="save-balance-update"
                onClick={handleSaveBalance}
                variant="filled"
                density="standard"
              >
                Save
              </Button>
            </div>
        </Dialog>
      )}

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

      {/* M3 Snackbar Toast */}
      {copyFeedback && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-m3-on-surface text-m3-surface text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-4 min-w-[288px] max-w-sm pointer-events-none animate-snackbar">
          <span className="w-full text-center">{copyFeedback}</span>
        </div>
      )}
    </>
  );
}

export default App;
