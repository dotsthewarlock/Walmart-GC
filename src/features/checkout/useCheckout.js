import { useEffect, useLayoutEffect, useRef, useState } from 'react';

function getCardCode(card) {
  return String(card?.cardNumber ?? "").replace(/\D/g, "");
}

function formatCodePin(card) {
  const code = getCardCode(card);
  const pin = String(card?.pin ?? "").trim();
  return `${code}/${pin}`;
}

export function isDesktopCopyTarget() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

// App-lifetime Checkout workflow; inventory commands and fencing stay with App.
export function useCheckout({ active, selectedCard, contextKey, commands, copyText }) {
  const balanceTarget = useRef(null);
  const notesTarget = useRef(null);
  const copyFeedbackTimer = useRef(null);
  const copyAction = useRef(null);
  const scope = `${contextKey}:${selectedCard?.cardNumber ?? ''}`;
  const currentScope = useRef(scope);
  const [revealNumber, setRevealNumber] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  // Balance Editor Form State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalanceValue, setNewBalanceValue] = useState("");
  const [amountUsedValue, setAmountUsedValue] = useState("");
  const [balanceError, setBalanceError] = useState("");

  const handleCancelBalanceEdit = () => {
    balanceTarget.current = null;
    setIsEditingBalance(false);
  };

  // Notes Editor Form State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newNotesValue, setNewNotesValue] = useState("");
  const handleCancelNotes = () => {
    notesTarget.current = null;
    setIsEditingNotes(false);
  };

  const resetForCardNavigation = () => {
    balanceTarget.current = null;
    notesTarget.current = null;
    copyAction.current = null;
    clearTimeout(copyFeedbackTimer.current);
    copyFeedbackTimer.current = null;
    setCopyFeedback("");
    setRevealNumber(false);
    setIsEditingBalance(false);
    setNewBalanceValue("");
    setAmountUsedValue("");
    setBalanceError("");
    setIsEditingNotes(false);
    setNewNotesValue("");
  };

  // Clear sensitive state before the changed inventory/card can paint. Panel
  // navigation alone keeps the same scope and therefore preserves drafts.
  useLayoutEffect(() => {
    currentScope.current = scope;
    resetForCardNavigation();
  }, [scope]);

  useEffect(() => {
    return () => {
      copyAction.current = null;
      balanceTarget.current = null;
      notesTarget.current = null;
      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
      }
    };
  }, []);

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

  // Release even a late grant after Checkout has been left.
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let disposed = false;
    let lock;
    navigator.wakeLock.request("screen").then(granted => {
      if (disposed) granted.release().catch(() => {});
      else lock = granted;
    }).catch(() => {});
    return () => { disposed = true; lock?.release().catch(() => {}); };
  }, [active]);

  const handleCopyCodePin = async (event, card) => {
    event?.stopPropagation();
    if (!isDesktopCopyTarget()) {
      return false;
    }

    const action = {};
    const target = commands.captureTarget(card);
    clearTimeout(copyFeedbackTimer.current);
    copyFeedbackTimer.current = null;
    setCopyFeedback("");
    copyAction.current = action;
    const isCurrent = () => copyAction.current === action && currentScope.current === scope
      && commands.isContextCurrent(target);
    const copied = await copyText(formatCodePin(card));
    if (!isCurrent()) return copied;
    if (copyFeedbackTimer.current) {
      clearTimeout(copyFeedbackTimer.current);
    }
    setCopyFeedback(copied ? "Code/PIN copied" : "Copy unavailable");
    copyFeedbackTimer.current = setTimeout(() => {
      if (!isCurrent()) return;
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
    balanceTarget.current = commands.captureTarget(selectedCard);
    setNewBalanceValue(currentVal.toString());
    setAmountUsedValue("");
    setBalanceError("");
    setIsEditingBalance(true);
  };

  const handleSaveBalance = async () => {
    const target = balanceTarget.current;
    const isCurrent = () => target && balanceTarget.current === target
      && currentScope.current === scope && commands.isContextCurrent(target);
    const value = Number(newBalanceValue);
    if (!newBalanceValue.trim() || !Number.isFinite(value) || value < 0) {
      setBalanceError("Enter a valid non-negative balance value");
      return;
    }
    try {
      await commands.saveBalance(target, Math.round(value * 100) / 100, isCurrent);
      if (isCurrent()) handleCancelBalanceEdit();
    } catch (error) { if (isCurrent()) setBalanceError(error.message); }
  };

  const handleOpenNotes = () => {
    notesTarget.current = commands.captureTarget(selectedCard);
    setNewNotesValue(selectedCard.notes || "");
    setIsEditingNotes(true);
  };
  const handleSaveNotes = async () => {
    const target = notesTarget.current;
    const isCurrent = () => target && notesTarget.current === target && currentScope.current === scope
      && commands.isContextCurrent(target);
    try {
      await commands.saveNotes(target, newNotesValue.trim(), isCurrent);
      if (isCurrent()) handleCancelNotes();
    } catch { /* App displays the durable save error; keep the draft. */ }
  };
  return {
    revealNumber, setRevealNumber, copyFeedback,
    isEditingBalance, newBalanceValue, amountUsedValue, balanceError,
    isEditingNotes, newNotesValue, setNewNotesValue, handleCancelNotes,
    handleCancelBalanceEdit, handleAmountUsedChange, handleRemainingBalanceChange,
    handleOpenBalanceEdit, handleSaveBalance, handleCopyCodePin,
    handleOpenNotes, handleSaveNotes, resetForCardNavigation,
  };
}
