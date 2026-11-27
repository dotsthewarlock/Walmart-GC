import { useRef, useState } from 'react';
import { defaultSettings, loadSettings, saveSettings } from '../../lib/settings';

// App-lifetime controller: shared preferences plus Settings-only drafts/disclosure.
// No inventory writes. App initializes preferences after opening the local wallet.
export function useSettings({ active, connectionStatus, summaryKey, onAutomaticEnabled }) {
  const [settings, setSettings] = useState(() => ({ ...defaultSettings }));
  const current = useRef(settings);
  const [exactSheetId, setExactSheetId] = useState('');
  const [deletedIds, setDeletedIds] = useState('');
  const hasError = ['conflict', 'unavailable', 'unsynced', 'error'].includes(summaryKey);
  const defaultOpen = connectionStatus !== 'connected' || hasError || summaryKey === 'checking';
  const [disclosure, setDisclosure] = useState({ active, connectionStatus, hasError, open: defaultOpen });

  // Derive entry/transition defaults before committing the native <details> node.
  // Resetting in an effect races its queued toggle event when the panel remounts.
  if (disclosure.active !== active || disclosure.connectionStatus !== connectionStatus || disclosure.hasError !== hasError) {
    const reset = active && (!disclosure.active
      || (disclosure.connectionStatus !== 'connected' && connectionStatus === 'connected')
      || (!disclosure.hasError && hasError));
    setDisclosure({ active, connectionStatus, hasError, open: reset ? defaultOpen : disclosure.open });
  }

  function update(patch) {
    const next = { ...current.current, ...patch };
    current.current = next;
    setSettings(next);
    // Existing preference persistence is best effort; inventory stays in IndexedDB.
    saveSettings(next);
    if (patch.automaticSync === true) onAutomaticEnabled();
  }

  return {
    settings, current,
    initialize() { const loaded = loadSettings(); current.current = loaded; setSettings(loaded); },
    resetFilters() { update({ hideUsedCards: false, hideZeroBalanceCards: false }); },
    panel: {
      settings,
      change(key, value) { update({ [key]: value }); },
      toggle(key) { update({ [key]: !current.current[key] }); },
      exactSheetId, setExactSheetId, deletedIds, setDeletedIds,
      isGoogleSyncOpen: disclosure.open,
      setIsGoogleSyncOpen(open) { setDisclosure(previous => ({ ...previous, open })); },
    },
  };
}
