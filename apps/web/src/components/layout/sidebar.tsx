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
          <svg width="44" height="44" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9A63FF"/>
                <stop offset="100%" stopColor="#5E1AB8"/>
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="url(#sb-bg)"/>
            <g stroke="#ffffff" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.85">
              <ellipse cx="256" cy="256" rx="80" ry="180" transform="rotate(45 256 256)"/>
              <ellipse cx="256" cy="256" rx="80" ry="180" transform="rotate(-45 256 256)"/>
              <ellipse cx="256" cy="256" rx="80" ry="180" transform="rotate(90 256 256)"/>
            </g>
            <text x="256" y="282" fontFamily="Arial, sans-serif" fontSize="76" fontWeight="bold" fill="#ffffff" textAnchor="middle" letterSpacing="2">AI</text>
            <g transform="translate(216, 80) scale(0.6)">
              <path d="M 64,32 L 128,64 L 64,96 L 0,64 Z" fill="#ffffff"/>
              <path d="M 24,76 L 24,112 C 24,124 64,136 64,136 C 64,136 104,124 104,112 L 104,76" fill="none" stroke="#ffffff" strokeWidth="12"/>
              <line x1="120" y1="60" x2="120" y2="100" stroke="#ffffff" strokeWidth="8" strokeLinecap="round"/>
              <circle cx="120" cy="106" r="6" fill="#ffffff"/>
            </g>
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
