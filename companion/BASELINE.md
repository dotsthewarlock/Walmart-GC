# Source baseline
- Accepted bookmarklet v0.3.1 source recovered: SHA-256 `2ac87a16938e43f811a9567e49b5ca759a20395efccf4e22812d82729c9dd30a`.
- Extension v0.3.0 ZIP: SHA-256 `1535ca86348ddc6eade5c707f06b6737bab6e42d118bc83df4b3e2204328ff34`.
- Bookmarklet parser preserves BOM, CRLF, trailing whitespace, exact headers, UUID v4, digit strings, identical duplicates, conflicting refs and multiple refs/card rejection. Extracted into wire.js; extension synthetic allowlist remains separate.
- Existing bookmarklet legacy import, merchant interaction, result history and dock are NOT migrated or replaced. No claim of production behavioral parity.
