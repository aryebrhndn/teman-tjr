import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  icon = 'delete',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed/60 border border-primary/20 flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[24px] text-primary">{icon}</span>
        </div>

        <h3 id="confirm-modal-title" className="text-[15px] font-bold text-on-surface leading-snug">
          {title}
        </h3>

        <p className="text-[12px] text-on-surface-variant mt-1.5 leading-relaxed">{message}</p>

        <div className="flex gap-2 w-full mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-9.5 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface hover:bg-surface-container-high active:scale-98 transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-9.5 rounded-xl bg-primary-container text-white text-[12px] font-bold hover:brightness-105 active:scale-98 transition-all shadow-2xs cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
