import React from 'react';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { SelectField } from '../../components/primitives/SelectField';
import { Switch } from '../../components/primitives/Switch';
import { TextField } from '../../components/primitives/TextField';
import { StatusChip } from '../../components/primitives/Chip';
import { ActionButton } from '../../components/ActionButton';
import { googleOAuthStatuses } from '../../lib/api';
import { recoveryWarning } from '../../lib/inventory';
import { flaggedConflict } from '../../lib/reconciliationPolicy';

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

// Read-only view data and named commands cross this boundary; no store or engine.
// The controller stays mounted in App so preferences and drafts survive navigation.
export function SettingsPanel({ preferences, connection, synchronization, inventory, commands, onBack, showRawCsvEditor = false }) {
  const { settings, exactSheetId, setExactSheetId, deletedIds, setDeletedIds,
    isGoogleSyncOpen, setIsGoogleSyncOpen } = preferences;
  const { summary: syncSummary, chipStatus: syncChipStatus } = synchronization;
  return (
    <main className="p-3 pb-28 md:pb-16 flex flex-col gap-3 animate-panel-enter">

      {/* Local Settings / Filtering Controls */}
      <Card as="section" className="p-3 flex flex-col gap-2">
        <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider px-2 py-1">Preferences</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
            <span>Sort Order</span>
            <SelectField
              value={settings.sortMode}
              onChange={e => preferences.change("sortMode", e.target.value)}
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
            </SelectField>
          </label>

          <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
            <span>Appearance</span>
            <SelectField
              value={settings.themeMode || "system"}
              onChange={e => preferences.change("themeMode", e.target.value)}
              className="text-sm font-medium border border-m3-outline-variant/60 rounded-lg py-1 px-2 bg-m3-surface text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary cursor-pointer text-center [text-align-last:center]"
            >
              <option value="system">System (Auto)</option>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </SelectField>
          </label>

          <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
            <div className="flex flex-col text-left">
              <span>Checkout auto-dark</span>
              <span className="text-[10px] text-m3-on-surface-variant font-normal">Overrides Appearance on Checkout</span>
            </div>
            <Switch checked={settings.checkoutDark} onChange={() => preferences.toggle('checkoutDark')} />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
            <span>Hide Used Cards</span>
            <Switch checked={settings.hideUsedCards} onChange={() => preferences.toggle('hideUsedCards')} />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
            <span>Hide $0 Cards</span>
            <Switch checked={settings.hideZeroBalanceCards} onChange={() => preferences.toggle('hideZeroBalanceCards')} />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm font-medium text-m3-on-surface cursor-pointer min-h-[40px] py-0.5 px-2 hover:bg-m3-surface-container/40 rounded-lg transition-colors">
            <span>Auto-Advance</span>
            <Switch checked={settings.advanceOnMarkUsed} onChange={() => preferences.toggle('advanceOnMarkUsed')} />
          </label>

          {inventory.zeroBalanceCount > 0 && (
            <button
              id="mark-zero-used"
              onClick={commands.markZeroBalanceUsed}
              className="w-full sm:col-span-2 text-xs font-medium bg-m3-surface-container hover:bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant/30 rounded-lg py-2 px-3 flex justify-between items-center transition-all active:scale-95 shadow-sm font-sans cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px]"
              type="button"
            >
              <span>Mark {inventory.zeroBalanceCount} zero-balance card(s) used</span>
              <span className="bg-m3-surface-container-low text-m3-on-surface px-2 py-0.5 rounded text-[10px]" aria-hidden="true">Mark</span>
            </button>
          )}
        </div>
      </Card>

      {/* Google connection Connection Panel */}
      <Card as="section" className="p-3 flex flex-col gap-2">
        {connection.status === googleOAuthStatuses.connected ? (
          <details
            className="group"
            open={isGoogleSyncOpen}
            onToggle={(e) => setIsGoogleSyncOpen(e.target.open)}
          >
            <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
              <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Google connection</h3>
              <div className="flex items-center gap-2">
                {(() => {
                  const summary = syncSummary;
                  const syncLabel = summary.label;
                  return (
                    <StatusChip
                      size="compact"
                      status={syncChipStatus}
                      indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                      className="max-w-full min-w-0"
                    >
                      {syncLabel}
                    </StatusChip>
                  );
                })()}
                <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform ml-2 shrink-0">▼</span>
              </div>
            </summary>
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-m3-outline-variant/20 w-full">
              {/* Connected email address */}
              {connection.connectedEmail && (
                <p className="text-xs text-m3-on-surface-variant font-medium leading-relaxed px-2">
                  Connected: {maskEmail(connection.connectedEmail)}
                </p>
              )}

              {/* Disconnect Action */}
              <div className="px-2">
                <Button
                  id="disconnect-google"
                  onClick={commands.disconnectGoogle}
                  variant="elevated"
                  density="compact"
                  className="w-full sm:w-auto self-start text-xs"
                >
                  Disconnect
                </Button>
              </div>

              <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-m3-outline-variant/20 w-full">
                <p id="direct-sheet-status" className="text-xs font-medium text-m3-on-surface-variant px-2">
                  {synchronization.sheetMessage}
                </p>

              </div>
            </div>
          </details>
        ) : (
          <div className="flex flex-col gap-2 w-full px-2 py-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Google connection</h3>
                {(() => {
                  const summary = syncSummary;
                  const syncLabel = summary.label;
                  return (
                    <span className="text-xs font-medium text-m3-on-surface-variant">
                      {syncLabel}
                    </span>
                  );
                })()}
              </div>

              <p className="text-xs text-m3-on-surface-variant font-medium leading-relaxed mt-0.5">
                {connection.message}
              </p>
            </div>

            <button
              id="connect-google"
              onClick={commands.connectGoogle}
              className="w-full sm:w-auto self-start bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-medium py-2 px-3.5 rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 min-h-[38px]"
              type="button"
            >
              Connect Google account
            </button>
          </div>
        )}

        {connection.lastErrorMessage && (
          <p id="google-oauth-status" className="text-xs font-medium text-m3-error border-t border-m3-outline-variant/20 pt-2 mt-1 px-2">
            {connection.lastErrorMessage}
          </p>
        )}
      </Card>

      <Card as="section" className="p-3 flex flex-col gap-2" aria-label="Synchronization recovery">
        <h3 className="text-sm font-semibold">Synchronization</h3>
        <p className="text-sm">Active inventory: {inventory.label}</p>
        <p className="text-sm">Destination: {inventory.context.ownershipVerified === true ? `Google Sheet ${inventory.context.sheetId}` : 'No verified Sheet for this inventory'}</p>
        <p className="text-sm">Pending changes: {inventory.pendingCount}{inventory.confirming ? ' · confirmation in progress' : ''}</p>
        <p className="text-sm">Last confirmed synchronization: {inventory.lastConfirmedAt ? new Date(inventory.lastConfirmedAt).toLocaleString() : 'Not yet recorded on this device'}</p>
        <p role="status" className="text-sm">{synchronization.message}</p>
        <p className="text-sm">Balance confidence: {inventory.recoverySummary?.uncertain??0} uncertain · Record integrity: {inventory.recoverySummary?.quarantined??0} quarantined</p>
        <p className="text-xs text-m3-on-surface-variant">Uncertain balances and quarantined exceptions do not prevent other cards from synchronizing.</p>
        {(inventory.recoverySummary?.flaggedEligible??0)>0&&<Button variant="outlined" onClick={commands.reviewFlagged}>Verify flagged cards ({inventory.recoverySummary.flaggedEligible})</Button>}
        {synchronization.diagnostics?.length>0&&<div className="text-sm border border-m3-outline-variant rounded-xl p-3">
          <p>Sheet row diagnostics:</p>
          <ul>{synchronization.diagnostics.map((item,index)=><li key={index}>Card ending {item.last4}: rows {item.rows.join(' and ')}</li>)}</ul>
          <p>Compatible duplicate rows repair automatically with Sync now. Conflicting credentials remain isolated for private review under advanced recovery. If validation fails, preserve a private backup and review the reported rows.</p>
          {synchronization.diagnosticSheetId&&<ActionButton href={`https://docs.google.com/spreadsheets/d/${encodeURIComponent(synchronization.diagnosticSheetId)}/edit`} target="_blank" rel="noopener noreferrer" icon="external" label="Open Sheet for recovery" compact />}
        </div>}
        {inventory.controlFlight&&<p className="text-sm">Saved {inventory.controlFlight.action} request awaits confirmation. Select Sync now to check the same request. An uncertain request cannot be discarded or replaced.</p>}
        <label className="flex items-center justify-between gap-3 min-h-[48px]"><span>Automatic synchronization</span><Switch checked={settings.automaticSync} onChange={() => preferences.toggle("automaticSync")} /></label>
        <p className="text-xs text-m3-on-surface-variant">{settings.automaticSync?"Sync saved changes and check when returning to the wallet.":"Save locally until you select Sync now."}</p>
        <Button variant="outlined" onClick={()=>commands.syncNow()}>Sync now</Button>
        {inventory.context.ownershipVerified === true && inventory.context.sheetId && <ActionButton id="open-direct-sheet" href={`https://docs.google.com/spreadsheets/d/${encodeURIComponent(inventory.context.sheetId)}/edit`} target="_blank" rel="noopener noreferrer" icon="external" label="Open Sheet" compact />}
        <details>
          <summary className="cursor-pointer text-sm font-medium">Advanced synchronization and recovery</summary>
          <div className="flex flex-col gap-2 pt-2">
            <ActionButton id="load-from-sheets" onClick={commands.importSheet} icon="download" label="Import Sheet" compact />
            <ActionButton id="save-to-sheets" onClick={commands.saveSheet} icon="upload" label="Save to Sheet" compact />
            <label htmlFor="exact-sheet-id">Exact Sheet ID (optional)</label>
            <TextField id="exact-sheet-id" value={exactSheetId} onChange={e=>setExactSheetId(e.target.value)} />
            <Button variant="outlined" onClick={() => commands.ensureSheet(exactSheetId)}>Create or initialize private Sheet</Button>
            <p className="text-sm">Pause shared maintenance before direct card edits and export a private backup first. Keep managed _META recovery fields intact.</p>
            <Button variant="outlined" onClick={()=>commands.maintenance('pause')}>Pause shared maintenance</Button>
            <label htmlFor="deleted-identities">Explicitly deleted card numbers (optional)</label>
            <TextField id="deleted-identities" value={deletedIds} onChange={e=>setDeletedIds(e.target.value)} />
            <Button variant="outlined" onClick={()=>commands.maintenance('resume', deletedIds)}>Accept maintenance and resume</Button>
            {inventory.syncBlocked==='baseline_expired'&&<Button variant="outlined" onClick={async()=>{
              if(!window.confirm('Preserve a private recovery backup first. Reconcile this expired commit against the current Sheet? Uncertain monetary actions will require verification.'))return;
              await commands.recoverExpired();
            }}>Recover expired synchronization safely</Button>}
            <Button variant="outlined" disabled={connection.status!=='connected'} onClick={commands.recoverUnbound}>Recover unbound inventory into connected account</Button>
            <details><summary className="cursor-pointer text-sm font-medium">Exceptional record details (private)</summary>
            {Object.entries(inventory.recoveryCards??{}).flatMap(([number,entry])=>(entry.conflicts??[]).filter(c=>!c.resolution).map(conflict=>(
              <div key={conflict.id} className="border border-m3-outline-variant rounded-xl p-3 text-sm">
                <p>Card ending {number.slice(-4)}: {flaggedConflict(conflict.kind)?'Balance needs fresh merchant verification':conflict.kind}</p>
                <details><summary className="cursor-pointer">Compare recovery values (may contain credentials)</summary><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify({recovered:conflict.local,sheet:conflict.remote,alternatives:conflict.alternatives},null,2)}</pre></details>
                {!flaggedConflict(conflict.kind)&&<div className="flex flex-wrap gap-2">
                  <Button variant="outlined" onClick={()=>commands.resolveConflict(number,conflict,conflict.kind==='deleted-identity'?'restore':'local')}>{conflict.kind==='missing-remote'?'Keep recovered card':'Use recovered values'}</Button>
                  {conflict.kind!=='missing-remote'&&<Button variant="outlined" onClick={()=>commands.resolveConflict(number,conflict,'remote')}>Keep Sheet values</Button>}
                </div>}
              </div>
            )))}
            </details>
          </div>
        </details>
      </Card>

      <Card as="section" className="p-3 flex flex-col gap-2" aria-label="Saved inventories">
        <label htmlFor="saved-inventory" className="text-sm font-medium">Saved inventory (available offline)</label>
        <SelectField id="saved-inventory" value={inventory.activeKey}
          onChange={event => commands.selectCompartment(event.target.value)}>
          {inventory.compartments.map(item => <option key={item.key} value={item.key}>{item.label} · {item.count} cards</option>)}
        </SelectField>
        <p className="text-xs text-m3-on-surface-variant">Selection never claims ownership or merges inventories. Only the matching verified account can synchronize.</p>
        <Button variant="outlined" onClick={() => commands.exportCsv(undefined, inventory.activeKey)}>Back up selected inventory CSV</Button>
        <p className="text-xs text-m3-on-surface-variant">{recoveryWarning} CSV backups also contain card credentials.</p>
        <Button variant="outlined" onClick={commands.exportRecovery}>Export original and quarantined recovery data</Button>
      </Card>

      {/* Data Panel / Backup Controls */}
      <Card as="section" className="p-3 flex flex-col gap-2">
        <details className="group">
          <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
            <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Backup & CSV Controls</span>
            <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-m3-outline-variant/20 px-2 pb-1">
            <div className="flex gap-2">
              <ActionButton
                id="import-csv"
                onClick={() => {
                  if (window.confirm("Import this CSV into the recovery editor? Saving applies explicit additions and updates; omitted cards are retained and conflicting credentials are rejected.")) {
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
                onClick={() => commands.exportCsv()}
                icon="upload"
                label="Export CSV"
                className="flex-1"
                compact
              />
            </div>

            {showRawCsvEditor && (
              <div className="border border-m3-outline-variant/20 bg-m3-surface-container rounded-xl p-2.5 flex justify-between items-center gap-2.5">
                <div>
                  <h4 className="text-xs font-medium text-m3-on-surface uppercase">Raw CSV Editor</h4>
                  <p className="text-[10px] text-m3-on-surface-variant mt-0.5">Open a locked editor to view or paste diagnostic card data.</p>
                </div>
                <Button
                  id="open-raw-data-modal"
                  onClick={commands.openRawEditor}
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
      </Card>

      {/* Troubleshooting (Unified Container) */}
      <Card as="section" className="p-3 flex flex-col gap-2">
        <details className="group">
          <summary className="list-none flex justify-between items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-xl px-2 py-1">
            <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Troubleshooting</span>
            <span className="text-m3-on-surface-variant group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-m3-outline-variant/20 px-2 pb-1">
            <Card variant="container" className="p-2.5 flex flex-col gap-2">
              <h4 className="text-xs font-medium text-m3-on-surface uppercase mb-0.5">System Status</h4>
              <ul className="text-xs text-m3-on-surface-variant font-medium list-none flex flex-col gap-1.5">
                <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                  <span>Google Account</span>
                  <span className="text-[10px] text-m3-on-surface font-medium">
                    {connection.status === googleOAuthStatuses.connected ? "Connected" : "Disconnected"}
                  </span>
                </li>
                <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                  <span>Sheet status</span>
                  {(() => {
                    const summary = syncSummary;
                    const syncStatusLabel = summary.label;
                    return (
                      <StatusChip
                        size="compact"
                        status={syncChipStatus}
                        indicatorClassName={summary.key === 'checking' ? 'animate-pulse bg-amber-500' : ''}
                        className="max-w-full min-w-0"
                      >
                        {syncStatusLabel}
                      </StatusChip>
                    );
                  })()}
                </li>
                <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                  <span>Pending Changes</span>
                  <span className="text-[10px] text-m3-on-surface font-medium">
                    {Boolean(synchronization.hasPendingChanges) ? "Yes" : "No"}
                  </span>
                </li>
                <li className="flex justify-between border-b border-m3-outline-variant/20 pb-1">
                  <span>Last Sheet read</span>
                  <span className="text-[10px] text-m3-on-surface font-medium">
                    {inventory.lastConfirmedAt ? new Date(inventory.lastConfirmedAt).toLocaleString() : "Not yet recorded on this device"}
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
                {synchronization.diagnosticMessage}
              </div>
            </Card>
          </div>
        </details>
      </Card>

      <ActionButton
        id="settings-back"
        onClick={onBack}
        label="Back"
        variant="outlined"
        compact
      />
    </main>
  );
}
