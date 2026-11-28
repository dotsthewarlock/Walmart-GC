import { test, expect } from '@playwright/test';
import { syntheticRemote, cardA, cardB } from '../syncFixtures.mjs';
import { snapshot, active, settings, checkoutA, setup, start } from './walletFixture.mjs';

test.describe.configure({ timeout: 60000 });
async function switchInventory(page, key) {
  await settings(page);
  await page.locator('#saved-inventory').selectOption(key);
  await expect.poll(async () => (await snapshot(page)).active).toBe(key);
  await page.locator('#settings-back').click();
}
async function holdSave(page, button) {
  await page.evaluate(() => {
    delete window.qaCompleteSelection;
    sessionStorage.setItem('qa-hold-selection', 'yes');
  });
  await button.click();
  await expect.poll(() => page.evaluate(() => typeof window.qaCompleteSelection)).toBe('function');
  await page.evaluate(() => sessionStorage.removeItem('qa-hold-selection'));
}
async function releaseSave(page) {
  await page.evaluate(async () => {
    const complete = window.qaCompleteSelection;
    delete window.qaCompleteSelection;
    await complete();
  });
  // Flush React's resulting render before inspecting a newer editor.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('P0.1 overlapping identities isolate drafts and preserve same-context navigation and stale-save fences', async ({ browser }) => {
  const context = await browser.newContext();
  const remote = await syntheticRemote([{ ...cardA, currentBalance: 90, pin: '9090', notes: 'REMOTE' }]);
  const qa = await setup(context, remote, [cardA]);
  const page = await context.newPage(); await start(page); qa.mock.offline = true;
  const original = await snapshot(page), cloud = original.active;
  await checkoutA(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByPlaceholder('Add card notes...').fill('PRIVATE REMOTE DRAFT');
  await settings(page); await page.locator('#settings-back').click();
  await expect(page.getByPlaceholder('Add card notes...')).toHaveValue('PRIVATE REMOTE DRAFT');
  await switchInventory(page, 'unbound');
  const earlierUnbound = await snapshot(page);
  await expect(page.getByPlaceholder('Add card notes...')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByPlaceholder('Add card notes...')).toHaveValue(cardA.notes);
  await switchInventory(page, cloud);
  await expect(page.getByPlaceholder('Add card notes...')).toHaveCount(0);
  await page.locator('#open-balance-modal').click(); await page.locator('#balance-input').fill('66.66');
  await expect(page.locator('#balance-input')).toHaveValue('66.66');
  const other = await context.newPage(); await start(other); await switchInventory(other, 'unbound');
  await expect(page.locator('#balance-modal')).toHaveCount(0);
  await page.locator('#open-balance-modal').click();
  await expect(page.locator('#balance-input')).toHaveValue('100');
  await expect(page.locator('#amount-used-input')).toHaveValue('');
  // Exercise the existing transactional guard even though stale editors are now
  // removed. Both the old profile and an away/back generation must be rejected.
  const rejected = await page.evaluate(async originals => {
    const { openInventory, inventoryContext, profileOf, operationId } = await import('/src/lib/inventory.js');
    const store = await openInventory(); const errors = [];
    for (const [old, patch] of [[originals[0], { notes: 'STALE' }], [originals[1], { currentBalance: 1 }]]) {
      try { await store.commit({ id: operationId(), kind: 'patch', action: 'stale-test', ...inventoryContext(old),
        cardNumber: old.profiles[old.active].cards[0].cardNumber,
        version: profileOf(old).versions[old.profiles[old.active].cards[0].cardNumber], patch }); }
      catch (error) { errors.push(error.message); }
    }
    await store.close(); return errors;
  }, [original, earlierUnbound]);
  expect(rejected).toHaveLength(2); rejected.forEach(message => expect(message).toMatch(/context changed/));
  expect(active(await snapshot(page)).cards[0].currentBalance).toBe(100);
  expect(active(await snapshot(page)).cards[0].notes).toBe(cardA.notes);
  expect(qa.errors).toEqual([]); await context.close();
});

test('P0.1 reveal, clipboard completions and timers belong to the originating scope and latest action', async ({ browser }) => {
  const context = await browser.newContext(), remote = await syntheticRemote([cardA]);
  const qa = await setup(context, remote, [cardB]);
  await context.addInitScript(() => {
    window.qaFine = false; window.qaCopies = []; window.qaResolveCopies = [];
    const match = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(hover: hover) and (pointer: fine)' ? { matches: window.qaFine } : match(query);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: text => new Promise(resolve => {
      window.qaCopies.push(text); window.qaResolveCopies.push(resolve);
    }) } });
  });
  const page = await context.newPage(); await start(page); qa.mock.offline = true; await checkoutA(page);
  await page.locator('#detail-barcode-caption').click();
  await expect(page.locator('#detail-barcode-caption')).toHaveText(cardA.cardNumber);
  await page.evaluate(() => window.qaFine = true); await page.locator('#detail-barcode-caption').click();
  await switchInventory(page, 'unbound');
  await expect(page.locator('#detail-barcode-caption')).toContainText('••••');
  await page.evaluate(() => window.qaResolveCopies[0]());
  await expect(page.getByText('Code/PIN copied', { exact: true })).toHaveCount(0);
  await page.clock.install();
  await page.locator('#detail-barcode-caption').click(); await page.evaluate(() => window.qaResolveCopies[1]());
  await expect(page.getByText('Code/PIN copied', { exact: true })).toBeVisible();
  await page.clock.runFor(1500);
  await page.locator('#detail-barcode-caption').click(); await page.locator('#detail-barcode-pin').click();
  await expect(page.getByText('Code/PIN copied', { exact: true })).toHaveCount(0);
  await page.evaluate(() => window.qaResolveCopies[3]());
  await page.clock.runFor(1100);
  await expect(page.getByText('Code/PIN copied', { exact: true })).toBeVisible();
  await page.clock.runFor(1500);
  await expect(page.getByText('Code/PIN copied', { exact: true })).toHaveCount(0);
  await page.evaluate(() => window.qaResolveCopies[2]());
  await expect(page.getByText('Code/PIN copied', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.qaCopies[0])).toBe(cardA.cardNumber + '/' + cardA.pin);
  expect(qa.errors).toEqual([]); await context.close();
});

test('P0.1 late balance and notes saves cannot close a new editor after cancel/reopen or context change', async ({ browser }) => {
  const context = await browser.newContext(), remote = await syntheticRemote([{ ...cardA, currentBalance: 90 }]);
  const qa = await setup(context, remote, [cardA]);
  const page = await context.newPage(); await start(page); qa.mock.offline = true; await checkoutA(page);
  await page.locator('#open-balance-modal').click(); await page.locator('#balance-input').fill('66.66');
  await holdSave(page, page.locator('#save-balance-update'));
  const other = await context.newPage(); await start(other); await switchInventory(other, 'unbound');
  await expect(page.locator('#balance-modal')).toHaveCount(0);
  await page.locator('#open-balance-modal').click(); await page.locator('#balance-input').fill('77.77');
  await releaseSave(page);
  await expect(page.locator('#balance-input')).toHaveValue('77.77');
  expect(active(await snapshot(page)).cards[0].currentBalance).toBe(100);
  await page.getByRole('button', { name: 'Close update balance modal' }).click();
  await page.locator('#open-balance-modal').click(); await page.locator('#balance-input').fill('88.88');
  await holdSave(page, page.locator('#save-balance-update'));
  await page.getByRole('button', { name: 'Close update balance modal' }).click();
  await page.locator('#open-balance-modal').click(); await page.locator('#balance-input').fill('55.55');
  await releaseSave(page); await expect(page.locator('#balance-input')).toHaveValue('55.55');
  await page.getByRole('button', { name: 'Close update balance modal' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByPlaceholder('Add card notes...').fill('Committed earlier editor');
  await holdSave(page, page.getByRole('button', { name: 'Save Notes' }));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByPlaceholder('Add card notes...').fill('New editor remains');
  await releaseSave(page);
  await expect(page.getByPlaceholder('Add card notes...')).toHaveValue('New editor remains');
  expect(active(await snapshot(page)).cards[0].notes).toBe('Committed earlier editor');
  expect(qa.errors).toEqual([]); await context.close();
});

test('P0.1 contextual Exit restores original identity or safely returns to Cards', async ({ browser }) => {
  const context = await browser.newContext(), remote = await syntheticRemote([cardA, cardB]);
  const qa = await setup(context, remote, [cardA, cardB]);
  const page = await context.newPage(); await start(page); qa.mock.offline = true; await checkoutA(page);
  await page.locator('#nav-review').click(); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#card-detail')).toContainText('0042');
  await page.locator('#nav-review').click(); await switchInventory(page, 'unbound');
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#nav-list')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('img', { name: 'Code 128 checkout barcode' })).toHaveCount(0);
  await expect(page.locator('#wallet-section-heading')).toBeFocused();
  // Same context with the original card still present but filtered out.
  await checkoutA(page); await page.locator('#nav-review').click(); await settings(page);
  await page.getByLabel('Sort gift cards').selectOption('balance-desc');
  await page.locator('#settings-back').click(); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#card-detail')).toContainText('0042');
  await page.locator('#nav-review').click();
  await page.evaluate(async () => {
    const { openInventory, inventoryContext, profileOf, operationId } = await import('/src/lib/inventory.js');
    const store = await openInventory(), state = await store.read(), card = profileOf(state).cards[0];
    await store.commit({ id: operationId(), kind: 'patch', action: 'set-used', ...inventoryContext(state),
      cardNumber: card.cardNumber, version: profileOf(state).versions[card.cardNumber], patch: { used: true } });
    await store.close();
  });
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#nav-list')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('img', { name: 'Code 128 checkout barcode' })).toHaveCount(0);
  expect(qa.errors).toEqual([]); await context.close();
});

test('P0.1 Exit checks persisted context even before a tab receives its notification', async ({ browser }) => {
  const context = await browser.newContext(), remote = await syntheticRemote([cardA]);
  const qa = await setup(context, remote, [cardB]);
  const page = await context.newPage(); await start(page); qa.mock.offline = true;
  const cloud = (await snapshot(page)).active;
  for (const targets of [['unbound'], ['unbound', cloud]]) {
    if ((await snapshot(page)).active !== cloud) await switchInventory(page, cloud);
    await checkoutA(page); await page.locator('#nav-review').click();
    await page.evaluate(async targets => {
      const { openInventory, inventoryContext, operationId } = await import('/src/lib/inventory.js');
      const store = await openInventory();
      for (const target of targets) {
        const state = await store.read();
        await store.commit({ id: operationId(), kind: 'select-compartment', ...inventoryContext(state), target });
      }
      // No BroadcastChannel notification: the rendering tab still has its old snapshot.
      await store.close();
    }, targets);
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await expect(page.locator('#nav-list')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('img', { name: 'Code 128 checkout barcode' })).toHaveCount(0);
  }
  expect(qa.errors).toEqual([]); await context.close();
});

test('P0.1 delayed transaction failure cannot publish an error into a reopened editor', async ({ browser }) => {
  const context = await browser.newContext(), remote = await syntheticRemote([cardA]);
  const qa = await setup(context, remote, []);
  await context.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'onabort');
    Object.defineProperty(IDBTransaction.prototype, 'onabort', { ...descriptor, set(handler) {
      descriptor.set.call(this, event => {
        if (sessionStorage.getItem('qa-hold-failure') === 'yes') window.qaCompleteFailure = () => handler.call(this, event);
        else handler.call(this, event);
      });
    } });
  });
  const page = await context.newPage(); await start(page); qa.mock.offline = true; await checkoutA(page);
  for (const kind of ['balance', 'notes']) {
    const open = async () => {
      if (kind === 'balance') await page.locator('#open-balance-modal').click();
      else await page.getByRole('button', { name: 'Edit', exact: true }).click();
    };
    const input = kind === 'balance' ? page.locator('#balance-input') : page.getByPlaceholder('Add card notes...');
    const draft = kind === 'balance' ? '88.88' : 'New draft after failed old save';
    await open(); await input.fill(kind === 'balance' ? '77.77' : 'Aborted draft');
    await page.evaluate(() => {
      delete window.qaCompleteFailure;
      sessionStorage.setItem('qa-fail', 'yes'); sessionStorage.setItem('qa-hold-failure', 'yes');
    });
    await (kind === 'balance' ? page.locator('#save-balance-update') : page.getByRole('button', { name: 'Save Notes' })).click();
    await expect.poll(() => page.evaluate(() => typeof window.qaCompleteFailure)).toBe('function');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await open(); await input.fill(draft);
    await page.evaluate(() => { sessionStorage.removeItem('qa-hold-failure'); window.qaCompleteFailure(); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(input).toHaveValue(draft);
    await expect(page.getByText('QA transaction failure', { exact: true })).toHaveCount(0);
    expect(active(await snapshot(page)).cards[0].currentBalance).toBe(100);
    expect(active(await snapshot(page)).cards[0].notes).toBe(cardA.notes);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  expect(qa.errors).toEqual([]); await context.close();
});

test('P0.1 pending Exit preserves reordered identity and yields to a newly started verification command', async ({ browser }) => {
  const context = await browser.newContext(), remote = await syntheticRemote([cardA, cardB]);
  const qa = await setup(context, remote, []);
  await context.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor, set(handler) {
      descriptor.set.call(this, event => {
        if (this.mode === 'readonly' && sessionStorage.getItem('qa-hold-read') === 'yes') {
          sessionStorage.removeItem('qa-hold-read');
          window.qaFinishRead = () => handler.call(this, event);
        } else handler.call(this, event);
      });
    } });
  });
  const page = await context.newPage(); await start(page); qa.mock.offline = true; await checkoutA(page);
  const holdExit = async () => {
    await page.locator('#nav-review').click();
    await page.evaluate(() => { delete window.qaFinishRead; sessionStorage.setItem('qa-hold-read', 'yes'); });
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await expect.poll(() => page.evaluate(() => typeof window.qaFinishRead)).toBe('function');
  };
  await holdExit();
  // Synthetic direct storage reorder, without a notification to the rendering tab.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('walmartGc.inventory', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state');
      const read = store.get('wallet');
      read.onsuccess = () => { const state = read.result; state.profiles[state.active].cards.reverse(); state.revision++; store.put(state, 'wallet'); };
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  }));
  await page.evaluate(() => window.qaFinishRead());
  await expect(page.locator('#nav-detail')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#card-detail')).toContainText('0042');
  await page.locator('#nav-review').click();
  await page.getByRole('button', { name: /^Select cards/ }).click();
  await expect(page.getByLabel('Verified balance (CAD)')).toBeEnabled();
  await page.getByLabel('Verified balance (CAD)').fill('44.44');
  await page.evaluate(() => { delete window.qaFinishRead; sessionStorage.setItem('qa-hold-read', 'yes'); });
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.qaFinishRead)).toBe('function');
  await holdSave(page, page.getByRole('button', { name: 'Save & next' }));
  await page.evaluate(() => window.qaFinishRead());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#nav-review')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#nav-detail')).toBeDisabled();
  await releaseSave(page);
  await expect(page.locator('#nav-review')).toHaveAttribute('aria-current', 'page');
  expect(qa.errors).toEqual([]); await context.close();
});
