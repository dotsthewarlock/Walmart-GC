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
        if (fresh) databases.set(name, { value: undefined, tail: Promise.resolve() });
        const bank = databases.get(name);
        let closed = false;
        request.result = {
          createObjectStore() {},
          close() { closed = true; },
          transaction(_store, mode) {
            if (closed) throw new Error('Connection closed');
            let getRequest, proposed, changed = false, aborted = false;
            const tx = {
              error: null,
              abort() { aborted = true; },
              objectStore() {
                return {
                  get() { getRequest = {}; return getRequest; },
                  put(value) {
                    if (factory.failNextWrite) { factory.failNextWrite = false; throw new Error('Synthetic storage failure'); }
                    proposed = structuredClone(value); changed = true;
                  },
                };
              },
            };
            const run = async () => {
              getRequest.result = structuredClone(bank.value);
              getRequest.onsuccess();
              await Promise.resolve();
              if (aborted) { tx.onabort(); return; }
              factory.beforeComplete?.({ mode, previous: structuredClone(bank.value) });
              if (changed) bank.value = proposed;
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
