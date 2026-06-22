const safeguards = [
  'Isolated under react-app/ and not loaded by the production index.html.',
  'No Worker, OAuth, session, sync, schema, CSV, or deployment behavior changes.',
  'No access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.',
];

const tokenExamples = [
  { label: 'Primary', className: 'bg-m3-primary text-m3-on-primary' },
  { label: 'Primary container', className: 'bg-m3-primary-container text-m3-on-primary-container' },
  { label: 'Surface high', className: 'bg-m3-surface-container-high text-m3-on-surface' },
  { label: 'Success extension', className: 'bg-m3-success/15 text-m3-success ring-1 ring-m3-success/30' },
  { label: 'Warning extension', className: 'bg-m3-warning/15 text-m3-warning ring-1 ring-m3-warning/30' },
];

export function App() {
  return (
    <main className="min-h-screen bg-m3-surface px-4 py-6 text-m3-on-surface sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6 rounded-m3xl bg-m3-surface-container p-5 shadow-m3level2 sm:p-8">
        <header className="rounded-m3lg bg-gradient-to-br from-m3-primary to-m3-primary-container p-6 text-m3-on-primary shadow-m3level1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-90">Phase 13 preview</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">React + Tailwind + Material 3 scaffold</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-m3-on-primary/90">
            This isolated app shell proves the migration stack can build without replacing the current plain HTML/CSS/JavaScript production runtime.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="rounded-m3lg border border-m3-outline-variant bg-m3-surface p-5">
            <h2 className="text-xl font-semibold text-m3-on-surface">Scaffold boundaries</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-m3-on-surface-variant">
              {safeguards.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-m3full bg-m3-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <aside className="rounded-m3lg border border-m3-outline-variant bg-m3-surface-container-high p-5">
            <h2 className="text-xl font-semibold text-m3-on-surface">Token proof</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {tokenExamples.map((token) => (
                <span key={token.label} className={`${token.className} rounded-m3full px-3 py-1.5 text-sm font-semibold`}>
                  {token.label}
                </span>
              ))}
            </div>
          </aside>
        </div>

        <section className="rounded-m3lg border border-m3-outline-variant bg-m3-surface p-5">
          <h2 className="text-xl font-semibold text-m3-on-surface">Next migration intent</h2>
          <p className="mt-3 text-sm leading-6 text-m3-on-surface-variant">
            Future PRs can port inert components and compare parity against the active runtime before any production cutover is proposed.
          </p>
        </section>
      </section>
    </main>
  );
}
