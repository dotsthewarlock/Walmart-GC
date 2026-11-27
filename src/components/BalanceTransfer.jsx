import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { profileOf, inventoryContext, assertInventoryContext } from "../lib/inventory";
import {
  checkerUrl, formatTransferRequest, parseTransferResults, previewTransferResults,
  transferRequestRows,
} from "../lib/balanceTransfer";
import { prepareTransferApplication } from "../lib/balanceTransferLedger";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { TextArea } from "./primitives/TextArea";
import {openVerificationSession,assertVerificationSession} from '../features/verification/verificationCommands';
import {sendCompanion} from '../lib/companionTransport';

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

function savedBatch(state) {
  if (!state) return {};
  const profile = profileOf(state);
  return profile.ledgerRecovery
    ? { error: "A damaged or interrupted legacy Batch was preserved for recovery." }
    : { ledger: profile.ledger };
}

function formatNet(cents) {
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "−" : cents > 0n ? "+" : ""}$${(absolute / 100n).toLocaleString("en-CA")}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function BalanceTransfer({ cards, copyText, maskCardNumber, getTransferWallet, walletSnapshot, readWallet, commitWallet, session: ui }) {
  const {packet,setPacket,preview,setPreview,transfer,setTransfer}=ui;
  const [batch,setBatch]=useState(()=>savedBatch(walletSnapshot));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const {busy,setBusy}=ui;
  const locked = useRef(false);
  const mounted = useRef(false);
  const previousPreview = useRef(preview);
  const previewHeading = useRef(null);
  const messageRegion = useRef(null);
  const ledger = batch.ledger;
  const pending = ledger?.requests.filter(({ state }) => state === "pending").length ?? 0;
  const invalidated = ledger?.requests.filter(({ state }) => state === "invalidated").length ?? 0;


  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { setBatch(savedBatch(walletSnapshot)); }, [walletSnapshot]);


  useEffect(() => {
    if (preview && preview !== previousPreview.current) {
      previewHeading.current?.focus({ preventScroll: true });
      previewHeading.current?.scrollIntoView({ block: "start" });
    }
    previousPreview.current = preview;
  }, [preview]);

  async function run(action) {
    if (locked.current) return;
    locked.current = true;
    const trigger = document.activeElement;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mounted.current) await action();
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        try { setBatch(savedBatch(await readWallet())); } catch (failure) { setError(failure.message); }
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) (trigger?.isConnected ? trigger : messageRegion.current)?.focus();
        });
      }
    }
  }

  function ensureMounted() {
    if (!mounted.current) throw new Error("Batch was closed.");
  }

  const sessionOptions=()=>({walletSnapshot,readWallet,commitWallet,getTransferWallet,assertActive:ensureMounted});
  const verifiedSession=()=>openVerificationSession(sessionOptions());
  const assertSession=session=>assertVerificationSession(session,sessionOptions());

  async function copyRequest() {
    const session = await verifiedSession();
    if (!session.ledger) throw new Error("Create a batch before copying a request.");
    if(!ui.selection?.refs)throw Error('Prepare selected cards before copying a request.');
    const rows = transferRequestRows(session.ledger, session.previewCards, ui.selection.refs);
    await assertSession(session);
    const copied = await copyText(formatTransferRequest(rows));
    if (!mounted.current) return;
    if (!copied) throw new Error("Clipboard access failed. Try Copy selected cards again.");
    setMessage(`Copied ${rows.length} requests. Paste them into the Companion.`);
  }

  async function sendRequest() {
    const session=await verifiedSession();
    if(!session.ledger)throw Error('Select cards before sending a request.');
    if(!ui.selection?.refs)throw Error('Prepare selected cards before sending a request.');
    const rows=transferRequestRows(session.ledger,session.previewCards,ui.selection.refs);
    const sessionId=crypto.randomUUID();
    const target={sessionId,context:inventoryContext(session.state)};
    // Keep the correlation even if delivery is uncertain; cancel before resending.
    setTransfer(target);
    await assertSession(session);
    await sendCompanion({type:'wallet-transfer-request',version:1,sessionId,packet:formatTransferRequest(rows)});
    await assertSession(session);
    setMessage('Request sent. Open the Walmart checker, receive Wallet cards in the extension, then explicitly start checking.');
  }

  async function receiveResults() {
    const target=transfer;
    assertInventoryContext(await readWallet(),target.context);
    const reply=await sendCompanion({type:'wallet-transfer-results',version:1,sessionId:target.sessionId});
    assertInventoryContext(await readWallet(),target.context);
    if(!reply.packet){setMessage('No results returned yet. Existing requests remain saved.');return;}
    const results=parseTransferResults(reply.packet);
    const session=await verifiedSession();
    assertInventoryContext(session.state,target.context);
    setPreview(buildPreview(session,results));
    setMessage('Companion observations received. Review before applying.');
  }

  async function cancelTransfer() {
    try{await sendCompanion({type:'wallet-transfer-cancel',version:1,sessionId:transfer.sessionId});}
    finally{setTransfer(null);setMessage('Transfer ended. Saved requests and observations remain available for fallback.');}
  }

  async function discardBatch() {
    const displayed = walletSnapshot;
    if (!window.confirm("Discard this Batch and its outstanding request references? Saved cards and archived recovery evidence will be preserved.")) return;
    await commitWallet({ kind: "discard-batch", ...inventoryContext(displayed), revision: profileOf(displayed).revision });
    setPreview(null);
    setPacket("");
    setMessage("Batch discarded. Recovery evidence remains preserved.");
  }

  function buildPreview(session, results) {
    if (!session.ledger) throw new Error("There is no saved request for these results. Create a new batch.");
    if (session.ledger.application) throw new Error("Resolve the interrupted application first.");
    const now = Date.now();
    return { ...previewTransferResults(session.ledger, session.previewCards, results, now,session.profile.recoveryEvidence),
      context: inventoryContext(session.state), results, now, ledgerRaw: JSON.stringify(session.ledger), inventoryRaw: session.inventoryRaw };
  }

  async function importResults() {
    const results = parseTransferResults(packet);
    const session = await verifiedSession();
    setPreview(buildPreview(session, results));
    setPacket("");
  }

  async function applyResults() {
    const prior = preview;
    if (!prior?.counts.accepted) return;
    assertInventoryContext(await readWallet(), prior.context);
    const session = await verifiedSession();
    const fresh = buildPreview(session, prior.results);
    if (prior.ledgerRaw !== fresh.ledgerRaw || prior.inventoryRaw !== fresh.inventoryRaw
        || JSON.stringify(prior.items) !== JSON.stringify(fresh.items)) {
      setPreview(fresh);
      setMessage("The preview changed. Review the updated results before applying.");
      return;
    }
    const accepted = fresh.items.filter(item => item.outcome === "accepted");
    const prepared = await prepareTransferApplication(session.ledger, fresh.candidate, accepted);
    await commitWallet({ kind: "apply-batch", ...inventoryContext(session.state), revision: session.profile.revision,
      ledgerId: session.ledger.id, observations: fresh.results, items: fresh.items, now: fresh.now,
      inventoryDigest: prepared.finalized.inventoryDigest });
    const queue=ui.selection?.queue??[];
    const selected=new Set(queue.map(entry=>entry.snapshot.cardNumber));
    ui.setManual(current=>{
      const completed=[...new Set([...(current.completed??[]),...accepted.map(item=>item.cardNumber).filter(number=>selected.has(number))])];
      let position=current.position;
      while(queue[position]&&completed.includes(queue[position].snapshot.cardNumber))position++;
      return {...current,completed,saved:completed.length,position,amount:position!==current.position?'':current.amount};
    });
    setPreview(null);
    setMessage(`Applied ${accepted.length} locally (${fresh.counts.changed} balances changed, ${fresh.counts.unchanged} unchanged). Verification dates were recorded. ${fresh.outstanding - accepted.length} requests remain outstanding. Sheet synchronization is pending confirmation.`);
  }

  const recovering = Boolean(batch.error || ledger?.application);
  return (
    <>
      {recovering&&<Card as="section" className="p-4"><p role="alert">{batch.error||'A previous apply was interrupted.'}</p><Button disabled={busy} onClick={()=>run(discardBatch)}>Discard batch</Button></Card>}

      {ledger && !recovering && (
        <>
          <Card as="section" aria-labelledby="active-batch-heading" className="flex flex-col gap-3 p-4">
            <h3 id="active-batch-heading" tabIndex={-1} className="font-semibold">Saved requests</h3>
            <p className="text-sm text-m3-on-surface-variant" role="status">
              {pending} outstanding · {invalidated} invalidated · {ledger.requests.length - pending - invalidated} applied
            </p>
            {pending > 0 && (
              <>
                <p className="text-sm text-m3-on-surface-variant">The copied request contains card numbers and PINs. Clear your clipboard and clipboard history after use.</p>
                <Button disabled={busy||!ui.selection?.refs} onClick={() => run(copyRequest)}>Copy selected cards</Button>
                <Button disabled={busy||!ui.selection?.refs||Boolean(transfer)} onClick={()=>run(sendRequest)}>Send to Companion</Button>
                <Button variant="outlined" href={checkerUrl} target="_blank" rel="noopener noreferrer"
                  aria-label="Open Walmart checker (opens in a new tab)">Open Walmart checker <ArrowUpRight size={16} aria-hidden="true" /></Button>
              </>
            )}
          </Card>

          <Card as="section" aria-labelledby="import-results-heading" className="flex flex-col gap-3 p-4">
            <h3 id="import-results-heading" className="font-semibold">Import results</h3>
            <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); run(importResults); }}>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Paste results
                <TextArea value={packet} onChange={(event) => { setPacket(event.target.value); setPreview(null); }}
                  disabled={busy} spellCheck={false} autoComplete="off" autoCapitalize="off" />
              </label>
              <Button variant="tonal" type="submit" disabled={busy || !packet.trim()}>Preview results</Button>
            </form>
          </Card>
        </>
      )}

      {transfer&&<Card as="section" className="flex flex-col gap-3 p-4" aria-label="Companion transfer">
        <p className="text-sm">Transfer lasts only while this extension worker session remains available. Saved Batch requests support TSV fallback.</p>
        <Button disabled={busy} onClick={()=>run(receiveResults)}>Receive Companion results</Button>
        <Button disabled={busy} variant="outlined" onClick={()=>run(cancelTransfer)}>End transfer</Button>
      </Card>}

      <div className="min-h-5 text-sm">
        <p role="alert" className="text-m3-error">{error}</p>
        <p role="status" className="text-m3-on-surface-variant">{message}</p>
      </div>

      {preview && !recovering && (
        <Card as="section" aria-labelledby="batch-preview-heading" className="flex flex-col gap-3 p-4">
          <h3 id="batch-preview-heading" tabIndex={-1} className="scroll-mt-5 font-semibold focus:outline-m3-primary" ref={previewHeading}>Results preview</h3>
          <p className="text-sm font-medium">
            {preview.counts.accepted} accepted · {preview.counts.changed} changed · {preview.counts.unchanged} unchanged
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {preview.outstanding} outstanding · Net change {formatNet(preview.netCents)} CAD
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {preview.counts.rejected} rejected · {preview.counts.unknown} unknown · {preview.counts.stale} stale
            {" · "}{preview.counts.invalidated} invalidated · {preview.counts.alreadyApplied} already applied
          </p>
          <div className="max-h-80 overflow-y-auto focus-visible:outline-m3-primary" tabIndex={0} role="region" aria-label="Result details">
            <ul className="divide-y divide-m3-outline-variant">
              {preview.items.map((item) => (
                <li key={item.ref} className="space-y-1 py-2 text-sm">
                  <strong>{item.cardNumber ? `Card ${item.position} · ${maskCardNumber(item.cardNumber)}` : "Unknown card"}</strong>
                  <p className="tabular-nums">
                    {item.recorded === undefined ? "" : `${currency.format(item.recorded)} → `}
                    {currency.format(item.balance)} CAD
                  </p>
                  <time dateTime={item.checkedAt} className="block text-m3-on-surface-variant">{item.checkedAt}</time>
                  {item.reason && <p className="text-m3-on-surface-variant">{item.reason}</p>}
                  {item.outcome === "accepted" && item.used && item.balance > 0 && (
                    <p className="rounded-lg bg-m3-warning-container px-2 py-1 text-m3-on-warning-container">
                      Positive balance on a used card. It stays marked used.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Button disabled={busy || !preview.counts.accepted} onClick={() => run(applyResults)}>Apply accepted results</Button>
        </Card>
      )}
    </>
  );
}
