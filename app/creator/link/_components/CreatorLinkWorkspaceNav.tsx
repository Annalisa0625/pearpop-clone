"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type IconProps = { className?: string };
type NavItem = { href: string; label: string; icon: ReactNode };

function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m3 10.8 9-7.2 9 7.2" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function OrderIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  );
}

function JobIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3.5" y="6.5" width="17" height="13" rx="3" />
      <path d="M8.5 6.5V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 11h17M9.5 11v2h5v-2" />
    </svg>
  );
}

function LinkFeatureIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}

function ProfileIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/creator/dashboard", label: "Home", icon: <HomeIcon className="h-[22px] w-[22px]" /> },
  { href: "/creator/orders", label: "Order", icon: <OrderIcon className="h-[22px] w-[22px]" /> },
  { href: "/creator/jobs", label: "Job", icon: <JobIcon className="h-[22px] w-[22px]" /> },
  { href: "/creator/link", label: "Link", icon: <LinkFeatureIcon className="h-[22px] w-[22px]" /> },
  { href: "/creator/profile", label: "Profile", icon: <ProfileIcon className="h-[22px] w-[22px]" /> },
];

export default function CreatorLinkWorkspaceNav() {
  return (
    <>
      <style jsx global>{`
        .creator-link-workspace > div:first-child > div.fixed.inset-x-0.bottom-0.z-50.border-t {
          bottom: calc(64px + env(safe-area-inset-bottom)) !important;
        }

        .creator-link-workspace > div:first-child > main {
          padding-bottom: calc(132px + env(safe-area-inset-bottom)) !important;
        }
      `}</style>

      <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200/70 bg-white/94 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[560px] grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/creator/link";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition active:scale-[0.96] ${
                  active ? "text-slate-950" : "text-slate-400"
                }`}
              >
                <span className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${active ? "bg-slate-950 text-white" : "bg-transparent"}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
