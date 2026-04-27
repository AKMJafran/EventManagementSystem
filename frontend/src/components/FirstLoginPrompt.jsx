import React from 'react';

export default function FirstLoginPrompt({ onChangePassword, onSkip }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
        style={{ animation: 'fadeInUp 0.35s ease-out' }}
      >
        {/* Header accent */}
        <div className="academic-gradient px-8 pb-6 pt-8 text-on-primary">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <span className="material-symbols-outlined text-3xl">shield_lock</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome!</h2>
          <p className="mt-2 text-sm leading-relaxed opacity-90">
            This is your first login. We recommend updating your temporary password to keep your account secure.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 px-8 py-6">
          <button
            type="button"
            onClick={onChangePassword}
            className="group flex w-full items-center gap-4 rounded-2xl border-2 border-primary/20 bg-primary/5 px-5 py-4 text-left transition-all hover:border-primary hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <span className="material-symbols-outlined text-xl">lock_reset</span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Change Password Now</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Set a new secure password right away
              </p>
            </div>
            <span className="material-symbols-outlined ml-auto text-primary opacity-0 transition-opacity group-hover:opacity-100">
              arrow_forward
            </span>
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="group flex w-full items-center gap-4 rounded-2xl border-2 border-outline-variant/20 bg-white px-5 py-4 text-left transition-all hover:border-outline-variant/40 hover:bg-surface-container-low"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant transition-colors group-hover:bg-surface-container-highest">
              <span className="material-symbols-outlined text-xl">skip_next</span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Skip for Now</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                You can change your password later from your profile
              </p>
            </div>
            <span className="material-symbols-outlined ml-auto text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
              arrow_forward
            </span>
          </button>
        </div>

        {/* Footer hint */}
        <div className="border-t border-outline-variant/15 bg-surface-container-low px-8 py-4">
          <p className="text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined mr-1 align-middle text-sm text-primary">info</span>
            You can always change your password from <strong>Profile → Change Password</strong>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
