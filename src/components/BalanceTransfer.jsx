import React, {useEffect,useRef} from "react";
import {ArrowUpRight} from "lucide-react";
import {profileOf} from "../lib/inventory";
import {checkerUrl} from "../lib/balanceTransfer";
import {Button} from "./primitives/Button";
import {Card} from "./primitives/Card";
import {TextArea} from "./primitives/TextArea";

const currency=new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"});
function formatNet(cents){
 const absolute=cents<0n?-cents:cents;
 return `${cents<0n?"−":cents>0n?"+":""}$${(absolute/100n).toLocaleString("en-CA")}.${String(absolute%100n).padStart(2,"0")}`;
}
export function BalanceTransfer({maskCardNumber,walletSnapshot,session:ui}){
 const {packet,setPacket,preview,transfer,busy,sendRequest,receiveResults,
  cancelTransfer,discardBatch,importResults,applyResults}=ui;
 const {batchError:error,batchMessage:message}=ui.feedback;
 const profile=profileOf(walletSnapshot);
 const batch=profile.ledgerRecovery?{error:"A damaged or interrupted legacy Batch was preserved for recovery."}:{ledger:profile.ledger};
 const ledger=batch.ledger;
 const pending=ledger?.requests.filter(({state})=>state==="pending").length??0;
 const invalidated=ledger?.requests.filter(({state})=>state==="invalidated").length??0;
 const previousPreview=useRef(preview),previewHeading=useRef(null);
 useEffect(()=>{
  if(preview&&preview!==previousPreview.current){previewHeading.current?.focus({preventScroll:true});previewHeading.current?.scrollIntoView({block:"start"});}
  previousPreview.current=preview;
 },[preview]);
 function run(action){
  const trigger=document.activeElement,selectionId=ui.selection?.id;
  void action().then(()=>requestAnimationFrame(()=>{
   if(ui.getSnapshot().selection?.id===selectionId&&!ui.getSnapshot().busy&&trigger?.isConnected&&document.activeElement===document.body){
    trigger.focus({preventScroll:true});
   }
  }));
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
                <Button disabled={busy||!ui.selection?.refs} onClick={()=>run(ui.copyRequest)}>Copy selected cards</Button>
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
                <TextArea value={packet} onChange={(event) => { setPacket(event.target.value); }}
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
