"use client";

import { RoleGuard } from "@/components/role/RoleGuard";
import { getVeilRoleSwitchHref } from "@/lib/veil/role-state";
import Link from "next/link";

const KID_LINKS = [
  { href: "/veil/kid/pair", label: "Pair" },
  { href: "/veil/kid/redeem", label: "Redeem" },
  { href: "/veil/kid/bonds", label: "Bonds" },
] as const;

export default function KidLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const switchToTeacherHref = getVeilRoleSwitchHref("teacher");

  return (
    <RoleGuard requiredRole="kid" redirectTo="/veil">
      <div className="min-h-screen">
        <header className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-purple-300">
                Kid Pet App
              </p>
              <p className="text-xs text-slate-500">
                Pair, redeem blessings, and manage mentor bonds.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/pet"
                className="rounded-full border border-purple-500/40 px-3 py-1 text-xs text-purple-200 transition hover:bg-purple-500/10"
              >
                Return to MetaPet App
              </Link>
              <Link
                href={switchToTeacherHref}
                className="rounded-full border border-cyan-500/40 px-3 py-1 text-xs text-cyan-300 transition hover:bg-cyan-500/10"
              >
                Switch to Teacher
              </Link>
            </div>
          </div>
        </header>

        <nav className="border-b border-slate-900 bg-slate-950/40 px-4 py-2">
          <div className="mx-auto flex w-full max-w-3xl gap-2">
            {KID_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-400 hover:text-purple-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        {children}
      </div>
    </RoleGuard>
  );
}
