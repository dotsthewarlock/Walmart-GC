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
  const [activePanel, setActivePanel] = useState('list'); // 'list' or 'detail'
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  const [revealNumber, setRevealNumber] = useState(false);
  
  // Balance Editor Form State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalanceValue, setNewBalanceValue] = useState("");
  const [balanceError, setBalanceError] = useState("");

  // Notes Editor Form State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newNotesValue, setNewNotesValue] = useState("");

  // Load cards and settings on initialization
  useEffect(() => {
    const loadedCards = loadCards();
    const loadedSettings = loadSettings();
    setCards(loadedCards);
    setSettings(loadedSettings);
    
    // Auto-select first visible card if possible
    const visible = calculateVisibleCards(loadedCards, loadedSettings, loadedSettings.sortMode);
    if (visible.length > 0) {
      setSelectedCardIndex(visible[0]);
    }
  }, []);

  // Compute card summaries based on state
  const { totalCount, activeCount, totalBalance, activeBalance } = calculateCardSummary(cards, settings);

  // Compute visible indices
  const visibleIndexes = calculateVisibleCards(cards, settings, settings.sortMode);

  const ensureVisibleSelection = (preferredIndex = selectedCardIndex) => {
    if (visibleIndexes.length === 0) {
      return -1;
    }
    if (visibleIndexes.includes(preferredIndex)) {
      return preferredIndex;
    }
    return visibleIndexes[0];
  };

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

  // Handle used toggles on specific card items
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

    // If auto-advance is enabled and the card is marked used, switch to the next visible card
    const card = cards[index];
    if (card && !card.used && settings.advanceOnMarkUsed) {
      const currentPosition = visibleIndexes.indexOf(index);
      if (currentPosition !== -1 && visibleIndexes.length > 1) {
        const nextPositionIndex = (currentPosition + 1) % visibleIndexes.length;
        setSelectedCardIndex(visibleIndexes[nextPositionIndex]);
      }
    }
  };

  // Mark all $0 cards used helper from phase-12
  const handleMarkZeroBalanceUsed = () => {
    const updatedCards = cards.map((card) => {
      if (card.currentBalance === 0 && !card.used) {
        return {
          ...card,
          used: true,
          dateUsed: new Date().toISOString().slice(0, 10),
        };
      }
      return card;
    });
    setCards(updatedCards);
    saveCards(updatedCards);
  };

  const zeroBalanceCount = cards.filter(card => card.currentBalance === 0 && !card.used).length;

  // Checkout Navigation Controls
  const handlePrevCard = () => {
    if (visibleIndexes.length === 0) return;
    const currentPosition = visibleIndexes.indexOf(selectedCardIndex);
    const nextPosition = (currentPosition - 1 + visibleIndexes.length) % visibleIndexes.length;
    setSelectedCardIndex(visibleIndexes[nextPosition]);
    setRevealNumber(false);
    setIsEditingBalance(false);
    setIsEditingNotes(false);
  };

  const handleNextCard = () => {
    if (visibleIndexes.length === 0) return;
    const currentPosition = visibleIndexes.indexOf(selectedCardIndex);
    const nextPosition = (currentPosition + 1) % visibleIndexes.length;
    setSelectedCardIndex(visibleIndexes[nextPosition]);
    setRevealNumber(false);
    setIsEditingBalance(false);
    setIsEditingNotes(false);
  };

  // Balance Update Action
  const handleOpenBalanceEdit = (currentVal) => {
    setNewBalanceValue(currentVal.toString());
    setBalanceError("");
    setIsEditingBalance(true);
  };

  const handleSaveBalance = () => {
    const value = parseFloat(newBalanceValue);
    if (isNaN(value) || value < 0) {
      setBalanceError("Enter a valid non-negative balance value");
      return;
    }
    const updatedCards = cards.map((card, idx) => {
      if (idx === selectedCardIndex) {
        return {
          ...card,
          currentBalance: Math.round(value * 100) / 100,
          dateUpdated: new Date().toISOString().slice(0, 10),
        };
      }
      return card;
    });
    setCards(updatedCards);
    saveCards(updatedCards);
    setIsEditingBalance(false);
  };

  const selectedCard = cards[selectedCardIndex];
  const visiblePosition = visibleIndexes.indexOf(selectedCardIndex);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-8 antialiased font-sans">
      <div className="max-w-2xl w-full bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden mt-4">
        
        {/* Header Region */}
        <header className="bg-[#0b57d0] text-white px-8 py-6 flex justify-between items-center">
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

        {/* Top Tab Navigation matching phase-12 */}
        <nav className="flex border-b border-slate-200" aria-label="App sections">
          <button 
            id="nav-list"
            onClick={() => setActivePanel('list')}
            className={`flex-1 text-center py-4 font-bold text-sm border-b-2 transition-all ${
              activePanel === 'list' 
                ? 'border-[#0b57d0] text-[#0b57d0]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Cards
          </button>
          <button 
            id="nav-detail"
            onClick={() => {
              const nextIndex = ensureVisibleSelection();
              if (nextIndex !== -1) {
                setSelectedCardIndex(nextIndex);
                setActivePanel('detail');
              }
            }}
            disabled={visibleIndexes.length === 0}
            className={`flex-1 text-center py-4 font-bold text-sm border-b-2 transition-all ${
              activePanel === 'detail' 
                ? 'border-[#0b57d0] text-[#0b57d0]' 
                : 'border-transparent text-slate-500 hover:text-slate-700 disabled:opacity-50'
            }`}
          >
            Checkout
          </button>
        </nav>

        {activePanel === 'list' ? (
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

                {zeroBalanceCount > 0 && (
                  <button
                    id="mark-zero-used"
                    onClick={handleMarkZeroBalanceUsed}
                    className="w-full sm:col-span-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex justify-between items-center transition-all active:scale-95 shadow-sm font-sans"
                    type="button"
                  >
                    <span>Mark {zeroBalanceCount} zero-balance card(s) used</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]" aria-hidden="true">Mark</span>
                  </button>
                )}
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
                        onClick={() => {
                          setSelectedCardIndex(cardIndex);
                          setActivePanel('detail');
                        }}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white rounded-2xl border transition-all gap-4 cursor-pointer ${
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

                        <div className="flex items-center justify-between w-full sm:w-auto gap-6 border-t sm:border-0 pt-3 sm:pt-0" onClick={e => e.stopPropagation()}>
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
        ) : (
          /* Checkout Detail Panel Layout */
          <main className="p-8 flex flex-col gap-6">
            {selectedCard ? (
              <div id="card-detail" className="flex flex-col gap-6">
                
                {/* Detail Card Navigation Header */}
                <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                  <button 
                    id="prev-card"
                    onClick={handlePrevCard}
                    className="text-xs font-bold bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                  >
                    Previous
                  </button>
                  <span id="card-position" className="text-sm font-bold text-slate-600">
                    Card {visiblePosition + 1} of {visibleIndexes.length}
                  </span>
                  <button 
                    id="next-card"
                    onClick={handleNextCard}
                    className="text-xs font-bold bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>

                {/* Barcode Preview Placeholder Segment */}
                <section className="bg-white border border-slate-200 border-dashed border-2 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[140px]">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Barcode Preview</span>
                  
                  <div className="flex flex-col items-center gap-1 border border-slate-100 bg-slate-50/50 rounded-2xl p-4 w-full text-center">
                    <span className="text-xs text-slate-400 font-semibold font-mono">
                      [79936686504000 + {selectedCard.cardNumber}]
                    </span>
                    <span className="text-sm text-slate-500 font-bold">
                      Barcode rendering not wired yet
                    </span>
                    <span className="text-[10px] text-slate-400">
                      JsBarcode engine integration deferred to Phase 8
                    </span>
                  </div>
                </section>

                {/* Card Detail Credentials Wrapper */}
                <section className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 id="card-detail-heading" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Credentials</h3>
                    {selectedCard.merchant && (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded uppercase">
                        {selectedCard.merchant}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Card Number</span>
                    <div 
                      id="detail-number"
                      onClick={() => setRevealNumber(!revealNumber)}
                      className="font-mono text-2xl font-black text-slate-800 tracking-wider cursor-pointer hover:text-blue-600 transition-colors py-1"
                      title="Click to reveal/hide number"
                    >
                      {revealNumber 
                        ? selectedCard.cardNumber 
                        : `${selectedCard.cardNumber.slice(0, 4)} •••• •••• ${selectedCard.cardNumber.slice(-4)}`
                      }
                    </div>
                    <span className="text-[10px] text-slate-400">Click card number to toggle visibility</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">PIN</span>
                      <span id="detail-pin" className="font-mono text-lg font-bold text-slate-700">{selectedCard.pin}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">Starting Value</span>
                      <span id="detail-starting-balance" className="text-lg font-bold text-slate-700">${selectedCard.startingBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </section>

                {/* Card Balance Segment */}
                <section className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">Current Balance</span>
                    <span id="detail-current-balance" className="text-3xl font-black text-slate-900">
                      ${selectedCard.currentBalance.toFixed(2)}
                    </span>
                  </div>

                  {isEditingBalance ? (
                    <div className="flex flex-col gap-2 w-1/2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={newBalanceValue}
                          onChange={e => setNewBalanceValue(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0b57d0]"
                          placeholder="0.00"
                        />
                        <button
                          onClick={handleSaveBalance}
                          className="bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingBalance(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition-all"
                        >
                          X
                        </button>
                      </div>
                      {balanceError && <span className="text-[10px] text-red-600 font-semibold">{balanceError}</span>}
                    </div>
                  ) : (
                    <button
                      id="open-balance-modal"
                      onClick={() => handleOpenBalanceEdit(selectedCard.currentBalance)}
                      className="bg-white hover:bg-slate-100 text-[#0b57d0] text-xs font-bold px-5 py-3 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm"
                    >
                      Update Balance
                    </button>
                  )}
                </section>

                {/* Notes panel */}
                <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</span>
                    {!isEditingNotes && (
                      <button
                        onClick={() => {
                          setNewNotesValue(selectedCard.notes || "");
                          setIsEditingNotes(true);
                        }}
                        className="text-xs font-bold text-[#0b57d0] hover:underline"
                        type="button"
                      >
                        {selectedCard.notes ? "Edit" : "Add Notes"}
                      </button>
                    )}
                  </div>
                  
                  {isEditingNotes ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <textarea
                        value={newNotesValue}
                        onChange={e => setNewNotesValue(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0b57d0] min-h-[80px]"
                        placeholder="Add card notes..."
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            const updatedCards = cards.map((c, idx) => {
                              if (idx === selectedCardIndex) {
                                return {
                                  ...c,
                                  notes: newNotesValue.trim(),
                                };
                              }
                              return c;
                            });
                            setCards(updatedCards);
                            saveCards(updatedCards);
                            setIsEditingNotes(false);
                          }}
                          className="bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
                          type="button"
                        >
                          Save Notes
                        </button>
                        <button
                          onClick={() => setIsEditingNotes(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p id="detail-notes" className="text-sm text-slate-600 leading-relaxed font-medium">
                      {selectedCard.notes || <span className="text-slate-400 italic">No notes added to this card.</span>}
                    </p>
                  )}
                </section>

                {/* Mark Used Action */}
                <div className="pt-4 flex flex-col gap-3">
                  <button
                    id="mark-used"
                    onClick={() => handleToggleUsed(selectedCardIndex)}
                    className={`w-full font-bold py-4 px-6 rounded-full transition-all shadow-md text-sm active:scale-95 ${
                      selectedCard.used
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-[#0b57d0] hover:bg-[#0842a0] text-white'
                    }`}
                  >
                    {selectedCard.used ? "Mark Active" : "Mark Card Used"}
                  </button>

                  <button
                    onClick={() => setActivePanel('list')}
                    className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 px-6 rounded-full border border-slate-200 transition-all text-xs"
                  >
                    Back to Inventory
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                No card selected. Select a card from the inventory list first.
              </div>
            )}
          </main>
        )}

      </div>
    </div>
  );
}

export default App;
