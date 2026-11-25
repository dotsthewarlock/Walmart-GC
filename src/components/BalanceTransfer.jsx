import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fetchWorkerJson } from "../lib/api";
import { inventoryBytes, profileOf, inventoryContext, assertInventoryContext } from "../lib/inventory";
import {
  checkerUrl, formatTransferRequest, parseTransferResults, previewTransferResults, requireTransferContext,
  sameTransferContext, selectTransferCards, transferRequestRows,
} from "../lib/balanceTransfer";
import { createTransferLedger, inventoryFingerprint, prepareTransferApplication } from "../lib/balanceTransferLedger";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { SelectField } from "./primitives/SelectField";
import { TextArea } from "./primitives/TextArea";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const choices = [
  ["all", "All eligible cards"], ["never", "Never verified"],
  ...[5, 10, 20, 30].map((count) => [String(count), `Next oldest ${count} cards`]),
];

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

export function BalanceTransfer({ cards, copyText, maskCardNumber, getTransferWallet, walletSnapshot, readWallet, commitWallet }) {
  const [selection, setSelection] = useState("all");
  const [includeUsed, setIncludeUsed] = useState(false);
  const [batch, setBatch] = useState(() => savedBatch(walletSnapshot));
  const [packet, setPacket] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(false);
  const heading = useRef(null);
  const previewHeading = useRef(null);
  const messageRegion = useRef(null);
  const ledger = batch.ledger;
  const pending = ledger?.requests.filter(({ state }) => state === "pending").length ?? 0;
  const invalidated = ledger?.requests.filter(({ state }) => state === "invalidated").length ?? 0;
  const selectionCounts = selectTransferCards(cards, selection, includeUsed);

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { setBatch(savedBatch(walletSnapshot)); }, [walletSnapshot]);
  useEffect(() => { setPreview(null); setPacket(""); }, [walletSnapshot.active, walletSnapshot.contextGeneration]);

  useEffect(() => {
    if (preview) {
      previewHeading.current?.focus({ preventScroll: true });
      previewHeading.current?.scrollIntoView({ block: "start" });
    }
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

  async function verifiedSession() {
    getTransferWallet();
    const start = await readWallet();
    assertInventoryContext(start, inventoryContext(walletSnapshot));
    const status = await fetchWorkerJson("/api/status", { cache: "no-store" });
    ensureMounted();
    assertInventoryContext(await readWallet(), inventoryContext(start));
    const state = await commitWallet({ kind: "observe-session", ...inventoryContext(start), status });
    const profile = profileOf(state);
    if (profile.ledgerRecovery) throw new Error("Discard the preserved interrupted Batch before continuing.");
    if(status.syncProtocol&&(!profile.context.ownershipVerified||profile.context.principal!==status.principal))throw new Error("Open the matching verified account inventory before using Batch.");
    const context = requireTransferContext(status, { context: profile.context, remoteBase: profile.remoteBase, sheets: profile.sheets, sync: profile.sync });
    if (profile.context.kind !== "sheet" || profile.context.sheetId !== context.sheetId) throw new Error("Load matching Sheet context before using Batch.");
    const inventoryRaw = inventoryBytes(state);
    if (profile.ledger?.requests.some(r => r.state === "pending")) {
      const invalid = profile.ledger.requests.filter(r=>r.state==='pending').some(r=> !profile.cards.some(c=>c.cardNumber===r.cardNumber));
      const credentialsChanged = (await Promise.all(profile.ledger.requests.filter(r=>r.state==='pending'&&r.relevance).map(async r=>{
        const card=profile.cards.find(c=>c.cardNumber===r.cardNumber);
        return !card || r.relevance.pinDigest!==await inventoryFingerprint(card.pin,profile.ledger.id);
      }))).some(Boolean);
      if(invalid||credentialsChanged||!sameTransferContext(profile.ledger.context,context))throw new Error("Requested credentials or Sheet context changed. Create a new Batch.");
    }
    const session = { state, profile, ledger: profile.ledger, context, inventoryRaw, previewCards: profile.cards };
    await assertSession(session);
    return session;
  }

  async function assertSession(session) {
    ensureMounted();
    getTransferWallet();
    const current = await readWallet();
    assertInventoryContext(current, inventoryContext(session.state));
    if (current.active !== session.state.active || profileOf(current).revision !== session.profile.revision) {
      throw new Error("Inventory or Sheet context changed. Preview again.");
    }
  }

  async function createBatch() {
    const session = await verifiedSession();
    const outstanding = session.ledger?.requests.filter(r => r.state === "pending").length;
    if (outstanding && !window.confirm(`Replace the batch and discard its ${outstanding} outstanding requests?`)) return;
    const { selected } = selectTransferCards(session.profile.cards, selection, includeUsed);
    const ledger = await createTransferLedger(session.context, selected, session.inventoryRaw);
    await commitWallet({ kind: "set-batch", ...inventoryContext(session.state), revision: session.profile.revision, ledger });
    setPreview(null);
    setPacket("");
    setMessage(`Batch ready. ${selected.length} requests saved on this device.`);
  }

  async function copyRequest() {
    const session = await verifiedSession();
    if (!session.ledger) throw new Error("Create a batch before copying a request.");
    const rows = transferRequestRows(session.ledger, session.profile.cards);
    await assertSession(session);
    const copied = await copyText(formatTransferRequest(rows));
    if (!mounted.current) return;
    if (!copied) throw new Error("Clipboard access failed. Try Copy request again.");
    setMessage(`Copied ${rows.length} requests. Paste them into the bookmarklet.`);
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
    return { ...previewTransferResults(session.ledger, session.previewCards, results, now),
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
    setPreview(null);
    setMessage(`Saved ${accepted.length} locally. Synchronization will confirm the Sheet update when connected.`);
  }

  const recovering = Boolean(batch.error || ledger?.application);
  return (
    <>
      <Card as="section" aria-labelledby="batch-heading" className="flex flex-col gap-3 p-4">
        <div>
          <h2 id="batch-heading" tabIndex={-1} className="text-lg font-semibold" ref={heading}>Batch review</h2>
          <p className="text-sm text-m3-on-surface-variant">Batch requires a connected Google Sheet. Review saves stay on this device. Synchronization runs when connected; CSV backup is available.</p>
        </div>
        {recovering ? (
          <>
            <p role="alert" className="text-sm text-m3-error">
              {batch.error || "A previous apply was interrupted."}
            </p>
            <p className="text-sm text-m3-on-surface-variant">
              Displayed balances may be stale. Discarding requires the displayed inventory to match the persisted inventory.
              If the check fails, reload the wallet to load the persisted balances, then return to Batch.
            </p>
            <Button variant="outlined" disabled={busy} onClick={() => run(discardBatch)}>Discard batch</Button>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Cards to request
              <SelectField disabled={busy} value={selection} onChange={(event) => setSelection(event.target.value)}>
                {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </SelectField>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={includeUsed} disabled={busy} onChange={(event) => setIncludeUsed(event.target.checked)}
                className="h-5 w-5 accent-m3-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-m3-primary" />
              Include cards marked used ({selectionCounts.usedCount})
            </label>
            <p className="text-sm text-m3-on-surface-variant" role="status">
              {selectionCounts.selected.length} selected · {selectionCounts.eligible} eligible · {selectionCounts.excluded} excluded
            </p>
            <Button variant={ledger ? "outlined" : "filled"} disabled={busy || !selectionCounts.selected.length}
              onClick={() => run(createBatch)}>{ledger ? "Replace batch" : "Create batch"}</Button>
          </>
        )}
      </Card>

      {ledger && !recovering && (
        <>
          <Card as="section" aria-labelledby="active-batch-heading" className="flex flex-col gap-3 p-4">
            <h3 id="active-batch-heading" className="font-semibold">Saved batch</h3>
            <p className="text-sm text-m3-on-surface-variant" role="status">
              {pending} outstanding · {invalidated} invalidated · {ledger.requests.length - pending - invalidated} applied
            </p>
            {pending > 0 && (
              <>
                <p className="text-sm text-m3-on-surface-variant">The copied request contains card numbers and PINs. Clear your clipboard and clipboard history after use.</p>
                <Button disabled={busy} onClick={() => run(copyRequest)}>Copy request</Button>
                <Button variant="outlined" href={checkerUrl} target="_blank" rel="noopener noreferrer"
                  aria-label="Open Walmart checker (opens in a new tab)">Open Walmart checker <ArrowUpRight size={16} aria-hidden="true" /></Button>
              </>
            )}
            <Button variant="text" className="self-start" disabled={busy} onClick={() => run(discardBatch)}>Discard batch</Button>
          </Card>

          <Card as="section" aria-labelledby="import-results-heading" className="flex flex-col gap-3 p-4">
            <h3 id="import-results-heading" className="font-semibold">Import results</h3>
            <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); run(importResults); }}>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Paste Wallet results
                <TextArea value={packet} onChange={(event) => { setPacket(event.target.value); setPreview(null); }}
                  disabled={busy} spellCheck={false} autoComplete="off" autoCapitalize="off" />
              </label>
              <Button variant="tonal" type="submit" disabled={busy || !packet.trim()}>Preview results</Button>
            </form>
          </Card>
        </>
      )}

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
