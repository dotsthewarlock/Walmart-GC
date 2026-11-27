import { createSyncEngine } from './lib/syncEngine';
import React, { useState, useEffect, useRef } from 'react';
import { calculateVisibleCards, calculateCardSummary, getBarcodePayload, getBarcodeFallbackMessage } from './lib/cards';
import { useSettings } from './features/settings/useSettings';
import { SettingsPanel } from './features/settings/SettingsPanel';
import { CardsPanel } from './features/cards/CardsPanel';
import { ActionButton } from './components/ActionButton';
import { getCode128BarcodeBars } from './lib/barcode';
import { cardsToCsv, parseRawCardData, wouldDiscardCardMetadata } from './lib/csv';
import { fetchWorkerJson, googleOAuthStatuses, directSheetsStatuses, syncStatuses } from './lib/api';
import { Button } from './components/primitives/Button';
import { IconButton } from './components/primitives/IconButton';
import { Card } from './components/primitives/Card';
import { Dialog } from './components/primitives/Dialog';
import { NavigationBar, NavigationBarItem } from './components/primitives/NavigationBar';
import { Surface } from './components/primitives/Surface';
import { TextArea } from './components/primitives/TextArea';
import { TextField } from './components/primitives/TextField';
import { BalanceReview } from './components/BalanceReview';
import { openInventory, operationId, profileOf, inventoryContext, assertInventoryContext, savedCompartments, compartmentCards, recoveryExport, recoveryWarning, validateInventory } from './lib/inventory';
import { Settings2, X } from 'lucide-react';
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

function App() {
  const cardsLoaded = useRef(false);
  const inventoryStore = useRef(null);
  const walletRef = useRef(null);
  const selectionIdentity = useRef(null);
  const [walletSnapshot, setWalletSnapshot] = useState(null);
  const syncEngine = useRef(null);
  const [syncUi,setSyncUi] = useState({phase:'local',message:'Saved on this device.'});
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

  const settingsController = useSettings({
    active: activePanel === 'settings', connectionStatus: oauthState.status,
    summaryKey: getAppSyncSummaryState().key,
    onAutomaticEnabled: () => syncEngine.current?.foreground(),
  });
  const { settings, current: preferences } = settingsController;

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
        if(command.kind==='select-compartment'||profileOf(state).pending.length||profileOf(state).inFlight){
          setSyncUi({phase:'local',message:'Changes saved on this device.'});
          if(command.kind==='select-compartment')syncEngine.current?.foreground();
          if(profileOf(state).pending.length||profileOf(state).inFlight)syncEngine.current?.schedule();
        }
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
      return await commitWallet({ kind: "begin-context", ...inventoryContext(walletSnapshot) });
    } catch { sheetMutation.current = false; return null; }
  }

  function getTransferWallet() {
    if (sheetMutation.current) throw new Error("Wait for the current Sheet operation to finish.");
    return transferWallet.current;
  }

  function getAppSyncSummaryState() {
    const pending = walletRef.current && profileOf(walletRef.current).pending.length;
    if(syncUi.phase==='checking')return {key:'checking',label:'Checking sync…',help:'Local cards stay available'};
    if(['error','review'].includes(syncUi.phase))return {key:'error',label:'Review sync',help:syncUi.message};
    if(syncUi.phase==='saved'&&!pending)return {key:'connected',label:'Synced',help:syncUi.message};
    return {key:'local-only',label:pending?'Saved locally':'Local inventory',help:syncUi.message};
  }

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
      <input
        id="csv-file-input"
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportCsvFile}
        className="hidden"
      />
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
            <CardsPanel
              cards={cards}
              visibleIndexes={visibleIndexes}
              selectedCardIndex={selectedCardIndex}
              loaded={cardsLoaded.current}
              googleConnected={oauthState.status === googleOAuthStatuses.connected}
              maskCardNumber={maskCardNumber}
              commands={{ reviewBalances: () => setBalanceReviewOpen(true), connectGoogle: handleConnectGoogle,
                importCsv: () => document.getElementById('csv-file-input').click(),
                resetFilters: settingsController.resetFilters, openSettings: () => setActivePanel('settings'),
                selectCard: index => { setSelectedCardIndex(index); setActivePanel('detail'); } }}
            />
           ) : activePanel === 'settings' ? (
              <SettingsPanel
                preferences={settingsController.panel}
                connection={oauthState}
                synchronization={{ summary: getAppSyncSummaryState(), chipStatus: getSyncChipStatus(getAppSyncSummaryState().key),
                  message: syncUi.message, sheetMessage: directSheetsState.message,
                  diagnosticMessage: syncState.message || directSheetsState.message,
                  hasPendingChanges: Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced) }}
                inventory={{ activeKey: walletSnapshot.active, compartments: savedCompartments(walletSnapshot),
                  label: savedCompartments(walletSnapshot).find(item => item.key === walletSnapshot.active)?.label,
                  context: profileOf(walletSnapshot).context, pendingCount: profileOf(walletSnapshot).pending.length,
                  confirming: Boolean(profileOf(walletSnapshot).inFlight), lastConfirmedAt: profileOf(walletSnapshot).sync?.lastConfirmedAt,
                  syncBlocked: profileOf(walletSnapshot).syncBlocked, recoveryCards: profileOf(walletSnapshot).recoveryEvidence?.cards,
                  zeroBalanceCount }}
                commands={{ markZeroBalanceUsed: handleMarkZeroBalanceUsed, connectGoogle: handleConnectGoogle,
                  disconnectGoogle: handleDisconnectGoogle, syncNow, ensureSheet: handleEnsureSheet,
                  importSheet: handleLoadCardsFromSheet, saveSheet: handleSaveCardsToSheet, maintenance,
                  recoverExpired: async () => {
                    try { await syncEngine.current?.recoverExpired(); }
                    catch (error) { setTransferMutationError(error.message); }
                  }, recoverUnbound, resolveConflict, selectCompartment: handleSelectCompartment,
                  exportCsv: handleExportCsv, exportRecovery: handleExportRecovery,
                  openRawEditor: handleOpenRawEditor }}
                showRawCsvEditor={SHOW_RAW_CSV_EDITOR}
                onBack={() => setActivePanel(previousPrimaryPanel)}
              />
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
