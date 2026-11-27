import React from 'react';
import { X } from 'lucide-react';
import { Dialog } from '../../components/primitives/Dialog';
import { IconButton } from '../../components/primitives/IconButton';
import { TextField } from '../../components/primitives/TextField';
import { Button } from '../../components/primitives/Button';

export function CheckoutOverlays({ selectedCard, workflow }) {
  const { isEditingBalance, newBalanceValue, amountUsedValue, balanceError, copyFeedback,
    handleCancelBalanceEdit, handleAmountUsedChange, handleRemainingBalanceChange, handleSaveBalance } = workflow;
  return <>
      {/* Update Balance Modal */}
      {isEditingBalance && selectedCard && (
        <Dialog
          id="balance-modal"
          className="max-w-sm w-full p-6 rounded-3xl"
          titleId="balance-modal-title"
        >
            {/* Close Button */}
            <IconButton
              onClick={handleCancelBalanceEdit}
              variant="standard"
              size="standard"
              className="absolute top-2 right-2"
              aria-label="Close update balance modal"
            >
              <X className="size-5" aria-hidden="true" />
            </IconButton>

            <h2 id="balance-modal-title" className="text-lg font-bold text-m3-on-surface border-b border-m3-outline-variant/20 pb-2">
              Update Balance
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm font-semibold text-m3-on-surface">
                <span>Current Balance</span>
                <span>${selectedCard.currentBalance.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="amount-used-input" className="text-xs font-bold text-m3-outline uppercase tracking-wider">
                  Amount Used
                </label>
                <TextField
                  id="amount-used-input"
                  type="number"
                  step="0.01"
                  value={amountUsedValue}
                  onChange={handleAmountUsedChange}
                  className="w-full text-sm bg-m3-surface-container border border-m3-outline-variant focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3 focus:bg-m3-surface-container-lowest focus:outline-none transition-all duration-200"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="balance-input" className="text-xs font-bold text-m3-outline uppercase tracking-wider">
                  Remaining Balance
                </label>
                <TextField
                  id="balance-input"
                  type="number"
                  step="0.01"
                  value={newBalanceValue}
                  onChange={handleRemainingBalanceChange}
                  className="w-full text-sm bg-m3-surface-container border border-m3-outline-variant focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 rounded-xl p-3 focus:bg-m3-surface-container-lowest focus:outline-none transition-all duration-200"
                  placeholder="0.00"
                />
              </div>

              {balanceError && (
                <span id="balance-error" className="text-[10px] text-m3-error font-semibold mt-1">
                  {balanceError}
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t border-m3-outline-variant/20 pt-4 mt-2">
              <Button
                id="cancel-balance-update"
                onClick={handleCancelBalanceEdit}
                variant="outlined"
                density="standard"
              >
                Cancel
              </Button>
              <Button
                id="save-balance-update"
                onClick={handleSaveBalance}
                variant="filled"
                density="standard"
              >
                Save
              </Button>
            </div>
        </Dialog>
      )}

      {/* M3 Snackbar Toast */}
      {copyFeedback && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-m3-on-surface text-m3-surface text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-4 min-w-[288px] max-w-sm pointer-events-none animate-snackbar">
          <span className="w-full text-center">{copyFeedback}</span>
        </div>
      )}
  </>;
}
