// Logical evidence stays compatible with saved v1 baselines. Only the Sheet
// representation is packed; every part is committed with the inventory marker.
export const evidenceCellBytes = 38000;
const maxParts = 128;
const bytes = value => new TextEncoder().encode(value).length;

export function compactEvidence(evidence) {
  const next = structuredClone(evidence);
  for (const [number, entry] of Object.entries(next.cards)) {
    const seen = new Set();
    entry.conflicts = entry.conflicts.filter(conflict => {
      if (conflict.resolution) return false;
      // Repeated recovery attempts do not require repeated copies of the same
      // alternatives. IDs on the first unresolved item remain stable.
      const key = JSON.stringify([conflict.kind, conflict.local, conflict.remote, conflict.base]);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    if (!entry.money && !entry.moneyAt && !entry.uncertainSince && !entry.conflicts.length) delete next.cards[number];
  }
  return next;
}

export function evidenceMetadata(evidence) {
  const { cards, ...rest } = evidence;
  const packed = JSON.stringify({ ...rest, format: 'packed-v1', cards: Object.entries(cards).sort(([a], [b]) => a.localeCompare(b))
    .map(([number, {money, moneyAt = '', uncertainSince = '', conflicts, ...other}]) => {
      const row=[number,money,moneyAt];
      if(uncertainSince||conflicts.length||Object.keys(other).length)row.push(uncertainSince,conflicts,other);
      return row;
    }) });
  // Split by Unicode code point so every cell is bounded in UTF-8 as well as
  // characters. Never truncate unresolved credentials, tombstones or revisions.
  const parts = []; let part = '', length = 0;
  for (const character of packed) {
    const code = character.codePointAt(0);
    const size = code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4;
    if (length + size > evidenceCellBytes) { parts.push(part); part = ''; length = 0; }
    part += character; length += size;
  }
  parts.push(part);
  if (parts.length > maxParts) throw Error('Recovery evidence capacity reached. Export a private backup before controlled recovery.');
  return Object.fromEntries([['syncEvidence', JSON.stringify({format:'parts-v1', count:parts.length})],
    ...parts.map((value, index) => ['syncEvidence:' + index, value])]);
}

export function readEvidenceMetadata(meta) {
  let value = meta.syncEvidence ? JSON.parse(meta.syncEvidence) : {cards:{}, tombstones:{}};
  if (value.format === 'parts-v1') {
    if (!Number.isInteger(value.count) || value.count < 1 || value.count > maxParts) throw Error('Invalid evidence manifest.');
    const parts = Array.from({length:value.count}, (_, index) => meta['syncEvidence:' + index]);
    if (parts.some(part => typeof part !== 'string' || bytes(part) > evidenceCellBytes)) throw Error('Missing evidence part.');
    value = JSON.parse(parts.join(''));
    if (value.format !== 'packed-v1' || !Array.isArray(value.cards)) throw Error('Invalid packed evidence.');
    const {format, cards, ...rest} = value;
    const entries = cards.map(([number, money, moneyAt='', uncertainSince='', conflicts=[], other={}]) => [number,
      {...other, money, conflicts, ...(moneyAt ? {moneyAt} : {}), ...(uncertainSince ? {uncertainSince} : {})}]);
    if (new Set(entries.map(([number]) => number)).size !== entries.length) throw Error('Duplicate evidence identity.');
    value = {...rest, cards:Object.fromEntries(entries)};
  }
  return value;
}
