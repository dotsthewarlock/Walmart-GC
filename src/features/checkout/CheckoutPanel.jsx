import React from 'react';
import { getBarcodePayload, getBarcodeFallbackMessage } from '../../lib/cards';
import { getCode128BarcodeBars } from '../../lib/barcode';
import { ActionButton } from '../../components/ActionButton';
import { Button } from '../../components/primitives/Button';
import { Surface } from '../../components/primitives/Surface';
import { TextArea } from '../../components/primitives/TextArea';
import { isDesktopCopyTarget } from './useCheckout';

export function CheckoutPanel({ selectedCard, visiblePosition, visibleCount, workflow,
  credentialBlocked, onReviewCredentials, onPrevious: handlePrevCard, onNext: handleNextCard, onToggleUsed, onBack }) {
  const { revealNumber, setRevealNumber, isEditingNotes, newNotesValue, setNewNotesValue,
    setIsEditingNotes, handleCopyCodePin, handleOpenBalanceEdit, handleOpenNotes, handleSaveNotes } = workflow;
  if(credentialBlocked)return <main className="p-4 flex flex-col gap-4">
    <p>This card has conflicting credentials. Review the preserved alternatives in Settings before using it.</p>
    <Button variant="filled" onClick={onReviewCredentials}>Review card credentials</Button>
    <Button variant="text" onClick={onBack}>Back to cards</Button>
  </main>;
  return (
    <main className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-panel-enter">
      {selectedCard ? (
        <div id="card-detail" className="w-full flex flex-col gap-6">

          {/* Detail Card Navigation Header */}
          <div className="flex justify-between items-center px-1">
            <button
              id="prev-card"
              onClick={handlePrevCard}
              disabled={visiblePosition <= 0}
              className="text-xs font-bold text-m3-primary hover:text-m3-primary/80 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-md px-1 flex items-center gap-1"
            >
              ← Prev
            </button>
            <span id="card-position" className="text-xs font-bold text-m3-on-surface-variant">
              Card {visiblePosition + 1} of {visibleCount}
            </span>
            <button
              id="next-card"
              onClick={handleNextCard}
              disabled={visiblePosition === visibleCount - 1}
              className="text-xs font-bold text-m3-primary hover:text-m3-primary/80 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary rounded-md px-1 flex items-center gap-1"
            >
              Next →
            </button>
          </div>

          {/* Large Barcode Frame */}
          {(() => {
            const payload = getBarcodePayload(selectedCard);
            const barcodeData = payload ? getCode128BarcodeBars(payload, { quietZone: 0 }) : null;

            return (
              <div className="rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center gap-3 shadow-none min-h-[140px] w-full text-left bg-m3-surface-container-low border border-m3-outline-variant">
                <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl text-left">
                  <div className="flex justify-between items-center w-full border-b border-m3-outline-variant pb-2">
                    <span id="detail-barcode-status" className="text-sm font-bold text-m3-on-surface-variant">
                      {selectedCard.merchant === 'walmart-ca' ? 'Walmart Canada' : 'Barcode Preview'}
                    </span>
                    <strong id="detail-barcode-balance" className="text-sm font-bold text-m3-on-surface">
                      ${selectedCard.currentBalance.toFixed(2)}
                    </strong>
                  </div>

                  {barcodeData ? (
                     <div className="w-full pt-2">
                       <div className="bg-white flex items-center justify-center w-full h-32 sm:h-48 rounded-xl p-2 border border-m3-outline-variant/50 shadow-inner">
                         <svg
                           viewBox={`0 0 ${barcodeData.width} ${barcodeData.height}`}
                           preserveAspectRatio="none"
                           role="img"
                           aria-label="Code 128 checkout barcode"
                           className="w-full h-full"
                         >
                           <rect width={barcodeData.width} height={barcodeData.height} fill="#ffffff" />
                           {barcodeData.rects.map((r, i) => (
                             <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill="#000000" />
                           ))}
                         </svg>
                       </div>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 border border-m3-outline-variant bg-m3-surface-container-low rounded-xl p-4 w-full text-center">
                      <span className="text-sm text-m3-error font-bold">
                        {getBarcodeFallbackMessage(selectedCard)}
                      </span>
                      <span className="text-[10px] text-m3-on-surface-variant">
                        Card number and PIN remain available below.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 w-full border-t border-m3-outline-variant pt-2 text-xs font-bold text-m3-on-surface-variant">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <button
                      id="detail-barcode-caption"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isDesktopCopyTarget()) {
                          await handleCopyCodePin(e, selectedCard);
                          return;
                        }
                        setRevealNumber(!revealNumber);
                      }}
                      className="tabular-nums cursor-pointer hover:text-m3-primary rounded px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-1"
                      title="Copy code and PIN"
                      aria-label="Copy code and PIN"
                      type="button"
                    >
                      {revealNumber
                        ? selectedCard.cardNumber
                        : `${selectedCard.cardNumber.slice(0, 4)} •••• •••• ${selectedCard.cardNumber.slice(-4)}`
                      }
                    </button>
                  </div>
                  <button
                    id="detail-barcode-pin"
                    onClick={(e) => handleCopyCodePin(e, selectedCard)}
                    className="tabular-nums cursor-pointer hover:text-m3-primary rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-1"
                    title="Copy code and PIN"
                    aria-label="Copy code and PIN"
                    type="button"
                  >
                    {selectedCard.pin || "—"}
                  </button>
                </div>
              </div>
            );
          })()}

          {selectedCard.pendingReconciliation && <p role="status" className="p-3 rounded-xl bg-m3-warning-container text-m3-on-warning-container text-sm">Balance needs verification. The recorded balance is provisional; verify it with Walmart before relying on the amount.</p>}
          {/* Update and Mark used side-by-side */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <ActionButton
              id="open-balance-modal"
              onClick={() => {
                handleOpenBalanceEdit(selectedCard.currentBalance);
              }}
              label="Update Balance"
              variant="tonal"
            />

            <ActionButton
              id="mark-used"
              onClick={onToggleUsed}
              label={selectedCard.used ? "Mark Active" : "Mark Used"}
              variant={selectedCard.used ? "outlined" : "primary"}
            />
          </div>

          {/* Add note row */}
          <div className="p-1 flex flex-col gap-2">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-1">
              <span className="text-[10px] sm:text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">Notes</span>
              {!isEditingNotes && (
                <Button
                  onClick={handleOpenNotes}
                  variant="text"
                  density="compact"
                >
                  {selectedCard.notes ? "Edit" : "Add Note"}
                </Button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="flex flex-col gap-2 mt-1">
                <TextArea
                  value={newNotesValue}
                  onChange={e => setNewNotesValue(e.target.value)}
                  className="w-full text-sm bg-m3-surface border border-m3-outline-variant hover:border-m3-outline focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3.5 focus:outline-none transition-all duration-200 min-h-[80px]"
                  placeholder="Add card notes..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={handleSaveNotes}
                    variant="filled"
                    density="compact"
                  >
                    Save Notes
                  </Button>
                  <Button
                    onClick={() => setIsEditingNotes(false)}
                    variant="outlined"
                    density="compact"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p id="detail-notes" className="text-xs text-m3-on-surface-variant leading-relaxed">
                {selectedCard.notes || <span className="italic opacity-60">No notes added to this card.</span>}
              </p>
            )}
          </div>

          {/* Back Button */}
          <ActionButton
            id="checkout-back"
            onClick={onBack}
            label="Back"
            variant="outlined"
          />

        </div>
      ) : (
        <Surface variant="dashed" shape="xl" className="text-center py-12 text-m3-on-surface-variant font-semibold w-full">
          No card selected. Select a card from the inventory list first.
        </Surface>
      )}
    </main>
  );
}
