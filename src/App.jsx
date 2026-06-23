import React, { useState, useEffect } from 'react';
import { loadCards, saveCards, calculateVisibleCards, calculateCardSummary, getBarcodePayload, getBarcodeFallbackMessage } from './lib/cards';
import { loadSettings, saveSettings } from './lib/settings';
import { getCode128BarcodeBars } from './lib/barcode';
import { cardsToCsv, parseRawCardData } from './lib/csv';
import { fetchWorkerJson, googleOAuthStatuses, directSheetsStatuses, syncStatuses } from './lib/api';

function isCardsHeaderError(message) {
  return /(?:Missing|Duplicate) required Cards header|Cards header row|Cards headers do not match|cards_header_schema/i.test(String(message || ""));
}

function App() {
  const [cards, setCards] = useState([]);
  const [settings, setSettings] = useState({
    advanceOnMarkUsed: true,
    hideUsedCards: true,
    hideZeroBalanceCards: false,
    sortMode: "balance-asc",
  });
  const [activePanel, setActivePanel] = useState('list'); // 'list' or 'detail'
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  const [revealNumber, setRevealNumber] = useState(false);
  
  // Balance Editor Form State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalanceValue, setNewBalanceValue] = useState("");
  const [balanceError, setBalanceError] = useState("");

  // Notes Editor Form State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newNotesValue, setNewNotesValue] = useState("");

  const [isFullscreenBarcode, setIsFullscreenBarcode] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);

  // Raw CSV Editor Modal and backup states
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
    message: "Connect Google to enable durable sync.",
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
    message: "Connect Google to sync.",
    lastErrorMessage: "",
  });

  // General Concurrency tracking Sync State
  const [syncState, setSyncState] = useState({
    status: syncStatuses.unsynced,
    lastSyncTimestamp: "",
    lastSyncAttemptTimestamp: "",
    lastKnownSheetVersion: "",
    message: "Durable cloud sync is not active.",
    lastErrorMessage: "",
    pendingOperation: null,
  });

  const getAppSyncSummaryState = () => {
    const isChecking = [googleOAuthStatuses.connecting, googleOAuthStatuses.restoring].includes(oauthState.status)
      || [directSheetsStatuses.checking, directSheetsStatuses.creating, directSheetsStatuses.syncing].includes(directSheetsState.status);

    if (isChecking) {
      return {
        key: "checking",
        label: "Checking sync",
        help: "Local cards stay available",
      };
    }

    if (syncState.status === syncStatuses.conflict || directSheetsState.status === directSheetsStatuses.conflict) {
      return {
        key: "conflict",
        label: "Sync conflict",
        help: "Open backup and sync",
      };
    }

    const hasPendingLocalChanges = Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced);

    if (navigator.onLine === false || oauthState.status === googleOAuthStatuses.error || directSheetsState.status === directSheetsStatuses.error) {
      return {
        key: "unavailable",
        label: "Sync unavailable",
        help: hasPendingLocalChanges ? "Open backup and sync" : "Local cards available",
      };
    }

    if (hasPendingLocalChanges || (syncState.status === syncStatuses.unsynced && oauthState.status === googleOAuthStatuses.connected)) {
      return {
        key: "unsynced",
        label: "Unsynced changes",
        help: "Open backup and sync",
      };
    }

    if (oauthState.status === googleOAuthStatuses.connected && directSheetsState.status === directSheetsStatuses.ready) {
      return {
        key: "connected",
        label: "✓ Sync ready",
        help: "",
      };
    }

    return {
      key: "local-only",
      label: "Local only",
      help: "Connect in backup and sync",
    };
  };




  // Handle escape key listener for barcode modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFullscreenBarcode(false);
      }
    };
    
    if (isFullscreenBarcode) {
      window.addEventListener("keydown", handleKeyDown);
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreenBarcode]);

  // Handle screen wake lock for focused barcode scanning
  useEffect(() => {
    let activeLock = null;
    async function requestLock() {
      if ("wakeLock" in navigator && isFullscreenBarcode) {
        try {
          activeLock = await navigator.wakeLock.request("screen");
          setWakeLock(activeLock);
        } catch {
          // ignore
        }
      }
    }
    
    if (isFullscreenBarcode) {
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
  }, [isFullscreenBarcode]);

  // Refresh Worker Session Status
  const refreshWorkerSessionStatus = async (options = {}) => {
    const isAuthReturn = options.authReturn === true;
    setOauthState(prev => ({
      ...prev,
      status: googleOAuthStatuses.connecting,
      message: isAuthReturn ? "Finishing Google connection..." : "Checking connection...",
      lastErrorMessage: "",
    }));

    try {
      const status = await fetchWorkerJson("/api/status");
      if (status.authenticated) {
        setOauthState({
          status: googleOAuthStatuses.connected,
          connectedEmail: String(status.email || ""),
          connectedName: String(status.name || ""),
          message: "Google account connected.",
          lastErrorMessage: "",
          workerVersion: String(status.workerVersion || "unknown"),
          schemaMode: String(status.schemaMode || "unknown"),
        });
        return true;
      }

      setOauthState({
        status: googleOAuthStatuses.disconnected,
        connectedEmail: "",
        connectedName: "",
        message: "Connect Google to enable durable sync.",
        lastErrorMessage: "",
        workerVersion: String(status.workerVersion || "unknown"),
        schemaMode: String(status.schemaMode || "unknown"),
      });
      return false;
    } catch (error) {
      setOauthState(prev => ({
        ...prev,
        status: googleOAuthStatuses.error,
        message: "Connection unavailable. Local data remains available.",
        lastErrorMessage: error instanceof Error ? error.message : "Worker status failed",
      }));
      return false;
    }
  };

  // Load cards, settings and check auth session on initialization
  useEffect(() => {
    const loadedCards = loadCards();
    const loadedSettings = loadSettings();
    setCards(loadedCards);
    setSettings(loadedSettings);
    
    // Restore directSheets and sync states from local storage if available
    try {
      const storedSheets = localStorage.getItem("walmartGc.directSheets");
      if (storedSheets) {
        setDirectSheetsState(JSON.parse(storedSheets));
      }
      const storedSync = localStorage.getItem("walmartGc.sync");
      if (storedSync) {
        setSyncState(JSON.parse(storedSync));
      }
    } catch {
      // ignore
    }
    
    // Auto-select first visible card if possible
    const visible = calculateVisibleCards(loadedCards, loadedSettings, loadedSettings.sortMode);
    if (visible.length > 0) {
      setSelectedCardIndex(visible[0]);
    }

    // Process redirect callbacks from Google OAuth return
    const url = new URL(window.location.href);
    const authReturn = url.searchParams.get("auth") === "connected";
    if (authReturn) {
      url.searchParams.delete("auth");
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, document.title, nextUrl);
    }

    refreshWorkerSessionStatus({ authReturn });
  }, []);



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

  // Handle sort mode changes
  const handleSortChange = (e) => {
    const nextSettings = {
      ...settings,
      sortMode: e.target.value,
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  // Handle used toggles on specific card items
  const handleToggleUsed = (index) => {
    const updatedCards = cards.map((card, idx) => {
      if (idx === index) {
        const nextUsed = !card.used;
        return {
          ...card,
          used: nextUsed,
          dateUsed: nextUsed ? new Date().toISOString().slice(0, 10) : "",
        };
      }
      return card;
    });
    
    setCards(updatedCards);
    saveCards(updatedCards);

    // If auto-advance is enabled and the card is marked used, switch to the next visible card
    const card = cards[index];
    if (card && !card.used && settings.advanceOnMarkUsed) {
      const currentPosition = visibleIndexes.indexOf(index);
      if (currentPosition !== -1 && visibleIndexes.length > 1) {
        const nextPositionIndex = (currentPosition + 1) % visibleIndexes.length;
        setSelectedCardIndex(visibleIndexes[nextPositionIndex]);
      }
    }
  };

  // Mark all $0 cards used helper from phase-12
  const handleMarkZeroBalanceUsed = () => {
    const updatedCards = cards.map((card) => {
      if (card.currentBalance === 0 && !card.used) {
        return {
          ...card,
          used: true,
          dateUsed: new Date().toISOString().slice(0, 10),
        };
      }
      return card;
    });
    setCards(updatedCards);
    saveCards(updatedCards);
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

  // Balance Update Action
  const handleOpenBalanceEdit = (currentVal) => {
    setNewBalanceValue(currentVal.toString());
    setBalanceError("");
    setIsEditingBalance(true);
  };

  const handleSaveBalance = () => {
    const value = parseFloat(newBalanceValue);
    if (isNaN(value) || value < 0) {
      setBalanceError("Enter a valid non-negative balance value");
      return;
    }
    const updatedCards = cards.map((card, idx) => {
      if (idx === selectedCardIndex) {
        return {
          ...card,
          currentBalance: Math.round(value * 100) / 100,
          dateUpdated: new Date().toISOString().slice(0, 10),
        };
      }
      return card;
    });
    setCards(updatedCards);
    saveCards(updatedCards);
    setIsEditingBalance(false);
  };

  const selectedCard = cards[selectedCardIndex];
  const visiblePosition = visibleIndexes.indexOf(selectedCardIndex);

  // CSV Export Action
  const handleExportCsv = () => {
    const csvContent = cardsToCsv(cards);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "walmart-gift-cards-export.csv";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  };

  // CSV Import File Processing Action
  const handleImportCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRawDataText(String(reader.result ?? ""));
      setIsRawDataLocked(true);
      setValidationSummary("CSV imported into raw editor. Press Done to validate and save.");
      setValidationWarnings([]);
      setIsRawDataModalOpen(true);
    };
    reader.onerror = () => {
      setValidationSummary("CSV import failed.");
      setValidationWarnings(["Unable to read the selected CSV file."]);
    };
    reader.readAsText(file);
    // Reset file input value to allow importing the same file again
    e.target.value = "";
  };

  // Raw editor actions
  const handleOpenRawEditor = () => {
    // Show first 100 cards maximum as limit from phase-12
    setRawDataText(cardsToCsv(cards, 100));
    setIsRawDataLocked(true);
    setValidationSummary(`Refreshed ${Math.min(cards.length, 100)} of ${cards.length} cards into the editor.`);
    setValidationWarnings(
      cards.length > 100
        ? ["Displaying first 100 cards only. Export CSV includes all cards."]
        : []
    );
    setIsRawDataModalOpen(true);
  };

  const handleRefreshRawEditor = () => {
    setRawDataText(cardsToCsv(cards, 100));
    setValidationSummary(`Refreshed ${Math.min(cards.length, 100)} of ${cards.length} cards into the editor.`);
    setValidationWarnings(
      cards.length > 100
        ? ["Displaying first 100 cards only. Export CSV includes all cards."]
        : []
    );
  };

  const handleUpdateRawEditor = () => {
    const { parsedCards, warnings } = parseRawCardData(rawDataText);

    if (warnings.length > 0) {
      setValidationSummary(`Validation failed: ${warnings.length} warning(s) found.`);
      setValidationWarnings(warnings);
      return false;
    }

    setCards(parsedCards);
    saveCards(parsedCards);
    
    // Auto-select first visible card if possible
    const visible = calculateVisibleCards(parsedCards, settings, settings.sortMode);
    if (visible.length > 0) {
      setSelectedCardIndex(visible[0]);
    } else {
      setSelectedCardIndex(-1);
    }

    setValidationSummary(`Successfully updated ${parsedCards.length} card(s) from editor.`);
    setValidationWarnings([]);
    return true;
  };

  const handleDoneRawEditor = () => {
    const success = handleUpdateRawEditor();
    if (success) {
      setIsRawDataModalOpen(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!navigator.onLine) {
      setOauthState(prev => ({
        ...prev,
        status: googleOAuthStatuses.error,
        message: "Connection unavailable. Local data remains available.",
        lastErrorMessage: "Browser is offline.",
      }));
      return;
    }

    setOauthState(prev => ({
      ...prev,
      status: googleOAuthStatuses.connecting,
      message: "Redirecting to Google sign-in...",
      lastErrorMessage: "",
    }));
    window.location.href = "/auth/init";
  };

  const handleDisconnectGoogle = async () => {
    setOauthState(prev => ({
      ...prev,
      status: googleOAuthStatuses.connecting,
      message: "Disconnecting Google...",
      lastErrorMessage: "",
    }));

    try {
      await fetchWorkerJson("/api/logout", { method: "POST" });
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
      setOauthState(prev => ({
        ...prev,
        status: googleOAuthStatuses.error,
        message: "Connection unavailable. Local data remains available.",
        lastErrorMessage: error instanceof Error ? error.message : "Worker logout failed",
      }));
    }
  };

  // Ensure Walmart-GC Data sheet exists and initialize layout metadata structures
  const handleEnsureSheet = async () => {
    setDirectSheetsState(prev => ({
      ...prev,
      status: directSheetsStatuses.checking,
      message: "Initializing Walmart-GC Data structure through the Worker...",
      lastErrorMessage: "",
    }));
    try {
      const result = await fetchWorkerJson("/api/sheet/ensure", { method: "POST" });
      const now = new Date().toISOString();
      const updatedSheets = {
        spreadsheetId: result.sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${result.sheetId}/edit`,
        spreadsheetName: String(result.sheetName || "Walmart-GC Data"),
        status: directSheetsStatuses.ready,
        cardsSheetInitialized: "yes",
        remoteSheetVersion: String(result.sheetVersion || ""),
        lastSuccessfulSyncAt: now,
        pendingUnsynced: false,
        message: "Walmart-GC Data sheet structure initialized.",
        lastErrorMessage: "",
      };
      setDirectSheetsState(updatedSheets);
      localStorage.setItem("walmartGc.directSheets", JSON.stringify(updatedSheets));

      const updatedSync = {
        ...syncState,
        status: syncStatuses.connected,
        lastSyncAttemptTimestamp: now,
        lastKnownSheetVersion: String(result.sheetVersion || ""),
        message: "Walmart-GC Data initialized. Completed actions will now sync.",
        lastErrorMessage: "",
      };
      setSyncState(updatedSync);
      localStorage.setItem("walmartGc.sync", JSON.stringify(updatedSync));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Walmart-GC Data initialization failed.";
      const isHeaderErr = isCardsHeaderError(msg);
      const mappedMsg = msg === "Not authenticated" ? "Connect Google to sync." : msg;

      setDirectSheetsState(prev => ({
        ...prev,
        status: isHeaderErr ? directSheetsStatuses.needsAttention : directSheetsStatuses.error,
        cardsSheetInitialized: "unknown",
        message: mappedMsg,
        lastErrorMessage: msg,
      }));
      setSyncState(prev => ({
        ...prev,
        status: syncStatuses.unsynced,
        lastErrorMessage: msg,
      }));
    }
  };

  // Fetch gift cards details from active Google Sheet
  const handleLoadCardsFromSheet = async () => {
    setDirectSheetsState(prev => ({
      ...prev,
      status: directSheetsStatuses.checking,
      message: "Loading cards from Google Sheets through the Worker...",
      lastErrorMessage: "",
    }));

    try {
      const result = await fetchWorkerJson("/api/cards/load");
      const now = new Date().toISOString();
      const loaded = result.cards || [];
      setCards(loaded);
      saveCards(loaded);

      // Auto-select first visible card if possible
      const visible = calculateVisibleCards(loaded, settings, settings.sortMode);
      if (visible.length > 0) {
        setSelectedCardIndex(visible[0]);
      } else {
        setSelectedCardIndex(-1);
      }

      const updatedSheets = {
        ...directSheetsState,
        spreadsheetId: result.sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${result.sheetId}/edit`,
        spreadsheetName: String(result.sheetName || "Walmart-GC Data"),
        status: directSheetsStatuses.ready,
        cardsSheetInitialized: "yes",
        remoteSheetVersion: String(result.sheetVersion || ""),
        lastSuccessfulSyncAt: now,
        pendingUnsynced: false,
        message: `Loaded ${loaded.length} card(s) from Sheets.`,
        lastErrorMessage: "",
      };
      setDirectSheetsState(updatedSheets);
      localStorage.setItem("walmartGc.directSheets", JSON.stringify(updatedSheets));

      const updatedSync = {
        status: syncStatuses.connected,
        lastSyncTimestamp: now,
        lastSyncAttemptTimestamp: now,
        lastKnownSheetVersion: String(result.sheetVersion || ""),
        message: `Loaded ${loaded.length} card(s) from Walmart-GC Data.`,
        lastErrorMessage: "",
        pendingOperation: null,
      };
      setSyncState(updatedSync);
      localStorage.setItem("walmartGc.sync", JSON.stringify(updatedSync));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Worker Google Sheets load failed.";
      const isHeaderErr = isCardsHeaderError(msg);
      const mappedMsg = msg === "Not authenticated" ? "Connect Google to sync." : msg;

      setDirectSheetsState(prev => ({
        ...prev,
        status: isHeaderErr ? directSheetsStatuses.needsAttention : directSheetsStatuses.error,
        message: mappedMsg,
        lastErrorMessage: msg,
      }));
      setSyncState(prev => ({
        ...prev,
        status: syncStatuses.unsynced,
        lastErrorMessage: msg,
      }));
    }
  };

  // Push active gift card arrays to Google Sheet
  const handleSaveCardsToSheet = async () => {
    setDirectSheetsState(prev => ({
      ...prev,
      status: directSheetsStatuses.syncing,
      message: "Syncing current local cards to Google Sheets through the Worker...",
      lastErrorMessage: "",
    }));

    try {
      const baseSheetVersion = String(syncState.lastKnownSheetVersion || "");
      const result = await fetchWorkerJson("/api/cards/save", {
        method: "POST",
        body: JSON.stringify({
          cards: cards,
          baseSheetVersion,
        }),
      });

      const now = new Date().toISOString();
      const spreadsheetId = String(result.sheetId || directSheetsState.spreadsheetId || "").trim();
      const updatedSheets = {
        ...directSheetsState,
        spreadsheetId,
        spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : directSheetsState.spreadsheetUrl,
        spreadsheetName: String(result.sheetName || directSheetsState.spreadsheetName || "Walmart-GC Data"),
        status: directSheetsStatuses.ready,
        remoteSheetVersion: String(result.sheetVersion || ""),
        lastSuccessfulSyncAt: now,
        pendingUnsynced: false,
        message: `Synced ${cards.length} card(s) successfully.`,
        lastErrorMessage: "",
      };
      setDirectSheetsState(updatedSheets);
      localStorage.setItem("walmartGc.directSheets", JSON.stringify(updatedSheets));

      const updatedSync = {
        ...syncState,
        status: syncStatuses.connected,
        lastSyncTimestamp: now,
        lastSyncAttemptTimestamp: now,
        lastKnownSheetVersion: String(result.sheetVersion || ""),
        message: "Sync succeeded. Current local cards were saved to Google Sheets.",
        lastErrorMessage: "",
      };
      setSyncState(updatedSync);
      localStorage.setItem("walmartGc.sync", JSON.stringify(updatedSync));
    } catch (error) {
      const payload = error && typeof error === "object" ? error.payload : null;
      if (payload && payload.conflict) {
        const remoteVersion = String(payload.remoteSheetVersion || "");
        const conflictMsg = "Conflict detected: the Google Sheet changed since your last successful load or sync. Nothing was overwritten.";
        
        setDirectSheetsState(prev => ({
          ...prev,
          status: directSheetsStatuses.conflict,
          remoteSheetVersion: remoteVersion,
          pendingUnsynced: true,
          message: conflictMsg,
          lastErrorMessage: conflictMsg,
        }));
        
        setSyncState(prev => ({
          ...prev,
          status: syncStatuses.conflict,
          lastSyncAttemptTimestamp: new Date().toISOString(),
          lastKnownSheetVersion: prev.lastKnownSheetVersion,
          message: conflictMsg,
          lastErrorMessage: conflictMsg,
        }));
        return;
      }

      const msg = error instanceof Error ? error.message : "Worker Google Sheets sync failed.";
      const isHeaderErr = isCardsHeaderError(msg);
      const mappedMsg = msg === "Not authenticated" ? "Connect Google to sync." : msg;

      setDirectSheetsState(prev => ({
        ...prev,
        status: isHeaderErr ? directSheetsStatuses.needsAttention : directSheetsStatuses.error,
        pendingUnsynced: true,
        message: mappedMsg,
        lastErrorMessage: msg,
      }));
      
      setSyncState(prev => ({
        ...prev,
        status: prev.status === syncStatuses.conflict ? syncStatuses.conflict : syncStatuses.unsynced,
        lastSyncAttemptTimestamp: new Date().toISOString(),
        message: mappedMsg,
        lastErrorMessage: msg,
      }));
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-8 antialiased font-sans">
        <div className="max-w-2xl w-full bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden mt-4">
          
          {/* Header Region */}
          <header className="bg-[#0b57d0] text-white px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                Walmart-GC
              </h1>
              <p className="text-xs text-blue-100 font-medium tracking-wide uppercase mt-0.5">
                Secure Local Gift Card Vault
              </p>
            </div>
            <div className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full font-mono font-bold tracking-wider">
              agy-v1
            </div>
          </header>

          {/* Top Tab Navigation matching phase-12 */}
          <nav className="flex border-b border-slate-200" aria-label="App sections">
            <button 
              id="nav-list"
              onClick={() => setActivePanel('list')}
              className={`flex-1 text-center py-4 font-bold text-sm border-b-2 transition-all ${
                activePanel === 'list' 
                  ? 'border-[#0b57d0] text-[#0b57d0]' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Cards
            </button>
            <button 
              id="nav-detail"
              onClick={() => {
                const nextIndex = ensureVisibleSelection();
                if (nextIndex !== -1) {
                  setSelectedCardIndex(nextIndex);
                  setActivePanel('detail');
                }
              }}
              disabled={visibleIndexes.length === 0}
              className={`flex-1 text-center py-4 font-bold text-sm border-b-2 transition-all ${
                activePanel === 'detail' 
                  ? 'border-[#0b57d0] text-[#0b57d0]' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 disabled:opacity-50'
              }`}
            >
              Checkout
            </button>
          </nav>

          {activePanel === 'list' ? (
            <main className="p-8 flex flex-col gap-6">
              
              {/* Wallet Diagnostics / Balances Summary */}
              <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visible Balance</span>
                  <span className="text-3xl font-black text-slate-900">${activeBalance.toFixed(2)}</span>
                  <span className="text-xs text-slate-400">Total Wallet Assets: ${totalBalance.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Counts</span>
                  <span className="text-2xl font-black text-slate-800">{activeCount} / {totalCount}</span>
                  <span className="text-xs text-slate-400">displayed / registered</span>
                </div>
              </section>

              {/* Local Settings / Filtering Controls */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={settings.hideUsedCards}
                      onChange={() => handleToggleSetting('hideUsedCards')}
                      className="w-4 h-4 rounded border-slate-300 text-[#0b57d0] focus:ring-[#0b57d0]"
                    />
                    Hide Used Cards
                  </label>

                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={settings.hideZeroBalanceCards}
                      onChange={() => handleToggleSetting('hideZeroBalanceCards')}
                      className="w-4 h-4 rounded border-slate-300 text-[#0b57d0] focus:ring-[#0b57d0]"
                    />
                    Hide $0 Cards
                  </label>

                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={settings.advanceOnMarkUsed}
                      onChange={() => handleToggleSetting('advanceOnMarkUsed')}
                      className="w-4 h-4 rounded border-slate-300 text-[#0b57d0] focus:ring-[#0b57d0]"
                    />
                    Auto-Advance
                  </label>

                  <div className="flex flex-col gap-1">
                    <select
                      value={settings.sortMode}
                      onChange={handleSortChange}
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0b57d0]"
                    >
                      <option value="balance-asc">Balance: Low to High</option>
                      <option value="balance-desc">Balance: High to Low</option>
                      <option value="date-added-asc">Date Added: Oldest First</option>
                      <option value="date-added-desc">Date Added: Newest First</option>
                      <option value="date-updated-asc">Date Updated: Oldest First</option>
                      <option value="date-updated-desc">Date Updated: Newest First</option>
                      <option value="card-number">Card Number</option>
                    </select>
                  </div>

                  {zeroBalanceCount > 0 && (
                    <button
                      id="mark-zero-used"
                      onClick={handleMarkZeroBalanceUsed}
                      className="w-full sm:col-span-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex justify-between items-center transition-all active:scale-95 shadow-sm font-sans"
                      type="button"
                    >
                      <span>Mark {zeroBalanceCount} zero-balance card(s) used</span>
                      <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]" aria-hidden="true">Mark</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Google Sync Connection Panel */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Google Synchronization</h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {oauthState.status === googleOAuthStatuses.connected 
                        ? `Connected as ${oauthState.connectedName || oauthState.connectedEmail}` 
                        : oauthState.message
                      }
                    </p>
                  </div>
                  
                  {oauthState.status === googleOAuthStatuses.connected ? (
                    <button 
                      id="disconnect-google"
                      onClick={handleDisconnectGoogle}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm shrink-0"
                      type="button"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      id="connect-google"
                      onClick={handleConnectGoogle}
                      className="bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-md shrink-0"
                      type="button"
                    >
                      Connect Google
                    </button>
                  )}
                </div>

                {oauthState.status === googleOAuthStatuses.connected && (
                  <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-slate-100">
                    <p id="direct-sheet-status" className="text-xs font-semibold text-slate-600">
                      {directSheetsState.message}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        id="ensure-sheet"
                        onClick={handleEnsureSheet}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm"
                        type="button"
                      >
                        Fix Google Sheet
                      </button>
                      {directSheetsState.spreadsheetUrl && (
                        <a
                          id="open-direct-sheet"
                          href={directSheetsState.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm text-center flex items-center justify-center"
                        >
                          Open Sheet
                        </a>
                      )}
                      <button
                        id="load-from-sheets"
                        onClick={handleLoadCardsFromSheet}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm"
                        type="button"
                      >
                        Import from Google
                      </button>
                      <button
                        id="save-to-sheets"
                        onClick={handleSaveCardsToSheet}
                        className="bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 shadow-md"
                        type="button"
                      >
                        Export to Google
                      </button>
                    </div>
                  </div>
                )}

                {oauthState.lastErrorMessage && (
                  <p id="google-oauth-status" className="text-xs font-bold text-red-600 border-t border-red-50/50 pt-2 mt-1">
                    {oauthState.lastErrorMessage}
                  </p>
                )}
              </section>



              {/* Data Panel / Backup Controls */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                <details className="group">
                  <summary className="list-none flex justify-between items-center cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Backup & CSV Controls</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-3">
                      <input 
                        id="csv-file-input" 
                        type="file" 
                        accept=".csv,text/csv" 
                        onChange={handleImportCsvFile} 
                        className="hidden" 
                      />
                      <button 
                        id="import-csv" 
                        onClick={() => document.getElementById('csv-file-input').click()}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs border border-slate-200 transition-all active:scale-95 text-center"
                        type="button"
                        title="Import CSV backup"
                      >
                        ↓ Import CSV
                      </button>
                      <button 
                        id="export-csv" 
                        onClick={handleExportCsv}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs border border-slate-200 transition-all active:scale-95 text-center"
                        type="button"
                        title="Export CSV backup"
                      >
                        ↑ Export CSV
                      </button>
                    </div>

                    <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4 flex justify-between items-center gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase">Raw CSV Editor</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Open a locked editor to view or paste diagnostic card data.</p>
                      </div>
                      <button 
                        id="open-raw-data-modal" 
                        onClick={handleOpenRawEditor}
                        className="bg-white hover:bg-slate-50 text-[#0b57d0] text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm shrink-0"
                        type="button"
                      >
                        Open Editor
                      </button>
                    </div>
                  </div>
                </details>
              </section>

              {/* Diagnostics & Technical Details */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                <details className="group">
                  <summary className="list-none flex justify-between items-center cursor-pointer select-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnostics</span>
                      <small id="settings-app-shell-fingerprint" className="text-[10px] text-slate-400 font-medium">
                        agy-v1 · matching
                      </small>
                    </div>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase">App shell diagnostics</h4>
                      <ul className="text-xs text-slate-500 font-medium list-none flex flex-col gap-1.5">
                        <li className="flex justify-between border-b border-slate-100 pb-1">
                          <span>HTML version</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">agy-v1</span>
                        </li>
                        <li className="flex justify-between border-b border-slate-100 pb-1">
                          <span>JS version</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">agy-v1</span>
                        </li>
                        <li className="flex justify-between">
                          <span>CSS version</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">agy-v1</span>
                        </li>
                      </ul>
                    </div>

                    <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase">Technical Details</h4>
                      <ul className="text-xs text-slate-500 font-medium list-none flex flex-col gap-1.5">
                        <li className="flex justify-between border-b border-slate-100 pb-1">
                          <span>Worker session</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">{oauthState.status}</span>
                        </li>
                        <li className="flex justify-between border-b border-slate-100 pb-1">
                          <span>Connection state</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">{oauthState.status === googleOAuthStatuses.connected ? "connected" : "disconnected"}</span>
                        </li>
                        <li className="flex justify-between border-b border-slate-100 pb-1">
                          <span>Worker version</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">{oauthState.workerVersion}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Schema mode</span>
                          <span className="font-mono text-[10px] text-slate-700 font-bold">{oauthState.schemaMode}</span>
                        </li>
                      </ul>
                      <div id="advanced-sync-diagnostics" className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2 mt-1">
                        Local database matches storage specifications. Sync status: {syncState.status}. {syncState.message || directSheetsState.message}
                      </div>
                    </div>
                  </div>
                </details>
              </section>

              {/* Sync Status Banner */}
              {(() => {
                const summary = getAppSyncSummaryState();
                return (
                  <div
                    id="checkout-feedback"
                    className={`p-3.5 rounded-2xl text-xs font-bold flex justify-between items-center transition-all ${
                      summary.key === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/80' :
                      ['unsynced', 'checking'].includes(summary.key) ? 'bg-amber-50 text-amber-700 border border-amber-100/80' :
                      ['conflict', 'unavailable'].includes(summary.key) ? 'bg-rose-50 text-rose-700 border border-rose-100/80' :
                      'bg-slate-50 text-slate-600 border border-slate-100/80'
                    }`}
                    role="status"
                    aria-live="polite"
                    data-sync-summary={summary.key}
                  >
                    <span>{summary.label}</span>
                    {summary.help && <span className="text-[10px] opacity-80">{summary.help}</span>}
                  </div>
                );
              })()}

              {/* Cards Inventory Ledger */}
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Vault Inventory</h3>
                <div className="flex flex-col gap-3">
                  {visibleIndexes.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      No cards match the active filters.
                    </div>
                  ) : (
                    visibleIndexes.map((cardIndex) => {
                      const card = cards[cardIndex];
                      return (
                        <div 
                          key={card.cardNumber} 
                          onClick={() => {
                            setSelectedCardIndex(cardIndex);
                            setActivePanel('detail');
                          }}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white rounded-2xl border transition-all gap-4 cursor-pointer ${
                            card.used ? 'border-slate-100 bg-slate-50/50 opacity-60' : 'border-slate-200 hover:border-blue-300 shadow-sm'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-800">
                                {card.cardNumber.slice(0, 4)} •••• •••• {card.cardNumber.slice(-4)}
                              </span>
                              {card.merchant && (
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded uppercase">
                                  {card.merchant}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-400">PIN: {card.pin}</span>
                            {card.notes && <span className="text-xs text-slate-500 mt-1 max-w-md">{card.notes}</span>}
                          </div>

                          <div className="flex items-center justify-between w-full sm:w-auto gap-6 border-t sm:border-0 pt-3 sm:pt-0" onClick={e => e.stopPropagation()}>
                            <span className="text-xl font-extrabold text-slate-900">${card.currentBalance.toFixed(2)}</span>
                            <button
                              onClick={() => handleToggleUsed(cardIndex)}
                              className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                                card.used 
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-transparent' 
                                  : 'bg-white hover:bg-slate-100 text-[#0b57d0] border-slate-200 active:scale-95 shadow-sm'
                              }`}
                            >
                              {card.used ? "Mark Active" : "Mark Used"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </main>
          ) : (
            /* Checkout Detail Panel Layout */
            <main className="p-8 flex flex-col gap-6">
              {selectedCard ? (
                <div id="card-detail" className="flex flex-col gap-6">
                  
                  {/* Detail Card Navigation Header */}
                  <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                    <button 
                      id="prev-card"
                      onClick={handlePrevCard}
                      className="text-xs font-bold bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                    >
                      Previous
                    </button>
                    <span id="card-position" className="text-sm font-bold text-slate-600">
                      Card {visiblePosition + 1} of {visibleIndexes.length}
                    </span>
                    <button 
                      id="next-card"
                      onClick={handleNextCard}
                      className="text-xs font-bold bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                    >
                      Next
                    </button>
                  </div>

                  {/* Barcode Preview Segment */}
                  {(() => {
                    const payload = getBarcodePayload(selectedCard);
                    const barcodeData = payload ? getCode128BarcodeBars(payload) : null;
                    
                    return (
                      <section 
                        onClick={() => setIsFullscreenBarcode(true)}
                        className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[140px] cursor-pointer hover:border-blue-400 transition-colors"
                        title="Taping opens full-screen barcode focus mode"
                      >
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Barcode Preview (tap to focus)</span>
                        
                        {barcodeData ? (
                          <div className="flex flex-col items-center gap-2 w-full">
                            <div className="w-full bg-white border border-slate-100 p-2 rounded-2xl">
                              <svg 
                                viewBox={`0 0 ${barcodeData.width} ${barcodeData.height}`} 
                                preserveAspectRatio="none" 
                                role="img" 
                                aria-label="Code 128 checkout barcode" 
                                className="w-full h-16"
                              >
                                <rect width={barcodeData.width} height={barcodeData.height} fill="#ffffff" />
                                {barcodeData.rects.map((r, i) => (
                                  <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill="#000000" />
                                ))}
                              </svg>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-600 tracking-wider">
                              {payload}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 border border-slate-100 bg-slate-50/50 rounded-2xl p-4 w-full text-center">
                            <span className="text-sm text-red-600 font-bold">
                              {getBarcodeFallbackMessage(selectedCard)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Card number and PIN remain available below.
                            </span>
                          </div>
                        )}
                      </section>
                    );
                  })()}

                  {/* Card Detail Credentials Wrapper */}
                  <section className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <h3 id="card-detail-heading" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Credentials</h3>
                      {selectedCard.merchant && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded uppercase">
                          {selectedCard.merchant}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase">Card Number</span>
                      <div 
                        id="detail-number"
                        onClick={() => setRevealNumber(!revealNumber)}
                        className="font-mono text-2xl font-black text-slate-800 tracking-wider cursor-pointer hover:text-blue-600 transition-colors py-1"
                        title="Click to reveal/hide number"
                      >
                        {revealNumber 
                          ? selectedCard.cardNumber 
                          : `${selectedCard.cardNumber.slice(0, 4)} •••• •••• ${selectedCard.cardNumber.slice(-4)}`
                        }
                      </div>
                      <span className="text-[10px] text-slate-400">Click card number to toggle visibility</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">PIN</span>
                        <span id="detail-pin" className="font-mono text-lg font-bold text-slate-700">{selectedCard.pin}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">Starting Value</span>
                        <span id="detail-starting-balance" className="text-lg font-bold text-slate-700">${selectedCard.startingBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  </section>

                  {/* Card Balance Segment */}
                  <section className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex justify-between items-center shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">Current Balance</span>
                      <span id="detail-current-balance" className="text-3xl font-black text-slate-900">
                        ${selectedCard.currentBalance.toFixed(2)}
                      </span>
                    </div>

                    {isEditingBalance ? (
                      <div className="flex flex-col gap-2 w-1/2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={newBalanceValue}
                            onChange={e => setNewBalanceValue(e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0b57d0]"
                            placeholder="0.00"
                          />
                          <button
                            onClick={handleSaveBalance}
                            className="bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setIsEditingBalance(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition-all"
                          >
                            X
                          </button>
                        </div>
                        {balanceError && <span className="text-[10px] text-red-600 font-semibold">{balanceError}</span>}
                      </div>
                    ) : (
                      <button
                        id="open-balance-modal"
                        onClick={() => handleOpenBalanceEdit(selectedCard.currentBalance)}
                        className="bg-white hover:bg-slate-100 text-[#0b57d0] text-xs font-bold px-5 py-3 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm"
                      >
                        Update Balance
                      </button>
                    )}
                  </section>

                  {/* Notes panel */}
                  <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</span>
                      {!isEditingNotes && (
                        <button
                          onClick={() => {
                            setNewNotesValue(selectedCard.notes || "");
                            setIsEditingNotes(true);
                          }}
                          className="text-xs font-bold text-[#0b57d0] hover:underline"
                          type="button"
                        >
                          {selectedCard.notes ? "Edit" : "Add Notes"}
                        </button>
                      )}
                    </div>
                    
                    {isEditingNotes ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <textarea
                          value={newNotesValue}
                          onChange={e => setNewNotesValue(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0b57d0] min-h-[80px]"
                          placeholder="Add card notes..."
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              const updatedCards = cards.map((c, idx) => {
                                if (idx === selectedCardIndex) {
                                  return {
                                    ...c,
                                    notes: newNotesValue.trim(),
                                  };
                                }
                                return c;
                              });
                              setCards(updatedCards);
                              saveCards(updatedCards);
                              setIsEditingNotes(false);
                            }}
                            className="bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
                            type="button"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => setIsEditingNotes(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p id="detail-notes" className="text-sm text-slate-600 leading-relaxed font-medium">
                        {selectedCard.notes || <span className="text-slate-400 italic">No notes added to this card.</span>}
                      </p>
                    )}
                  </section>

                  {/* Mark Used Action */}
                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      id="mark-used"
                      onClick={() => handleToggleUsed(selectedCardIndex)}
                      className={`w-full font-bold py-4 px-6 rounded-full transition-all shadow-md text-sm active:scale-95 ${
                        selectedCard.used
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-[#0b57d0] hover:bg-[#0842a0] text-white'
                      }`}
                    >
                      {selectedCard.used ? "Mark Active" : "Mark Card Used"}
                    </button>

                    <button
                      onClick={() => setActivePanel('list')}
                      className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 px-6 rounded-full border border-slate-200 transition-all text-xs"
                    >
                      Back to Inventory
                    </button>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                  No card selected. Select a card from the inventory list first.
                </div>
              )}
            </main>
          )}

        </div>
      </div>

      {/* Fullscreen Barcode Focus Overlay */}
      {isFullscreenBarcode && selectedCard && (
        <div 
          id="fullscreen-barcode" 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsFullscreenBarcode(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 flex flex-col gap-6 shadow-2xl relative cursor-default"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Focused checkout barcode"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsFullscreenBarcode(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
              type="button"
              aria-label="Close barcode focus mode"
            >
              ✕
            </button>

            {/* Position count */}
            <div id="fullscreen-position" className="text-center font-bold text-slate-500 text-sm">
              Card {visiblePosition + 1} of {visibleIndexes.length}
            </div>

            {/* Barcode Frame */}
            <div id="fullscreen-barcode-frame" className="border border-slate-100 bg-slate-50 p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span id="fullscreen-barcode-status" className="text-xs font-bold text-slate-400 uppercase">Walmart Canada</span>
                <span id="fullscreen-current-balance" className="text-lg font-black text-slate-900">${selectedCard.currentBalance.toFixed(2)}</span>
              </div>

              {/* SVG barcode */}
              {(() => {
                const payload = getBarcodePayload(selectedCard);
                const barcodeData = payload ? getCode128BarcodeBars(payload) : null;
                return barcodeData ? (
                  <div id="fullscreen-barcode-render" className="w-full flex items-center justify-center bg-white p-2 rounded-xl">
                    <svg 
                      viewBox={`0 0 ${barcodeData.width} ${barcodeData.height}`} 
                      preserveAspectRatio="none" 
                      role="img" 
                      aria-label="Code 128 checkout barcode" 
                      className="w-full h-24"
                    >
                      <rect width={barcodeData.width} height={barcodeData.height} fill="#ffffff" />
                      {barcodeData.rects.map((r, i) => (
                        <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill="#000000" />
                      ))}
                    </svg>
                  </div>
                ) : (
                  <span id="fullscreen-barcode-caption" className="text-center text-sm font-bold text-red-600 py-4">
                    {getBarcodeFallbackMessage(selectedCard)}
                  </span>
                );
              })()}

              <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-mono text-sm font-bold text-slate-700">
                <span id="fullscreen-card-number">
                  {revealNumber 
                    ? selectedCard.cardNumber 
                    : `${selectedCard.cardNumber.slice(0, 4)} •••• •••• ${selectedCard.cardNumber.slice(-4)}`
                  }
                </span>
                <span id="fullscreen-pin">PIN: {selectedCard.pin}</span>
              </div>
            </div>

            {/* Focus Navigation Controls */}
            <div className="flex gap-3">
              <button
                id="fullscreen-prev"
                onClick={handlePrevCard}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-xs transition-all active:scale-95"
                type="button"
              >
                Previous
              </button>
              <button
                id="fullscreen-next"
                onClick={handleNextCard}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-xs transition-all active:scale-95"
                type="button"
              >
                Next
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                id="fullscreen-mark-used"
                onClick={() => handleToggleUsed(selectedCardIndex)}
                className={`w-full font-bold py-4 px-6 rounded-full transition-all shadow-md text-sm active:scale-95 ${
                  selectedCard.used
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-[#0b57d0] hover:bg-[#0842a0] text-white'
                }`}
                type="button"
              >
                {selectedCard.used ? "Mark Active" : "Mark Card Used"}
              </button>
            </div>

            {/* Notes display */}
            {selectedCard.notes && (
              <div id="fullscreen-notes" className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-600 max-h-24 overflow-y-auto font-medium">
                <strong>Notes:</strong> {selectedCard.notes}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Raw CSV Editor Modal */}
      {isRawDataModalOpen && (
        <div 
          id="raw-data-modal" 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="raw-data-modal-title"
          >
            <h2 id="raw-data-modal-title" className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              Raw CSV editor
            </h2>

            <div className="flex flex-col gap-2">
              <label htmlFor="raw-data-input" className="text-xs font-bold text-slate-400 uppercase">
                Raw CSV card data
              </label>
              <textarea
                id="raw-data-input"
                className="w-full font-mono text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0b57d0] bg-slate-50 disabled:bg-slate-100 text-slate-700 disabled:text-slate-500 leading-relaxed"
                spellCheck="false"
                rows="8"
                placeholder="Paste or import card data here..."
                value={rawDataText}
                onChange={e => setRawDataText(e.target.value)}
                disabled={isRawDataLocked}
              />
            </div>

            {/* Validation warnings card details */}
            <div className="border border-slate-100 bg-slate-50 rounded-xl p-4 flex flex-col gap-2 max-h-36 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Validation details</h4>
              <div id="data-validation-warnings" className="text-xs font-semibold text-slate-600 leading-relaxed" role="status">
                <p>{validationSummary}</p>
                {validationWarnings.length > 0 && (
                  <ul className="list-disc pl-4 mt-1 flex flex-col gap-1 text-red-600">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 mt-2">
              <div className="flex gap-2">
                <button 
                  id="toggle-data-lock" 
                  onClick={() => setIsRawDataLocked(!isRawDataLocked)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  type="button" 
                  title={isRawDataLocked ? "Raw CSV editor locked" : "Raw CSV editor unlocked"}
                >
                  {isRawDataLocked ? "Unlock 🔓" : "Lock 🔒"}
                </button>
                
                <button 
                  id="refresh-card-data" 
                  onClick={handleRefreshRawEditor}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-100 transition-all active:scale-95"
                  type="button"
                >
                  Refresh
                </button>
                <button 
                  id="update-card-data" 
                  onClick={handleUpdateRawEditor}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-100 transition-all active:scale-95"
                  type="button"
                >
                  Update
                </button>
              </div>

              <div className="flex gap-2 justify-end">
                <button 
                  id="cancel-raw-data-update" 
                  onClick={() => setIsRawDataModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-5 rounded-xl text-xs transition-all active:scale-95"
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  id="done-raw-data-update" 
                  onClick={handleDoneRawEditor}
                  className="bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold py-3 px-6 rounded-xl text-xs transition-all active:scale-95 shadow-md"
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
