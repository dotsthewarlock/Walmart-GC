import React, { useState, useEffect, useRef } from 'react';
import { loadCards, saveCards, calculateVisibleCards, calculateCardSummary, getBarcodePayload, getBarcodeFallbackMessage, normalizeCard } from './lib/cards';
import { loadSettings, saveSettings } from './lib/settings';
import { getCode128BarcodeBars } from './lib/barcode';
import { cardsToCsv, parseRawCardData } from './lib/csv';
import { fetchWorkerJson, googleOAuthStatuses, directSheetsStatuses, syncStatuses } from './lib/api';
import { Button } from './components/primitives/Button';

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
  const mainTouchStart = useRef(null);
  const copyFeedbackTimer = useRef(null);
  const [cards, setCards] = useState([]);
  const [settings, setSettings] = useState({
    advanceOnMarkUsed: true,
    hideUsedCards: true,
    hideZeroBalanceCards: false,
    sortMode: "balance-asc",
    themeMode: "system",
    checkoutDark: true,
  });
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
        label: "Syncing…",
        help: "Local cards stay available",
      };
    }

    if (syncState.status === syncStatuses.conflict || directSheetsState.status === directSheetsStatuses.conflict) {
      return {
        key: "conflict",
        label: "Sync issue",
        help: "Open backup and sync",
      };
    }

    const hasPendingLocalChanges = Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced);

    if (navigator.onLine === false || oauthState.status === googleOAuthStatuses.error || directSheetsState.status === directSheetsStatuses.error) {
      return {
        key: "unavailable",
        label: "Sync issue",
        help: hasPendingLocalChanges ? "Open backup and sync" : "Local cards available",
      };
    }

    if (hasPendingLocalChanges || (syncState.status === syncStatuses.unsynced && oauthState.status === googleOAuthStatuses.connected)) {
      return {
        key: "unsynced",
        label: "Sync issue",
        help: "Open backup and sync",
      };
    }

    if (oauthState.status === googleOAuthStatuses.connected && directSheetsState.status === directSheetsStatuses.ready) {
      return {
        key: "connected",
        label: "Google sync on",
        help: "",
      };
    }

    return {
      key: "local-only",
      label: "Local only · Connect",
      help: "Connect in backup and sync",
    };
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
      const isStatus404 = error && typeof error === "object" && error.status === 404;
      const isConnectionFailure = error instanceof TypeError || (error instanceof Error && (error.message.includes("Failed to fetch") || error.message.includes("Worker status failed")));

      if (isStatus404 || isConnectionFailure) {
        setOauthState(prev => ({
          ...prev,
          status: googleOAuthStatuses.disconnected,
          message: "Connect Google to enable durable sync.",
          lastErrorMessage: "",
        }));
      } else {
        setOauthState(prev => ({
          ...prev,
          status: googleOAuthStatuses.error,
          message: "Connection unavailable. Local data remains available.",
          lastErrorMessage: error instanceof Error ? error.message : "Worker status failed",
        }));
      }
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
    if (!window.confirm(`Are you sure you want to mark all ${zeroBalanceCount} zero-balance card(s) as used?`)) {
      return;
    }

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
    setNewBalanceValue(currentVal.toString());
    setAmountUsedValue("");
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
    if (!window.confirm("Are you sure you want to disconnect your Google Account? This will pause sheet synchronization, though your local gift cards will not be changed.")) {
      return;
    }

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

  const isDirectSheetsConfigured = () => Boolean(directSheetsState.spreadsheetId);
  const hasGoogleFileAccessInMemory = () => oauthState.status === googleOAuthStatuses.connected;

  const getRecoveryUnavailableMessage = () => {
    if (!isDirectSheetsConfigured()) {
      return "Connect Google to create or locate Walmart-GC Data before using Sheets recovery actions.";
    }

    if (!hasGoogleFileAccessInMemory()) {
      return oauthState.status === googleOAuthStatuses.connected
        ? "Load or initialize Walmart-GC Data before using Google Sheets recovery actions."
        : "Connect Google to sync.";
    }

    return "";
  };

  const downloadSessionCsvBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    handleExportCsv(`walmart-gift-cards-session-backup-${timestamp}.csv`);
    setValidationWarnings([]);
    setValidationSummary("Downloaded a CSV backup of the current local session.");
  };

  const useCurrentSessionToOverwriteDirectSheets = async () => {
    const backupRecommended = window.confirm(
      "Overwrite sheet with this session will replace every card row in the configured Google sheet with this browser session. Download a backup CSV before continuing. Press OK only if you already downloaded a backup or intentionally choose to continue without one.",
    );
    if (!backupRecommended) {
      return;
    }

    const confirmed = window.confirm(
      "Final confirmation: overwrite the configured Google sheet with the current local session now? Walmart-GC will not automatically merge sheet changes.",
    );
    if (!confirmed) {
      return;
    }

    await handleSaveCardsToSheet({
      force: true,
      successMessage: `Overwrote Walmart-GC Data with ${cards.length} current-session card${cards.length === 1 ? "" : "s"}.`,
      startMessage: "Overwriting Walmart-GC Data with the current session...",
    });
  };

  const retrySyncCurrentSession = async () => {
    if (oauthState.status !== googleOAuthStatuses.connected) {
      const message = "Sync failed: Connect Google to sync.";
      setSyncState(prev => ({
        ...prev,
        status: syncStatuses.unsynced,
        lastSyncAttemptTimestamp: new Date().toISOString(),
        message,
        lastErrorMessage: message,
      }));
      setDirectSheetsState(prev => ({
        ...prev,
        status: directSheetsStatuses.error,
        pendingUnsynced: true,
        message,
        lastErrorMessage: message,
      }));
      return;
    }

    if (syncState.status === syncStatuses.conflict) {
      setSyncState(prev => ({
        ...prev,
        status: syncStatuses.conflict,
        lastSyncAttemptTimestamp: new Date().toISOString(),
        message: "Conflict detected. Load the remote Sheet or explicitly overwrite it with this session.",
        lastErrorMessage: "Conflict detected. Try sync again will not overwrite Sheet changes automatically.",
      }));
      return;
    }

    if (!syncState.lastKnownSheetVersion) {
      const message = "Load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current sheet version.";
      setSyncState(prev => ({
        ...prev,
        status: syncStatuses.unsynced,
        lastSyncAttemptTimestamp: new Date().toISOString(),
        message,
        lastErrorMessage: message,
      }));
      setDirectSheetsState(prev => ({
        ...prev,
        status: directSheetsStatuses.error,
        pendingUnsynced: true,
        message,
        lastErrorMessage: message,
      }));
      return;
    }

    await handleSaveCardsToSheet({
      successMessage: "Sync succeeded. Current local cards were saved to Google Sheets.",
      startMessage: "Retrying Google Sheets sync...",
    });
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
    if (!window.confirm("Are you sure you want to import cards from Google Sheets? This will completely replace your current local browser session with the spreadsheet data.")) {
      return;
    }

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
      const normalized = loaded.map(normalizeCard).filter(Boolean);
      setCards(normalized);
      saveCards(normalized);

      // Auto-select first visible card if possible
      const visible = calculateVisibleCards(normalized, settings, settings.sortMode);
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
        message: `Loaded ${normalized.length} card(s) from Sheets.`,
        lastErrorMessage: "",
      };
      setDirectSheetsState(updatedSheets);
      localStorage.setItem("walmartGc.directSheets", JSON.stringify(updatedSheets));

      const updatedSync = {
        status: syncStatuses.connected,
        lastSyncTimestamp: now,
        lastSyncAttemptTimestamp: now,
        lastKnownSheetVersion: String(result.sheetVersion || ""),
        message: `Loaded ${normalized.length} card(s) from Walmart-GC Data.`,
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
  const handleSaveCardsToSheet = async (options = {}) => {
    setDirectSheetsState(prev => ({
      ...prev,
      status: directSheetsStatuses.syncing,
      message: options.startMessage || "Syncing current local cards to Google Sheets through the Worker...",
      lastErrorMessage: "",
    }));

    try {
      const baseSheetVersion = options.force
        ? String(directSheetsState.remoteSheetVersion || syncState.lastKnownSheetVersion || "")
        : String(syncState.lastKnownSheetVersion || "");
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
        message: options.successMessage || `Synced ${cards.length} card(s) successfully.`,
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
        message: options.successMessage || "Sync succeeded. Current local cards were saved to Google Sheets.",
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
      {/* Header Region */}
      <header className="bg-m3-primary text-m3-on-primary border-b border-m3-outline-variant/60 py-3 md:py-4 px-6 sm:px-8">
        <div className="max-w-[60rem] mx-auto flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-m3-on-primary">
              Gift Card Manager
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              id="open-settings"
              onClick={() => {
                if (activePanel === 'settings') {
                  setActivePanel(previousPrimaryPanel);
                } else {
                  setPreviousPrimaryPanel(activePanel);
                  setActivePanel('settings');
                }
              }}
              variant={activePanel === 'settings' ? 'elevated' : 'tonal'}
              density="compact"
              className={`w-10 h-10 md:w-11 md:h-11 text-lg md:text-xl ${
                activePanel === 'settings'
                  ? 'bg-m3-on-primary text-m3-primary border-m3-on-primary'
                  : 'bg-m3-primary-container text-m3-on-primary-container border-m3-on-primary-container/20 opacity-50 hover:opacity-100'
              }`}
              title={activePanel === 'settings' ? "Close settings and return" : "Open settings"}
              aria-label="Open settings"
              aria-expanded={activePanel === 'settings'}
            >
              ⚙️
            </Button>
          </div>
        </div>
      </header>

      {/* Persistent Merchant Balance Strip */}
      {(activePanel === 'list' || activePanel === 'detail') && (() => {
        const summary = getAppSyncSummaryState();
        let syncLabel = "";
        if (summary.key === 'connected') {
          syncLabel = "Google sync on";
        } else if (summary.key === 'checking') {
          syncLabel = "Syncing…";
        } else if (summary.key === 'local-only') {
          syncLabel = "Local only · Connect";
        } else if (['conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key)) {
          syncLabel = "Sync issue";
        } else {
          syncLabel = "Local only · Connect";
        }

        const isInteractive = ['local-only', 'conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key);
        const dotClass = `w-1.5 h-1.5 rounded-full shrink-0 ${
          summary.key === 'connected' ? 'bg-[#0f5132] dark:bg-[#a3cfbb]' :
          summary.key === 'checking' ? 'bg-amber-500 animate-pulse' :
          ['conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key) ? 'bg-[#ba1a1a] dark:bg-[#ffb4ab]' :
          'bg-m3-outline'
        }`;

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
                <button
                  id="checkout-feedback-btn"
                  onClick={handleConnectGoogle}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-surface-container-low transition-colors duration-150 rounded-full px-2.5 py-0.5 border border-m3-outline-variant/30 min-w-0 cursor-pointer"
                  data-sync-summary={summary.key}
                  title="Connect Google Sync"
                >
                  <span className={dotClass} />
                  <span className="truncate">{syncLabel}</span>
                </button>
              ) : (
                <div
                  id="checkout-feedback"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-m3-on-surface-variant rounded-full px-2.5 py-0.5 border border-m3-outline-variant/30 min-w-0"
                  data-sync-summary={summary.key}
                >
                  <span className={dotClass} />
                  <span className="truncate">{syncLabel}</span>
                </div>
              )}
            </div>

            <span className="text-[15px] font-semibold text-m3-on-surface text-right">${activeBalance.toFixed(2)}</span>
          </div>
        );
      })()}

      {/* Navigation bar: mobile bottom fixed, desktop below header (static flow) */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-20 z-40 md:static flex border-t border-m3-outline-variant/30 bg-m3-surface-container w-full"
        aria-label="App sections"
      >
        <div className="max-w-[60rem] mx-auto w-full flex h-full">
          <button
            id="nav-list"
            onClick={() => {
              setActivePanel('list');
              setPreviousPrimaryPanel('list');
            }}
            className="flex-1 flex flex-col items-center justify-center h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-xl transition-all ${
              activePanel === 'list'
                ? 'bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/20 shadow-sm'
                : 'text-m3-on-surface-variant hover:bg-m3-surface-container-low'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <span className={`text-[11px] font-bold mt-1 tracking-wide transition-all ${
              activePanel === 'list' ? 'text-m3-on-surface' : 'text-m3-on-surface-variant'
            }`}>
              Cards
            </span>
          </button>
          <button
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
            className="flex-1 flex flex-col items-center justify-center h-full disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-xl transition-all ${
              activePanel === 'detail'
                ? 'bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/20 shadow-sm'
                : 'text-m3-on-surface-variant hover:bg-m3-surface-container-low'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14M9 5v14M13 5v14M17 5v14M20 5v14" />
              </svg>
            </div>
            <span className={`text-[11px] font-bold mt-1 tracking-wide transition-all ${
              activePanel === 'detail' ? 'text-m3-on-surface' : 'text-m3-on-surface-variant'
            }`}>
              Checkout
            </span>
          </button>
        </div>
      </nav>

      <div 
        className="bg-m3-surface flex flex-col items-center px-0 sm:px-4 pb-24 md:pb-12 antialiased font-sans relative"
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        <div className="w-full bg-m3-surface overflow-hidden transition-all duration-300 max-w-[60rem]">
          {activePanel === 'list' ? (
            <main className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-panel-enter">
              
              {/* Cards Inventory Ledger */}
              <section className="flex flex-col gap-3">

                <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
                  {cards.length === 0 ? (
                    <div className="md:col-span-2 text-center py-10 px-6 bg-m3-surface-container-low border border-dashed border-m3-outline-variant rounded-xl flex flex-col items-center gap-4">
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
                    </div>
                  ) : visibleIndexes.length === 0 ? (
                    <div className="md:col-span-2 text-center py-10 px-6 bg-m3-surface-container-low border border-dashed border-m3-outline-variant rounded-xl flex flex-col items-center gap-4">
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
                    </div>
                  ) : (
                    visibleIndexes.map((cardIndex) => {
                      const card = cards[cardIndex];
                      const isSelected = selectedCardIndex === cardIndex;
                      return (
                        <div
                          key={card.cardNumber}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedCardIndex(cardIndex);
                            setActivePanel('detail');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedCardIndex(cardIndex);
                              setActivePanel('detail');
                            }
                          }}
                          className={`flex items-center justify-between py-2 px-4 rounded-xl border transition-all gap-4 cursor-pointer h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary ${
                            isSelected
                              ? 'border-m3-outline-variant/30 bg-m3-surface-container-high text-m3-on-surface'
                              : card.used
                                ? 'border-m3-outline-variant/10 bg-m3-surface-container-low/40 text-m3-on-surface-variant hover:bg-m3-surface-container hover:border-m3-outline-variant/20'
                                : 'border-m3-outline-variant/15 bg-m3-surface-container-lowest text-m3-on-surface hover:bg-m3-surface-container-low hover:border-m3-outline-variant/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${card.used ? 'line-through decoration-m3-on-surface-variant/60' : ''}`}>
                              {maskCardNumber(card.cardNumber)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {card.used && (
                              <span className="text-[9px] font-medium bg-m3-surface-container-low text-m3-on-surface-variant px-1.5 py-0.5 rounded border border-m3-outline-variant/20 uppercase tracking-wider">
                                Used
                              </span>
                            )}
                            <span className="text-sm font-medium tabular-nums">
                              ${card.currentBalance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </main>
           ) : activePanel === 'settings' ? (
              <main className="p-3 pb-28 md:pb-16 flex flex-col gap-3 animate-panel-enter">

                {/* Local Settings / Filtering Controls */}
                <section className="bg-m3-surface-container-low border border-m3-outline-variant/20 rounded-xl p-3 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider px-2 py-1">Preferences</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Sort Order</span>
                      <select
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
                      </select>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Appearance</span>
                      <select
                        value={settings.themeMode || "system"}
                        onChange={handleThemeModeChange}
                        className="text-sm font-medium border border-m3-outline-variant/60 rounded-lg py-1 px-2 bg-m3-surface text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary cursor-pointer text-center [text-align-last:center]"
                      >
                        <option value="system">System (Auto)</option>
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                      </select>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <div className="flex flex-col text-left">
                        <span>Checkout auto-dark</span>
                        <span className="text-[10px] text-m3-on-surface-variant font-normal">Overrides Appearance on Checkout</span>
                      </div>
                      <div className="relative w-[44px] h-[26px] shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.checkoutDark}
                          onChange={() => handleToggleSetting('checkoutDark')}
                          className="sr-only peer"
                        />
                        <div className="w-full h-full bg-m3-outline-variant/30 border border-m3-outline rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-m3-primary peer-focus-visible:ring-offset-2 peer-checked:bg-m3-primary peer-checked:border-m3-primary"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 left-[4px] w-[14px] h-[14px] bg-m3-outline rounded-full transition-all duration-200 peer-checked:translate-x-[18px] peer-checked:w-[20px] peer-checked:h-[20px] peer-checked:bg-m3-on-primary peer-checked:left-[3px]"></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Hide Used Cards</span>
                      <div className="relative w-[44px] h-[26px] shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.hideUsedCards}
                          onChange={() => handleToggleSetting('hideUsedCards')}
                          className="sr-only peer"
                        />
                        <div className="w-full h-full bg-m3-outline-variant/30 border border-m3-outline rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-m3-primary peer-focus-visible:ring-offset-2 peer-checked:bg-m3-primary peer-checked:border-m3-primary"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 left-[4px] w-[14px] h-[14px] bg-m3-outline rounded-full transition-all duration-200 peer-checked:translate-x-[18px] peer-checked:w-[20px] peer-checked:h-[20px] peer-checked:bg-m3-on-primary peer-checked:left-[3px]"></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Hide $0 Cards</span>
                      <div className="relative w-[44px] h-[26px] shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.hideZeroBalanceCards}
                          onChange={() => handleToggleSetting('hideZeroBalanceCards')}
                          className="sr-only peer"
                        />
                        <div className="w-full h-full bg-m3-outline-variant/30 border border-m3-outline rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-m3-primary peer-focus-visible:ring-offset-2 peer-checked:bg-m3-primary peer-checked:border-m3-primary"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 left-[4px] w-[14px] h-[14px] bg-m3-outline rounded-full transition-all duration-200 peer-checked:translate-x-[18px] peer-checked:w-[20px] peer-checked:h-[20px] peer-checked:bg-m3-on-primary peer-checked:left-[3px]"></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
                      <span>Auto-Advance</span>
                      <div className="relative w-[44px] h-[26px] shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.advanceOnMarkUsed}
                          onChange={() => handleToggleSetting('advanceOnMarkUsed')}
                          className="sr-only peer"
                        />
                        <div className="w-full h-full bg-m3-outline-variant/30 border border-m3-outline rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-m3-primary peer-focus-visible:ring-offset-2 peer-checked:bg-m3-primary peer-checked:border-m3-primary"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 left-[4px] w-[14px] h-[14px] bg-m3-outline rounded-full transition-all duration-200 peer-checked:translate-x-[18px] peer-checked:w-[20px] peer-checked:h-[20px] peer-checked:bg-m3-on-primary peer-checked:left-[3px]"></div>
                      </div>
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
                </section>

                {/* Google Sync Connection Panel */}
                <section className="bg-m3-surface-container-low border border-m3-outline-variant/20 rounded-xl p-3 flex flex-col gap-2">
                  {oauthState.status === googleOAuthStatuses.connected ? (
                    <details
                      className="group"
                      open={isGoogleSyncOpen}
                      onToggle={(e) => setIsGoogleSyncOpen(e.target.open)}
                    >
                      <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
                        <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Google Sync</h3>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const summary = getAppSyncSummaryState();
                            let syncLabel = "";
                            if (summary.key === 'connected') {
                              syncLabel = "Google sync on";
                            } else if (summary.key === 'checking') {
                              syncLabel = "Syncing…";
                            } else if (['conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key)) {
                              syncLabel = "Sync issue";
                            } else {
                              syncLabel = "Local only · Connect";
                            }
                            return (
                              <span className="text-xs font-medium text-m3-on-surface-variant">
                                {syncLabel}
                              </span>
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
                              label="Fix Sheet"
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
                              onClick={() => {
                                if (window.confirm("Warning: Exporting to Google will replace all gift card rows in your Google Sheet with your current local browser session. Do you want to proceed?")) {
                                  handleSaveCardsToSheet();
                                }
                              }}
                              icon="upload"
                              label="Export Sheet"
                              className={!directSheetsState.spreadsheetUrl ? "col-span-2" : ""}
                              compact
                            />
                          </div>

                          {/* Conflict / Unsynced Recovery Panel */}
                          {(() => {
                            const unavailableMessage = getRecoveryUnavailableMessage();
                            const isBusy = [directSheetsStatuses.checking, directSheetsStatuses.syncing].includes(directSheetsState.status);
                            const disableSheetsActions = Boolean(isBusy || unavailableMessage);

                            if (syncState.status === syncStatuses.conflict) {
                              return (
                                <div id="sync-recovery-actions" className="flex flex-col gap-2 p-2.5 bg-m3-error-container text-m3-on-surface border border-m3-error/20 rounded-lg text-xs mt-1.5 mx-2">
                                  <h4 className="font-medium text-m3-error text-xs">Conflict recovery</h4>
                                  <p>Sheets changed since your last successful load or sync. Your current session is still saved locally, and Walmart-GC will not merge or overwrite anything automatically.</p>
                                  <p className="font-medium text-m3-error">Warning: using the current session will replace every card row in Sheets. Download a CSV backup before any destructive recovery action.</p>
                                  {unavailableMessage && <p className="font-medium text-m3-error mt-1">{unavailableMessage}</p>}
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    <button
                                      onClick={downloadSessionCsvBackup}
                                      className="bg-m3-surface-container-lowest hover:bg-m3-surface-container text-m3-on-surface font-medium py-1.5 px-3 rounded-lg border border-m3-outline-variant/30 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px] text-xs"
                                      type="button"
                                    >
                                      Download backup CSV
                                    </button>
                                    <button
                                      onClick={handleLoadCardsFromSheet}
                                      disabled={disableSheetsActions}
                                      className="bg-m3-surface-container-lowest hover:bg-m3-surface-container text-m3-on-surface font-medium py-1.5 px-3 rounded-lg border border-m3-outline-variant/30 shadow-sm disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px] text-xs"
                                      type="button"
                                    >
                                      Replace local data from Sheet
                                    </button>
                                    <button
                                      onClick={useCurrentSessionToOverwriteDirectSheets}
                                      disabled={disableSheetsActions}
                                      className="bg-m3-error hover:bg-m3-error/90 text-m3-on-primary font-medium py-1.5 px-3 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-error focus-visible:ring-offset-2 min-h-[38px] text-xs"
                                      type="button"
                                    >
                                      Overwrite sheet with this session
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            if (syncState.status === syncStatuses.unsynced) {
                              return (
                                <div id="sync-recovery-actions" className="flex flex-col gap-2 p-2.5 bg-m3-warning-container text-m3-on-warning-container border border-m3-outline-variant/30 rounded-lg text-xs mt-1.5 mx-2">
                                  <h4 className="font-medium text-m3-on-warning-container text-xs">Unsynced recovery</h4>
                                  <p>Local changes are saved in this browser, but they have not been confirmed in Sheets yet. You can keep using the app offline and choose when to retry or reload.</p>
                                  <p>Replace local data from Sheet overwrites this browser session with the Sheet only after you press the button. Download a backup CSV first if you want a copy of the current session.</p>
                                  {unavailableMessage && <p className="font-medium text-m3-error mt-1">{unavailableMessage}</p>}
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    <button
                                      onClick={retrySyncCurrentSession}
                                      disabled={disableSheetsActions}
                                      className="bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary font-medium py-1.5 px-3 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px] text-xs"
                                      type="button"
                                    >
                                      Try sync again
                                    </button>
                                    <button
                                      onClick={handleLoadCardsFromSheet}
                                      disabled={disableSheetsActions}
                                      className="bg-m3-surface-container-lowest hover:bg-m3-surface-container text-m3-on-surface font-medium py-1.5 px-3 rounded-lg border border-m3-outline-variant/30 shadow-sm disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px] text-xs"
                                      type="button"
                                    >
                                      Replace local data from Sheet
                                    </button>
                                    <button
                                      onClick={downloadSessionCsvBackup}
                                      className="bg-m3-surface-container-lowest hover:bg-m3-surface-container text-m3-on-surface font-medium py-1.5 px-3 rounded-lg border border-m3-outline-variant/30 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px] text-xs"
                                      type="button"
                                    >
                                      Download backup CSV
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>
                    </details>
                  ) : (
                    <div className="flex flex-col gap-2 w-full px-2 py-1">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Google Sync</h3>
                          {(() => {
                            const summary = getAppSyncSummaryState();
                            let syncLabel = "";
                            if (summary.key === 'checking') {
                              syncLabel = "Syncing…";
                            } else if (['conflict', 'unavailable', 'unsynced', 'error'].includes(summary.key)) {
                              syncLabel = "Sync issue";
                            } else {
                              syncLabel = "Local only · Connect";
                            }
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
                </section>

                {/* Data Panel / Backup Controls */}
                <section className="bg-m3-surface-container-low border border-m3-outline-variant/20 rounded-xl p-3 flex flex-col gap-2">
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
                            if (window.confirm("Warning: Importing a CSV will load cards into the editor, which can overwrite or modify your current local session. Do you want to proceed?")) {
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
                          onClick={handleExportCsv}
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
                </section>

                {/* Troubleshooting (Unified Container) */}
                <section className="bg-m3-surface-container-low border border-m3-outline-variant/20 rounded-xl p-3 flex flex-col gap-2">
                  <details className="group">
                    <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
                      <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Troubleshooting</span>
                      <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-m3-outline-variant/20 px-2 pb-1">
                      <div className="border border-m3-outline-variant/20 bg-m3-surface-container rounded-xl p-2.5 flex flex-col gap-2">
                        <h4 className="text-xs font-medium text-m3-on-surface uppercase mb-0.5">System Status</h4>
                        <ul className="text-xs text-m3-on-surface-variant font-medium list-none flex flex-col gap-1.5">
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Google Account</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {oauthState.status === googleOAuthStatuses.connected ? "Connected" : "Disconnected"}
                            </span>
                          </li>
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Sync Status</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {(() => {
                                const summary = getAppSyncSummaryState();
                                if (summary.key === 'connected') return "Sync on";
                                if (summary.key === 'checking') return "Syncing…";
                                if (summary.key === 'local-only') return "Local only";
                                return "Issue";
                              })()}
                            </span>
                          </li>
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Pending Changes</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced) ? "Yes" : "No"}
                            </span>
                          </li>
                          <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                            <span>Last Sync</span>
                            <span className="text-[10px] text-m3-on-surface font-medium">
                              {directSheetsState.lastSuccessfulSyncAt || "No sync yet"}
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
                      </div>
                    </div>
                  </details>
                </section>

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
                        <textarea
                          value={newNotesValue}
                          onChange={e => setNewNotesValue(e.target.value)}
                          className="w-full text-sm bg-m3-surface border border-m3-outline-variant hover:border-m3-outline focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3.5 focus:outline-none transition-all duration-200 min-h-[80px]"
                          placeholder="Add card notes..."
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
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
                <div className="text-center py-12 text-m3-on-surface-variant font-semibold bg-m3-surface-container border border-dashed border-m3-outline-variant rounded-3xl w-full">
                  No card selected. Select a card from the inventory list first.
                </div>
              )}
            </main>
          )}
        </div>
      </div>



      {/* Update Balance Modal */}
      {isEditingBalance && selectedCard && (
        <div
          id="balance-modal"
          className="fixed inset-0 bg-m3-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-m3-surface rounded-3xl max-w-sm w-full p-6 flex flex-col gap-4 shadow-2xl relative border border-m3-outline-variant/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="balance-modal-title"
          >
            {/* Close Button */}
            <Button
              onClick={handleCancelBalanceEdit}
              variant="text"
              density="compact"
              className="absolute top-2 right-2 w-12 h-12 text-lg"
              aria-label="Close update balance modal"
            >
              ✕
            </Button>

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
                <input
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
                <input
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
          </div>
        </div>
      )}

      {/* Raw CSV Editor Modal */}
      {isRawDataModalOpen && (
        <div 
          id="raw-data-modal" 
          className="fixed inset-0 bg-m3-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            className="bg-m3-surface rounded-3xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl relative border border-m3-outline-variant/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="raw-data-modal-title"
          >
            <h2 id="raw-data-modal-title" className="text-lg font-bold text-m3-on-surface border-b border-m3-outline-variant/20 pb-2">
              Raw CSV editor
            </h2>

            <div className="flex flex-col gap-2">
              <label htmlFor="raw-data-input" className="text-xs font-bold text-m3-outline uppercase">
                Raw CSV card data
              </label>
              <textarea
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
            <div className="border border-m3-outline-variant/30 bg-m3-surface-container-low rounded-xl p-4 flex flex-col gap-2 max-h-36 overflow-y-auto">
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
            </div>

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
          </div>
        </div>
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
