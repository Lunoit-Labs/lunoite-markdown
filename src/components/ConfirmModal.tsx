import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus confirm button
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] shadow-xl text-[#191b1f] dark:text-[#eceef2] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isDestructive
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-[#2d6a4f]/10 dark:bg-[#52b788]/15 text-[#2d6a4f] dark:text-[#52b788]'
                }`}
              >
                {isDestructive ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <h2
                id="confirm-modal-title"
                className="text-sm font-semibold tracking-tight text-[#191b1f] dark:text-[#eceef2]"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p
            id="confirm-modal-description"
            className="text-xs text-[#59606d] dark:text-[#9ba2b0] leading-relaxed pl-11"
          >
            {message}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4]/80 dark:bg-[#111215]/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e5e3dc] dark:border-[#282b33] text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg shadow-xs transition-colors focus-visible:outline-2 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-600'
                : 'bg-[#2d6a4f] hover:bg-[#24553f] text-white dark:bg-[#52b788] dark:hover:bg-[#429d73] dark:text-[#111215] focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
