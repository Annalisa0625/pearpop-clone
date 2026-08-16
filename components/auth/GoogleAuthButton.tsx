import type { ButtonHTMLAttributes, ReactNode } from "react";

type GoogleAuthButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  children: ReactNode;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.09-1.93 3.27-4.78 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.84 0-5.25-1.92-6.12-4.5H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.88 14.13A6.6 6.6 0 0 1 5.53 12c0-.74.13-1.45.35-2.13V7.03H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.97l3.7-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.7 2.84c.87-2.58 3.28-4.49 6.12-4.49Z"
      />
    </svg>
  );
}

export default function GoogleAuthButton({
  children,
  className,
  ...props
}: GoogleAuthButtonProps) {
  return (
    <button
      {...props}
      type="button"
      className={
        className ??
        "flex min-h-[44px] w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      <GoogleIcon />
      <span>{children}</span>
    </button>
  );
}
