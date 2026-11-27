import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '../../components/primitives/Button';
import { Chip } from '../../components/primitives/Chip';
import { ListItem } from '../../components/primitives/ListItem';
import { Surface } from '../../components/primitives/Surface';

// Read-only inventory view. Shared selection/preferences and protected commands
// retain their app-lifetime owners when this conditional panel unmounts.
export function CardsPanel({ cards, visibleIndexes, selectedCardIndex, loaded,
  googleConnected, maskCardNumber, commands }) {
  return (
    <main className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-panel-enter">
      <Button id="review-balances" onClick={commands.reviewBalances} disabled={!loaded} className="self-start">
        <ClipboardCheck size={20} aria-hidden="true" />
        Review balances
      </Button>

      {/* Cards Inventory Ledger */}
      <section className="flex flex-col gap-3">

        <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
          {cards.length === 0 ? (
            <Surface as="div" variant="dashed" className="md:col-span-2 text-center py-10 px-6 flex flex-col items-center gap-4">
              <div className="flex flex-col gap-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-m3-on-surface">No gift cards yet</h4>
                <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                  Add your Walmart gift cards to get started. Checkout and barcode scan views will become available once you have cards registered.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md justify-center mt-2">
                {!googleConnected && (
                  <button
                    id="empty-state-connect-google"
                    onClick={commands.connectGoogle}
                    className="flex-1 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-bold py-3 px-4 rounded-full transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2"
                    type="button"
                  >
                    Connect Google
                  </button>
                )}
                <button
                  id="empty-state-import-csv"
                  onClick={commands.importCsv}
                  className="flex-1 bg-m3-surface hover:bg-m3-surface-container text-m3-on-surface text-xs font-bold py-3 px-4 rounded-full border border-m3-outline transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2"
                  type="button"
                >
                  ↓ Import CSV
                </button>
              </div>
            </Surface>
          ) : visibleIndexes.length === 0 ? (
            <Surface as="div" variant="dashed" className="md:col-span-2 text-center py-10 px-6 flex flex-col items-center gap-4">
              <div className="flex flex-col gap-1.5 max-w-sm">
                <span className="text-sm font-bold text-m3-on-surface">All registered cards are filtered out</span>
                <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                  Your settings are currently hiding all {cards.length} card{cards.length === 1 ? "" : "s"}. Reset filters or adjust them in settings to show cards.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center mt-1">
                <Button
                  onClick={commands.resetFilters}
                  variant="filled"
                  density="standard"
                  className="flex-1"
                >
                  Reset Filters
                </Button>
                <Button
                  onClick={commands.openSettings}
                  variant="outlined"
                  density="standard"
                  className="flex-1"
                >
                  Go to Settings
                </Button>
              </div>
            </Surface>
          ) : (
            visibleIndexes.map((cardIndex) => {
              const card = cards[cardIndex];
              const isSelected = selectedCardIndex === cardIndex;
              return (
                <ListItem
                  key={card.cardNumber}
                  selected={isSelected}
                  used={card.used}
                  onClick={() => commands.selectCard(cardIndex)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${card.used ? 'line-through decoration-m3-on-surface-variant/60' : ''}`}>
                      {maskCardNumber(card.cardNumber)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {card.used && (
                      <Chip
                        variant="outlined"
                        size="compact"
                        className="uppercase tracking-wider"
                      >
                        Used
                      </Chip>
                    )}
                    <span className="text-sm font-medium tabular-nums">
                      ${card.currentBalance.toFixed(2)}
                    </span>
                  </div>
                </ListItem>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
