"use client";

export default function CreatorProfileVisualRefresh() {
  return (
    <style jsx global>{`
      .creator-profile-options {
        scrollbar-color: rgba(100, 116, 139, 0.42) transparent;
        scrollbar-width: thin;
        overscroll-behavior: contain;
      }

      .creator-profile-options::-webkit-scrollbar {
        width: 6px;
      }

      .creator-profile-options::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(100, 116, 139, 0.36);
      }

      .creator-profile-control {
        -webkit-tap-highlight-color: transparent;
      }

      .creator-line-prompt::after {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.7) 45%, transparent 70%);
        content: "";
        pointer-events: none;
        transform: translateX(-120%);
        animation: creator-line-highlight 5.5s ease-in-out 1.2s infinite;
      }

      @keyframes creator-line-highlight {
        0%, 72%, 100% { transform: translateX(-120%); opacity: 0; }
        8%, 22% { opacity: 0.72; }
        32% { transform: translateX(120%); opacity: 0; }
      }

      .creator-sheet-backdrop {
        animation: creator-fade-in 180ms ease-out both;
      }

      .creator-account-sheet {
        animation: creator-sheet-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        transform-origin: bottom center;
      }

      details[open] > :not(summary) {
        animation: creator-disclosure-in 220ms ease-out both;
      }

      @keyframes creator-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes creator-sheet-in {
        from { opacity: 0; transform: translateY(28px) scale(0.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes creator-disclosure-in {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .creator-profile-control,
        .creator-line-prompt::after,
        .creator-sheet-backdrop,
        .creator-account-sheet,
        details[open] > :not(summary) {
          transition: none !important;
          animation: none !important;
        }
      }
    `}</style>
  );
}
