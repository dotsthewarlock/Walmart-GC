import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Copy } from "lucide-react";
import { parseVerifiedBalance } from "../lib/balanceReview";
import { profileOf, inventoryContext, inventoryBytes } from "../lib/inventory";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { TextField } from "./primitives/TextField";
import { BalanceTransfer } from "./BalanceTransfer";
import { checkerUrl, selectTransferCards } from "../lib/balanceTransfer";
import {createTransferLedger} from '../lib/balanceTransferLedger';
import {openVerificationSession} from '../features/verification/verificationCommands';
import {VerificationSelection} from '../features/verification/VerificationSelection';
import { verificationCards } from '../lib/inventoryRecovery';

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export function BalanceReview({ onExit, session, ...props }) {
  const {mode,setMode,selection,setSelection,setManual,busy,setBusy}=session;
  const [error,setError]=useState('');
  const selecting=useRef(false);
  const counts=selectTransferCards(verificationCards(profileOf(props.walletSnapshot)),{...session.preferences,flaggedOnly:session.flaggedOnly});
  function capture(state,selected){return {id:crypto.randomUUID(),queue:selected,versions:{...profileOf(state).versions},context:inventoryContext(state)};}
  useEffect(()=>{if(!selection)setSelection(capture(props.walletSnapshot,counts.selected));},[selection]);
  async function select(){
    if(selecting.current||busy)return;selecting.current=true;setBusy(true);setError('');
    try{
      const {state,profile,context}=await openVerificationSession(props);
      const selected=selectTransferCards(verificationCards(profile),{...session.preferences,flaggedOnly:session.flaggedOnly}).selected;
      const ledger=await createTransferLedger(context,selected,inventoryBytes(state),undefined,profile.ledger?.id);
      await props.commitWallet({kind:'set-batch',...inventoryContext(state),revision:profile.revision,ledger});
      setSelection(capture(state,selected));setManual({position:0,saved:0,amount:'',completed:[]});session.setPreview(null);
    }catch(e){setError(e.message);}finally{selecting.current=false;setBusy(false);}
  }
  return (
    <main className="min-h-screen bg-m3-surface text-m3-on-surface">
      <header className="border-b border-m3-outline-variant/40 bg-m3-surface-container">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <h1 className="text-lg font-semibold">Review balances</h1>
          <Button variant="text" disabled={busy} onClick={onExit}>Exit</Button>
        </div>
      </header>
      <div role="group" aria-label="Review mode" className="mx-auto grid w-full max-w-xl grid-cols-2 gap-2 px-4 pt-4 sm:px-6">
        <Button disabled={busy} variant={mode === "manual" ? "tonal" : "outlined"} aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}>Manual</Button>
        <Button disabled={busy} variant={mode === "batch" ? "tonal" : "outlined"} aria-pressed={mode === "batch"}
          onClick={() => setMode("batch")}>Companion / Batch</Button>
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5 sm:px-6">
        <VerificationSelection session={session} selectionCounts={counts} busy={busy} onSelect={select}/>
        <p role="alert" className="text-sm text-m3-error">{error}</p>
        {selection&&<p className="text-sm" role="status">Working selection: {selection.queue.length} cards · {session.manual.saved} verified</p>}
        <div hidden={mode!=='manual'}>{selection&&<ManualBalanceReview key={selection.id} {...props} session={session}/>}</div>
        <div hidden={mode!=='batch'}><BalanceTransfer {...props} session={session}/></div>
      </div>
    </main>
  );
}

function ManualBalanceReview({ commitWallet, copyText, maskCardNumber, session }) {
  const {selection,manual,setManual,setBusy}=session;
  const {queue,versions:initialVersions,context:initialContext}=selection;
  const {position,saved,amount}=manual;
  const setAmount=value=>setManual(m=>({...m,amount:value}));
  const [inputError, setInputError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const cursor = useRef(position);
  cursor.current=position;
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
    while(queue[cursor.current]&&manual.completed?.includes(queue[cursor.current].snapshot.cardNumber))cursor.current++;
    setManual(m=>({...m,position:cursor.current,amount:''}));
    setInputError("");
    setSaveError("");
    setCopyMessage("");
    pendingObservation.current = null;
  }

  async function saveObservation(value, fromInput = false) {
    if (saving.current || session.busy || cursor.current !== position || !card) return;
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
    setBusy(true);
    try {
      await commitWallet({ kind: "manual-verification", ...initialContext,
        cardNumber: card.cardNumber, version: initialVersions[card.cardNumber],
        observation: { observedBalance: verifiedBalance, checkedAt: pendingObservation.current.checkedAt.toISOString() } });
      setManual(m=>({...m,saved:m.saved+1,completed:[...(m.completed??[]),card.cardNumber]}));
      advance();
    } catch (error) {
      setSaveError(error.message);
    } finally { saving.current = false; setBusy(false); }
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
                  if (!session.busy && event.detail < 2 && cursor.current === position) advance();
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
