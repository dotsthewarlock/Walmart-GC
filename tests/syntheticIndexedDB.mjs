// Fault model for testing the adapter's transaction/event contract in Node.
// This is deliberately not advertised as native browser IndexedDB coverage.
export function syntheticIndexedDB() {
  const databases = new Map();
  const factory = {
    failNextWrite: false,
    beforeComplete: null,
    open(name) {
      const request = {};
      queueMicrotask(() => {
        const fresh = !databases.has(name);
        if (fresh) databases.set(name, { values: new Map(), tail: Promise.resolve() });
        const bank = databases.get(name);
        let closed = false;
        request.result = {
          createObjectStore() {},
          close() { closed = true; },
          transaction(_store, mode) {
            if (closed) throw new Error('Connection closed');
            let getRequest, readKey, writeKey, proposed, changed = false, aborted = false;
            const tx = {
              error: null,
              abort() { aborted = true; },
              objectStore() {
                return {
                  get(key) { readKey = key; getRequest = {}; return getRequest; },
                  put(value, key) {
                    writeKey = key;
                    if (factory.failNextWrite) { factory.failNextWrite = false; throw new Error('Synthetic storage failure'); }
                    proposed = structuredClone(value); changed = true;
                  },
                };
              },
            };
            const run = async () => {
              getRequest.result = structuredClone(bank.values.get(readKey));
              getRequest.onsuccess();
              await Promise.resolve();
              if (aborted) { tx.onabort(); return; }
              factory.beforeComplete?.({ mode, key: readKey, proposed: structuredClone(proposed), previous: structuredClone(bank.values.get(readKey)) });
              if (changed) bank.values.set(writeKey, proposed);
              tx.oncomplete();
            };
            bank.tail = bank.tail.then(run);
            return tx;
          },
        };
        if (fresh) request.onupgradeneeded?.();
        request.onsuccess();
      });
      return request;
    },
  };
  return factory;
}
