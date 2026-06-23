import React, { useState } from 'react';

function App() {
  const [balance, setBalance] = useState(125.50);
  const [syncing, setSyncing] = useState(false);

  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1200);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans p-4 sm:p-6 flex justify-center items-start">
      <div className="max-w-md w-full bg-white rounded-[28px] shadow-lg border border-neutral-200 overflow-hidden mt-4">
        
        {/* Header App Bar */}
        <div className="bg-[#0b57d0] text-white px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Walmart-GC</h1>
            <p className="text-xs text-blue-100 font-medium">Gift Card Manager</p>
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-mono tracking-wider">
            v1.2.0
          </div>
        </div>

        {/* Balance Card Section */}
        <div className="p-6 flex flex-col gap-6">
          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/60 flex flex-col gap-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Active Balance</span>
            <div className="text-3xl font-extrabold text-neutral-900">${balance.toFixed(2)}</div>
          </div>

          {/* Core Configuration Parameters */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">Active Workspace Engines</h3>
            
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200/40 text-sm">
              <span className="font-medium text-neutral-700">Pipeline LLM</span>
              <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-bold">gemini-3.1-flash-lite</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200/40 text-sm">
              <span className="font-medium text-neutral-700">Styling Blueprint</span>
              <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold">Tailwind + M3 Tokens</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={triggerSync}
            className="w-full bg-[#0b57d0] hover:bg-[#0842a0] active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-full transition-all text-sm shadow-sm flex justify-center items-center gap-2 disabled:opacity-60"
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Updating Repository...
              </>
            ) : (
              "Sync Cloudflare Worker"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;
