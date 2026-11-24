import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fetchWorkerJson } from "../lib/api";
import { captureBalanceReviewStorage, normalizeCards } from "../lib/cards";
import {
  checkerUrl, formatTransferRequest, parseTransferResults, previewTransferResults, requireTransferContext,
  sameTransferContext, selectTransferCards, transferRequestRows,
} from "../lib/balanceTransfer";
import {
  assertTransferUnchanged, checkTransferContinuity, commitTransferApplication,
  createTransferLedger, decodeTransferLedger, invalidateOnObservedContext, prepareTransferApplication,
  readLocalTransferContext, readTransferInventory, readTransferLedger, writeTransferLedger,
} from "../lib/balanceTransferLedger";
import { storageKeys } from "../lib/storage";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { SelectField } from "./primitives/SelectField";
import { TextArea } from "./primitives/TextArea";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const choices = [
  ["all", "All eligible cards"], ["never", "Never verified"],
  ...[5, 10, 20, 30].map((count) => [String(count), `Next oldest ${count} cards`]),
];

function savedBatch() {
  try {
    return { ledger: decodeTransferLedger(readTransferLedger()) };
  } catch (error) {
    return { error: error.message };
  }
}

function formatNet(cents) {
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "−" : cents > 0n ? "+" : ""}$${(absolute / 100n).toLocaleString("en-CA")}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function BalanceTransfer({ cards, onSave, copyText, maskCardNumber, getTransferWallet }) {
  const [selection, setSelection] = useState("all");
  const [batch, setBatch] = useState(savedBatch);
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
  const selectionCounts = selectTransferCards(cards, selection);

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    function refresh(event) {
      if (event.key === storageKeys.balanceTransfer || event.key === null) setBatch(savedBatch());
    }
    window.addEventListener("storage", refresh);
    return () => {
      mounted.current = false;
      window.removeEventListener("storage", refresh);
    };
  }, []);

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
      if (!navigator.locks) throw new Error("This browser does not support the local lock required for Batch.");
      await navigator.locks.request(storageKeys.balanceTransfer, { ifAvailable: true }, async (lock) => {
        if (!lock) throw new Error("Batch is busy in another tab. Try again when it finishes.");
        if (mounted.current) await action();
      });
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        setBatch(savedBatch());
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) (trigger?.isConnected ? trigger : messageRegion.current)?.focus();
        });
      }
    }
  }

  function ensureMounted() {
    if (!mounted.current) throw new Error("Batch was closed.");
  }

  async function verifiedSession({ allowStalePreview = false } = {}) {
    const startingRaw = readTransferLedger();
    decodeTransferLedger(startingRaw);
    const status = await fetchWorkerJson("/api/status", { cache: "no-store" });
    ensureMounted();
    const local = readLocalTransferContext();
    invalidateOnObservedContext(startingRaw, status, local);
    const wallet = getTransferWallet();
    const context = requireTransferContext(status, wallet);
    requireTransferContext(status, local);
    const inventoryRaw = readTransferInventory();
    const currentRaw = readTransferLedger();
    const continuity = await checkTransferContinuity({
      ledger: decodeTransferLedger(currentRaw), raw: currentRaw, inventoryRaw, context,
    });
    let previewCards = wallet.cards;
    try {
      if (captureBalanceReviewStorage(wallet.cards) !== inventoryRaw) {
        throw new Error("Saved cards changed. Reload the wallet before continuing.");
      }
    } catch (error) {
      if (!allowStalePreview || !continuity.ledger || continuity.ledger.requests.some(({ state }) => state === "pending")) {
        throw error;
      }
      // When another tab invalidates the ledger, its committed inventory can
      // support a new read-only preview without replacing this tab's cards.
      try {
        previewCards = inventoryRaw === null ? [] : normalizeCards(JSON.parse(inventoryRaw));
      } catch {
        previewCards = null;
      }
      if (!previewCards) throw new Error("Saved cards could not be reloaded for preview.");
    }
    const session = { ...continuity, wallet, context, inventoryRaw, status, previewCards };
    assertSession(session);
    return session;
  }

  function assertSession(session) {
    ensureMounted();
    const wallet = getTransferWallet();
    const context = requireTransferContext(session.status, wallet);
    requireTransferContext(session.status, readLocalTransferContext());
    if (wallet.cards !== session.wallet.cards || !sameTransferContext(session.context, context)) {
      throw new Error("Inventory or Sheet context changed. Preview the results again.");
    }
    assertTransferUnchanged(session.raw, session.inventoryRaw);
  }

  async function createBatch() {
    const session = await verifiedSession();
    if (session.ledger?.application) throw new Error("Discard the interrupted batch before creating a new batch.");
    const outstanding = session.ledger?.requests.filter(({ state }) => state === "pending").length;
    if (outstanding && !window.confirm(`Replace the batch and discard its ${outstanding} outstanding requests?`)) return;
    const { selected } = selectTransferCards(session.wallet.cards, selection);
    const next = await createTransferLedger(session.context, selected, session.inventoryRaw);
    assertSession(session);
    writeTransferLedger(session.raw, next);
    setPreview(null);
    setPacket("");
    setMessage(`Batch ready. ${selected.length} requests saved on this device.`);
  }

  async function copyRequest() {
    const session = await verifiedSession();
    if (!session.ledger) throw new Error("Create a batch before copying a request.");
    const rows = transferRequestRows(session.ledger, session.wallet.cards);
    assertSession(session);
    const copied = await copyText(formatTransferRequest(rows));
    if (!mounted.current) return;
    if (!copied) throw new Error("Clipboard access failed. Try Copy request again.");
    setMessage(`Copied ${rows.length} requests. Paste them into the bookmarklet.`);
  }

  function discardBatch() {
    const raw = readTransferLedger();
    if (raw === null) return;
    const current = savedBatch();
    const recovery = current.error || current.ledger?.application;
    const outstanding = current.ledger?.requests.filter(({ state }) => state === "pending").length;
    const question = recovery
      ? "Discard this batch and its request references? Check the card balances before creating a new batch."
      : `Discard this batch${outstanding ? ` and its ${outstanding} outstanding requests` : ""}?`;
    if (!window.confirm(question)) return;
    writeTransferLedger(raw, null);
    setPreview(null);
    setPacket("");
    setMessage("Batch discarded.");
  }

  function buildPreview(session, results) {
    if (!session.ledger) throw new Error("There is no saved request for these results. Create a new batch.");
    if (session.ledger.application) throw new Error("Resolve the interrupted application before importing more results.");
    return {
      ...previewTransferResults(session.ledger, session.previewCards, results),
      results, ledgerRaw: session.raw, inventoryRaw: session.inventoryRaw,
    };
  }

  async function importResults() {
    const results = parseTransferResults(packet);
    const session = await verifiedSession({ allowStalePreview: true });
    setPreview(buildPreview(session, results));
    setPacket("");
  }

  async function applyResults() {
    const prior = preview;
    if (!prior?.counts.accepted) return;
    const session = await verifiedSession({ allowStalePreview: true });
    const fresh = buildPreview(session, prior.results);
    if (prior.ledgerRaw !== fresh.ledgerRaw || prior.inventoryRaw !== fresh.inventoryRaw
        || JSON.stringify(prior.items) !== JSON.stringify(fresh.items)) {
      setPreview(fresh);
      setMessage("The preview changed. Review the updated results before applying.");
      return;
    }

    const accepted = fresh.items.filter(({ outcome }) => outcome === "accepted");
    const prepared = await prepareTransferApplication(session.ledger, fresh.candidate, accepted);
    assertSession(session);
    const result = commitTransferApplication({
      raw: session.raw, inventoryRaw: session.inventoryRaw, candidate: fresh.candidate, prepared,
    });
    if (result.saved) {
      onSave(fresh.candidate);
      setPreview(null);
      setMessage(`Saved ${accepted.length} locally. Use Export Sheet in Settings to sync.`);
    }
    if (result.error) setError(result.error);
  }

  const recovering = Boolean(batch.error || ledger?.application);
  return (
    <>
      <Card as="section" aria-labelledby="batch-heading" className="flex flex-col gap-3 p-4">
        <div>
          <h2 id="batch-heading" tabIndex={-1} className="text-lg font-semibold" ref={heading}>Batch review</h2>
          <p className="text-sm text-m3-on-surface-variant">Batch requires a connected Google Sheet. Review saves stay on this device until you export.</p>
        </div>
        {recovering ? (
          <>
            <p role="alert" className="text-sm text-m3-error">
              {batch.error || "A previous apply was interrupted. Exit and check the card balances, then discard this batch to continue."}
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
