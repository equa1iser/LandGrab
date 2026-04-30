"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, User, Map } from "lucide-react";
import { clsx } from "clsx";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-bg-secondary/90 backdrop-blur-sm border-b border-border-subtle">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-display font-bold text-xl tracking-wider glow-text-green flex items-center gap-2"
        >
          <span className="text-accent-green">■</span> LANDGRAB
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 font-mono text-xs uppercase tracking-widest">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-1.5 transition-colors duration-200",
                pathname === link.href
                  ? "text-accent-green"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <link.icon className="w-3.5 h-3.5" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-text-muted hover:text-text-secondary transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-4 py-1.5 border border-border-subtle
              text-text-secondary hover:border-accent-green/50 hover:text-accent-green
              transition-colors duration-200 font-mono text-xs uppercase tracking-wider"
          >
            <User className="w-3.5 h-3.5" /> Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}

const NAV_LINKS = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/map", label: "Map", icon: Map },
];
