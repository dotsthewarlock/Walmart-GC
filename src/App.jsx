import React, { useState, useEffect } from 'react';
import { loadCards, saveCards, calculateVisibleCards, calculateCardSummary } from './lib/cards';
import { loadSettings, saveSettings } from './lib/settings';

function App() {
  const [cards, setCards] = useState([]);
  const [settings, setSettings] = useState({
    advanceOnMarkUsed: true,
    hideUsedCards: true,
    hideZeroBalanceCards: false,
    sortMode: "balance-asc",
  });

  // Load cards and settings on initialization
  useEffect(() => {
    setCards(loadCards());
    setSettings(loadSettings());
  }, []);

  // Compute card summaries based on state
  const { totalCount, activeCount, totalBalance, activeBalance } = calculateCardSummary(cards, settings);

  // Compute visible indices
  const visibleIndexes = calculateVisibleCards(cards, settings, settings.sortMode);

  // Handle setting toggles
  const handleToggleSetting = (key) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  // Handle sort mode changes
  const handleSortChange = (e) => {
    const nextSettings = {
      ...settings,
      sortMode: e.target.value,
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleToggleUsed = (index) => {
    const updatedCards = cards.map((card, idx) => {
      if (idx === index) {
        const nextUsed = !card.used;
        return {
          ...card,
          used: nextUsed,
          dateUsed: nextUsed ? new Date().toISOString().slice(0, 10) : "",
        };
      }
      return card;
    });
    setCards(updatedCards);
    saveCards(updatedCards);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-8 antialiased font-sans">
      <div className="max-w-2xl w-full bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden mt-4">
        
        {/* Header Region */}
        <header className="bg-[#0b57d0] text-white px-8 py-7 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Walmart-GC
            </h1>
            <p className="text-xs text-blue-100 font-medium tracking-wide uppercase mt-0.5">
              Secure Local Gift Card Vault
            </p>
          </div>
          <div className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full font-mono font-bold tracking-wider">
            agy-v1
          </div>
        </header>

        <main className="p-8 flex flex-col gap-6">
          
          {/* Wallet Diagnostics / Balances Summary */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visible Balance</span>
              <span className="text-3xl font-black text-slate-900">${activeBalance.toFixed(2)}</span>
              <span className="text-xs text-slate-400">Total Wallet Assets: ${totalBalance.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1 sm:text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Counts</span>
              <span className="text-2xl font-black text-slate-800">{activeCount} / {totalCount}</span>
              <span className="text-xs text-slate-400">displayed / registered</span>
            </div>
          </section>

          {/* Local Settings / Filtering Controls */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={settings.hideUsedCards}
                  onChange={() => handleToggleSetting('hideUsedCards')}
                  className="w-4 h-4 rounded border-slate-300 text-[#0b57d0] focus:ring-[#0b57d0]"
                />
                Hide Used Cards
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={settings.hideZeroBalanceCards}
                  onChange={() => handleToggleSetting('hideZeroBalanceCards')}
                  className="w-4 h-4 rounded border-slate-300 text-[#0b57d0] focus:ring-[#0b57d0]"
                />
                Hide $0 Cards
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={settings.advanceOnMarkUsed}
                  onChange={() => handleToggleSetting('advanceOnMarkUsed')}
                  className="w-4 h-4 rounded border-slate-300 text-[#0b57d0] focus:ring-[#0b57d0]"
                />
                Auto-Advance
              </label>

              <div className="flex flex-col gap-1">
                <select
                  value={settings.sortMode}
                  onChange={handleSortChange}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0b57d0]"
                >
                  <option value="balance-asc">Balance: Low to High</option>
                  <option value="balance-desc">Balance: High to Low</option>
                  <option value="date-added-asc">Date Added: Oldest First</option>
                  <option value="date-added-desc">Date Added: Newest First</option>
                  <option value="date-updated-asc">Date Updated: Oldest First</option>
                  <option value="date-updated-desc">Date Updated: Newest First</option>
                  <option value="card-number">Card Number</option>
                </select>
              </div>
            </div>
          </section>

          {/* Cards Inventory Ledger */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Vault Inventory</h3>
            <div className="flex flex-col gap-3">
              {visibleIndexes.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  No cards match the active filters.
                </div>
              ) : (
                visibleIndexes.map((cardIndex) => {
                  const card = cards[cardIndex];
                  return (
                    <div 
                      key={card.cardNumber} 
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white rounded-2xl border transition-all gap-4 ${
                        card.used ? 'border-slate-100 bg-slate-50/50 opacity-60' : 'border-slate-200 hover:border-blue-300 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-800">
                            {card.cardNumber.slice(0, 4)} •••• •••• {card.cardNumber.slice(-4)}
                          </span>
                          {card.merchant && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded uppercase">
                              {card.merchant}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-400">PIN: {card.pin}</span>
                        {card.notes && <span className="text-xs text-slate-500 mt-1 max-w-md">{card.notes}</span>}
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-6 border-t sm:border-0 pt-3 sm:pt-0">
                        <span className="text-xl font-extrabold text-slate-900">${card.currentBalance.toFixed(2)}</span>
                        <button
                          onClick={() => handleToggleUsed(cardIndex)}
                          className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                            card.used 
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-transparent' 
                              : 'bg-white hover:bg-slate-100 text-[#0b57d0] border-slate-200 active:scale-95 shadow-sm'
                          }`}
                        >
                          {card.used ? "Mark Active" : "Mark Used"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default App;
