import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Copy } from "lucide-react";
import { createBalanceReviewQueue, parseVerifiedBalance } from "../lib/balanceReview";
import { profileOf, inventoryContext } from "../lib/inventory";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { TextField } from "./primitives/TextField";
import { BalanceTransfer } from "./BalanceTransfer";
import { checkerUrl } from "../lib/balanceTransfer";
import { verificationCards } from '../lib/inventoryRecovery';

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export function BalanceReview({ onExit, ...props }) {
  const [mode, setMode] = useState("manual");
  const [flaggedOnly,setFlaggedOnly] = useState(props.initialFlaggedOnly === true);
  return (
    <main className="min-h-screen bg-m3-surface text-m3-on-surface">
      <header className="border-b border-m3-outline-variant/40 bg-m3-surface-container">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <h1 className="text-lg font-semibold">Review balances</h1>
          <Button variant="text" onClick={onExit}>Exit</Button>
        </div>
      </header>
      <div role="group" aria-label="Review mode" className="mx-auto grid w-full max-w-xl grid-cols-2 gap-2 px-4 pt-4 sm:px-6">
        <Button variant={mode === "manual" ? "tonal" : "outlined"} aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}>Manual</Button>
        <Button variant={mode === "batch" ? "tonal" : "outlined"} aria-pressed={mode === "batch"}
          onClick={() => setMode("batch")}>Batch</Button>
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div role="group" aria-label="Cards to verify" className="grid grid-cols-2 gap-2">
          <Button variant={!flaggedOnly?'tonal':'outlined'} aria-pressed={!flaggedOnly} onClick={()=>setFlaggedOnly(false)}>All eligible</Button>
          <Button variant={flaggedOnly?'tonal':'outlined'} aria-pressed={flaggedOnly} onClick={()=>setFlaggedOnly(true)}>Flagged only</Button>
        </div>
        {flaggedOnly&&<p className="text-sm">Includes eligible used cards and provisional zero balances. Verification leaves used status unchanged.</p>}
        {mode === "manual" ? <ManualBalanceReview key={String(flaggedOnly)} {...props} flaggedOnly={flaggedOnly} /> : <BalanceTransfer {...props} flaggedOnly={flaggedOnly} />}
      </div>
    </main>
  );
}

function ManualBalanceReview({ cards, walletSnapshot, commitWallet, copyText, maskCardNumber, flaggedOnly }) {
  const [queue] = useState(() => createBalanceReviewQueue(verificationCards(profileOf(walletSnapshot)).filter(card=>!flaggedOnly||card.pendingReconciliation===true)));
  const [initialVersions] = useState(() => ({ ...profileOf(walletSnapshot).versions }));
  const [initialContext] = useState(() => inventoryContext(walletSnapshot));
  const [position, setPosition] = useState(0);
  const [saved, setSaved] = useState(0);
  const [amount, setAmount] = useState("");
  const [inputError, setInputError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const cursor = useRef(0);
  const copyAttempt = useRef(0);
  const saving = useRef(false);
  const pendingObservation = useRef(null);
  const taskHeading = useRef(null);
  const entry = queue[position];
  const card = entry?.snapshot;

  useEffect(() => {
    taskHeading.current?.focus();
  }, [position]);

  function advance() {
    cursor.current += 1;
    setPosition(cursor.current);
    setAmount("");
    setInputError("");
    setSaveError("");
    setCopyMessage("");
    pendingObservation.current = null;
  }

  async function saveObservation(value, fromInput = false) {
    if (saving.current || cursor.current !== position || !card) return;
    let verifiedBalance;
    try {
      verifiedBalance = parseVerifiedBalance(value);
    } catch (error) {
      if (fromInput) setInputError(error.message);
      else setSaveError(error.message);
      return;
    }
    if (pendingObservation.current?.value !== value) {
      pendingObservation.current = { value, checkedAt: new Date() };
    }
    saving.current = true;
    try {
      await commitWallet({ kind: "manual-verification", ...initialContext,
        cardNumber: card.cardNumber, version: initialVersions[card.cardNumber],
        observation: { observedBalance: verifiedBalance, checkedAt: pendingObservation.current.checkedAt.toISOString() } });
      setSaved((count) => count + 1);
      advance();
    } catch (error) {
      setSaveError(error.message);
    } finally { saving.current = false; }
  }

  async function copy(label, value) {
    const attempt = ++copyAttempt.current;
    const trigger = document.activeElement;
    setCopyMessage("");
    let copied = false;
    try {
      copied = await copyText(value);
    } catch {
      // An unavailable clipboard should produce the same feedback as a denied write.
    }
    if (cursor.current !== position || copyAttempt.current !== attempt || !trigger?.isConnected) return;
    if (document.activeElement === document.body) trigger.focus();
    setCopyMessage(copied ? `${label} copied.` : `${label} copy failed. Try again.`);
  }

  return (
    <>
        {queue.length > 0 && (
          <div className="flex flex-col gap-2">
            <p id="review-progress" className="flex justify-between gap-2 text-sm text-m3-on-surface-variant">
              <span>{card ? `Card ${position + 1} of ${queue.length}` : `${queue.length} of ${queue.length} cards visited`}</span>
              <span>{saved} saved</span>
            </p>
            <div role="progressbar" aria-label="Balance review progress" aria-valuenow={position} aria-valuemax={queue.length}
              className="h-1 overflow-hidden rounded-full bg-m3-surface-container-high">
              <div className="h-full bg-m3-primary" style={{ width: `${position / queue.length * 100}%` }} />
            </div>
          </div>
        )}

        {card ? (
          <>
            <Card as="section" aria-labelledby="review-card-heading" className="flex flex-col gap-3 p-4">
              <h2 id="review-card-heading" ref={taskHeading} tabIndex={-1} aria-describedby="review-progress"
                className="text-sm font-semibold tracking-wide text-m3-on-surface-variant">
                {maskCardNumber(card.cardNumber)}
              </h2>
              <div>
                <p className="text-sm text-m3-on-surface-variant">Recorded balance</p>
                <p className="text-3xl font-semibold tabular-nums">{currency.format(card.currentBalance)} <span className="text-sm">CAD</span></p>
              </div>
              <p className="text-sm text-m3-on-surface-variant">
                Last verified {card.lastBalanceChecked ? <time dateTime={card.lastBalanceChecked}>{card.lastBalanceChecked}</time> : "· Never"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="tonal" aria-label="Copy card number" onClick={() => copy("Card number", card.cardNumber)}>
                  <Copy size={16} aria-hidden="true" className="shrink-0 max-[359px]:hidden" /> Copy number
                </Button>
                <Button variant="tonal" onClick={() => copy("PIN", String(card.pin).trim())}>
                  <Copy size={16} aria-hidden="true" className="shrink-0 max-[359px]:hidden" /> Copy PIN
                </Button>
              </div>
              <Button href={checkerUrl} target="_blank" rel="noopener noreferrer" variant="outlined"
                aria-label="Open Walmart Canada balance checker (opens in a new tab)">
                Walmart balance checker <ArrowUpRight size={16} aria-hidden="true" />
              </Button>
              <p role="status" className="min-h-5 text-sm text-m3-on-surface-variant">{copyMessage}</p>
            </Card>

            <form className="flex flex-col gap-3"
              onKeyDown={(event) => { if (event.key === "Enter" && event.repeat) event.preventDefault(); }}
              onSubmit={(event) => { event.preventDefault(); saveObservation(amount, true); }}>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Verified balance (CAD)
                <TextField inputMode="decimal" autoComplete="off" spellCheck={false} value={amount}
                  invalid={Boolean(inputError)} aria-describedby={card.used ? "review-input-error review-used-warning" : "review-input-error"}
                  onChange={(event) => {
                    pendingObservation.current = null;
                    setAmount(event.target.value);
                    setInputError("");
                  }} />
              </label>
              <Button type="submit" onClick={(event) => {
                if (event.detail > 1) event.preventDefault();
              }}>Save &amp; next</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outlined" className="max-[359px]:px-2" onClick={(event) => {
                  if (event.detail < 2) saveObservation(card.currentBalance);
                }}>Confirm unchanged</Button>
                <Button variant="text" onClick={(event) => {
                  if (event.detail < 2 && cursor.current === position) advance();
                }}>Skip</Button>
              </div>
              <div className="min-h-5 text-sm text-m3-error">
                <p id="review-input-error" role="alert">{inputError}</p>
                <p role="alert">{saveError}</p>
              </div>
              {card.used && (
                <p id="review-used-warning" className="rounded-lg bg-m3-warning-container px-3 py-2 text-sm text-m3-on-warning-container">
                  This card is marked used. Saving a positive balance leaves it marked used.
                </p>
              )}
            </form>
          </>
        ) : (
          <Card as="section" className="flex flex-col gap-2 p-4">
            <h2 ref={taskHeading} tabIndex={-1} className="text-lg font-semibold">
              {queue.length ? "Review complete" : "No eligible cards"}
            </h2>
            <p className="text-sm text-m3-on-surface-variant">
              {queue.length ? `${saved} saved · ${position - saved} skipped` : "Add a valid Walmart Canada gift card to review its balance."}
            </p>
          </Card>
        )}
        {queue.length > 0 && (
          <p role="status" className="text-sm text-m3-on-surface-variant">
            {saved ? "Saved on this device." : "Review saves on this device."} Confirmed local saves synchronize when connected. CSV backup is available in Settings.
          </p>
        )}
    </>
  );
}
