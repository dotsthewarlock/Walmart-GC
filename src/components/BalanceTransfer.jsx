import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fetchWorkerJson } from "../lib/api";
import { inventoryBytes, profileOf, inventoryContext, assertInventoryContext } from "../lib/inventory";
import {
  checkerUrl, formatTransferRequest, parseTransferResults, previewTransferResults, requireTransferContext,
  sameTransferContext, selectTransferCards, transferRequestRows, readTransferPreferences, defaultTransferPreferences, transferPreferenceKey,
} from "../lib/balanceTransfer";
import { createTransferLedger, inventoryFingerprint, prepareTransferApplication } from "../lib/balanceTransferLedger";
import { Button } from "./primitives/Button";
import { Card } from "./primitives/Card";
import { SelectField } from "./primitives/SelectField";
import { TextArea } from "./primitives/TextArea";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
function Segments({ label, value, choices, onChange, disabled, detail }) {
  return <fieldset disabled={disabled} className="min-w-0">
    <legend className="mb-1 text-sm font-medium">{label} {detail && <span className="font-normal text-m3-on-surface-variant">{detail}</span>}</legend>
    <div className="flex overflow-hidden rounded-full border border-m3-outline">
      {choices.map(([option, text]) => <label key={option} className={`flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center justify-center border-r border-m3-outline px-1 text-sm last:border-r-0 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-m3-primary ${value === option ? "bg-m3-secondary-container text-m3-on-secondary-container" : "text-m3-on-surface"}`}>
        <input className="sr-only" type="radio" name={label} value={option} checked={value === option} onChange={() => onChange(option)} />{text}
      </label>)}
    </div>
  </fieldset>;
}

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

export function BalanceTransfer({ cards, copyText, maskCardNumber, getTransferWallet, walletSnapshot, readWallet, commitWallet, detectedResults, onOccupiedChange, onDetectedConsumed }) {
  const [preferences, setPreferences] = useState(() => {
    try { return readTransferPreferences(window.localStorage); } catch { return { ...defaultTransferPreferences }; }
  });
  const setPreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
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
  const selectionCounts = selectTransferCards(cards, preferences);

  useEffect(() => { try { window.localStorage.setItem(transferPreferenceKey, JSON.stringify(preferences)); } catch { /* Preferences are optional. */ } }, [preferences]);

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { setBatch(savedBatch(walletSnapshot)); }, [walletSnapshot]);
  useEffect(() => { setPreview(null); setPacket(""); }, [walletSnapshot.active, walletSnapshot.contextGeneration]);

  useEffect(() => {
    onOccupiedChange(Boolean(preview) || busy);
    return () => onOccupiedChange(false);
  }, [preview, busy, onOccupiedChange]);

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
    const { selected } = selectTransferCards(session.profile.cards, preferences);
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

  useEffect(() => {
    if (!detectedResults || preview || locked.current) return;
    onDetectedConsumed();
    run(async () => {
      assertInventoryContext(await readWallet(), detectedResults.context);
      const session = await verifiedSession();
      setPreview(buildPreview(session, detectedResults.results));
    });
  }, [detectedResults]);

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
      {(!pending || recovering) && <Card as="section" aria-labelledby="batch-heading" className="flex flex-col gap-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2"><h2 id="batch-heading" tabIndex={-1} className="text-lg font-semibold" ref={heading}>Create batch</h2>
            {!recovering && <Button variant="text" disabled={busy} onClick={() => setPreferences({ ...defaultTransferPreferences })}>Reset</Button>}</div>
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
            <Segments label="Status" value={preferences.status} disabled={busy} onChange={v => setPreference("status", v)} choices={[["active", "Active"], ["used", "Used"], ["all", "All"]]} />
            <Segments label="Balance" value={preferences.balance} disabled={busy} onChange={v => setPreference("balance", v)} choices={[["yes", "Yes"], ["zero", "$0"], ["all", "All"]]} />
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">Last checked
                <SelectField disabled={busy} value={preferences.checked} onChange={event => setPreference("checked", event.target.value)}>
                  <option value="any">Any time</option><option value="never">Never</option><option value="older">At least</option><option value="recent">Within</option>
                </SelectField>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">Days
                <SelectField disabled={busy || !["older", "recent"].includes(preferences.checked)} value={preferences.days} onChange={event => setPreference("days", Number(event.target.value))}>
                  {[1, 3, 7, 30, 90, 180].map(days => <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>)}
                </SelectField>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">Sort by
              <SelectField disabled={busy} value={preferences.sort} onChange={event => setPreference("sort", event.target.value)}>
                <option value="checked-oldest">Checked oldest</option><option value="checked-newest">Checked newest</option><option value="added-oldest">Added oldest</option><option value="added-newest">Added newest</option><option value="balance-highest">Balance highest</option><option value="balance-lowest">Balance lowest</option>
              </SelectField>
            </label>
            <Segments label="Quantity" detail={`· ${selectionCounts.matching} matching`} value={preferences.quantity} disabled={busy} onChange={v => setPreference("quantity", v)} choices={[["1", "1"], ["5", "5"], ["20", "20"], ["50", "50"], ["all", "All"]]} />
            <Button disabled={busy || !selectionCounts.selected.length} onClick={() => run(createBatch)}>Create batch ({selectionCounts.selected.length})</Button>
          </>
        )}
      </Card>}

      {ledger && !recovering && (
        <>
          <Card as="section" aria-labelledby="active-batch-heading" className="flex flex-col gap-3 p-4">
            <h3 id="active-batch-heading" tabIndex={-1} ref={pending ? heading : undefined} className="font-semibold">Saved batch</h3>
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
