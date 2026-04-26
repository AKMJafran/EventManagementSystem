import React from 'react';
import ModalPortal from './ModalPortal';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  loading = false,
  onClose,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  const confirmClassName =
    confirmTone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-500'
      : 'bg-primary text-white hover:bg-primary/90';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClassName}`}
            >
              {loading ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
