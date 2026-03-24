"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserProfile } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  exact?: boolean;
};

interface SidebarProps {
  items: SidebarItem[];
  profile: UserProfile | null;
}


export function Sidebar({ items, profile: _profile }: SidebarProps) {
  const pathname = usePathname();
  const hasExactMatch = items.some((item) => pathname === item.href);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-bg-card">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
          <svg width="44" height="44" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="sb-bg" cx="38%" cy="38%" r="70%">
                <stop offset="0%" stopColor="#A855F7"/>
                <stop offset="100%" stopColor="#5B21B6"/>
              </radialGradient>
            </defs>
            <rect width="512" height="512" rx="108" fill="url(#sb-bg)"/>
            <g fill="none" stroke="white" strokeWidth="18" opacity="0.80">
              <ellipse cx="256" cy="256" rx="215" ry="76"/>
              <ellipse cx="256" cy="256" rx="215" ry="76" transform="rotate(60 256 256)"/>
              <ellipse cx="256" cy="256" rx="215" ry="76" transform="rotate(-60 256 256)"/>
            </g>
            <circle cx="256" cy="256" r="72" fill="#4C1D95" opacity="0.72"/>
            <text x="256" y="282" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="88" fontWeight="900" fill="white" letterSpacing="-2">AI</text>
            <polygon points="256,114 192,150 256,178 320,150" fill="white" opacity="0.93"/>
            <line x1="320" y1="150" x2="334" y2="184" stroke="white" strokeWidth="12" strokeLinecap="round" opacity="0.90"/>
            <circle cx="334" cy="196" r="13" fill="white" opacity="0.90"/>
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-text-muted">高中物理</p>
          <p className="text-base font-semibold text-text-strong">AI 教学助手</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (!hasExactMatch && item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-text-muted hover:bg-primary-soft hover:text-primary"
              )}
            >
              <span className="[&_svg]:size-6">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/15 text-white" : "bg-bg-elevated text-primary"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
