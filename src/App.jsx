import React, { useState, useEffect } from 'react';

function App() {
  const [balance, setBalance] = useState(125.50);
  const [syncing, setSyncing] = useState(false);
  
  // Real layout parameters mirroring your original site
  const [cards, setCards] = useState([
    { id: 1, label: "Main Vault Card", number: "•••• •••• •••• 4321", balance: 50.00, status: "Active" },
    { id: 2, label: "Secondary Backup", number: "•••• •••• •••• 8890", balance: 75.50, status: "Active" }
  ]);

  const handleRefresh = () => {
    setSyncing(true);
    console.log("🔗 Initiating secure Cloudflare Worker handshake...");
    setTimeout(() => setSyncing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-8 antialiased font-sans">
      <div className="max-w-2xl w-full bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden mt-4">
        
        {/* Authentic Header Structure */}
        <header className="bg-[#0b57d0] text-white px-8 py-7 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Walmart-GC
            </h1>
            <p className="text-xs text-blue-100 font-medium tracking-wide uppercase mt-0.5">
              Secure Cloudflare OAuth Vault
            </p>
          </div>
          <div className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full font-mono font-bold tracking-wider">
            ag-v1
          </div>
        </header>

        <main className="p-8 flex flex-col gap-8">
          {/* Main Account Metrics */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aggregate Wallet Balance</span>
              <span className="text-4xl font-black text-slate-900">${balance.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={syncing}
              className="bg-white hover:bg-slate-100 text-[#0b57d0] text-xs font-bold px-5 py-3 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Refresh Assets"}
            </button>
          </section>

          {/* Core Gift Card Inventory Ledger */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Registered Digital Assets</h3>
            <div className="flex flex-col gap-3">
              {cards.map(card => (
                <div key={card.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400">{card.label}</span>
                    <span className="font-mono text-sm font-bold text-slate-800">{card.number}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-max mt-1">{card.status}</span>
                  </div>
                  <span className="text-xl font-extrabold text-slate-900">${card.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Secure System Action Trigger */}
          <footer className="pt-2">
            <button
              onClick={handleRefresh}
              className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold py-4 px-6 rounded-full transition-all shadow-md flex justify-center items-center gap-2 text-sm"
              disabled={syncing}
            >
              {syncing ? "Updating Remote Architecture..." : "Sync Cloudflare Worker State"}
            </button>
          </footer>
        </main>

      </div>
    </div>
  );
}

export default App;
