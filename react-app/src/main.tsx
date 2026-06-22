import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6">
      <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-m3-card bg-surface-container p-6 shadow-m3-elevated">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Phase 13 scaffold</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Walmart-GC React workspace</h1>
          <p className="mt-3 max-w-2xl text-base leading-7">
            This isolated React, Tailwind, and Material 3 direction scaffold is intentionally separate from the production
            static app shell. It is a safe exploration workspace and does not replace the current runtime.
          </p>
        </div>
        <div className="rounded-3xl bg-white/70 p-5">
          <h2 className="text-xl font-semibold">Guardrails</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>Production root files remain outside this scaffold.</li>
            <li>Worker, OAuth, sync, schema, CSV, and deployment paths are not touched.</li>
            <li>Only React and ReactDOM are runtime dependencies.</li>
          </ul>
        </div>
        <button className="w-fit rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-m3-elevated">
          Scaffold ready
        </button>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
