"use client";

import { runCorePersistenceMigration } from "@/lib/core-persistence-migration";
import { getVeilRoleSwitchHref } from "@/lib/veil/role-state";
import {
  Dna,
  Gamepad2,
  Gift,
  Home,
  Link2,
  PawPrint,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TEACHER_NAV_ITEMS = [
  { href: "/veil", label: "Hub", icon: Home },
  { href: "/veil/pair", label: "Pair", icon: Link2 },
  { href: "/veil/forge", label: "Forge", icon: Gift },
  { href: "/veil/dna-hub", label: "DNA", icon: Dna },
  { href: "/veil/games", label: "Games", icon: Gamepad2 },
  { href: "/veil/constellation", label: "Stars", icon: Star },
  { href: "/veil/pet", label: "Pet", icon: PawPrint },
] as const;

const KID_NAV_ITEMS = [
  { href: "/veil/kid", label: "Kid Hub", icon: Home },
  { href: "/veil/kid/pair", label: "Pair", icon: Link2 },
  { href: "/veil/kid/redeem", label: "Redeem", icon: Sparkles },
  { href: "/veil/kid/bonds", label: "Bonds", icon: UsersRound },
] as const;

export function VeilNav() {
  const pathname = usePathname();
  useEffect(() => {
    runCorePersistenceMigration();
  }, []);

  const isKidRoute =
    pathname === "/veil/kid" || pathname.startsWith("/veil/kid/");
  const navItems = isKidRoute ? KID_NAV_ITEMS : TEACHER_NAV_ITEMS;
  const switchToTeacherHref = getVeilRoleSwitchHref("teacher");
  const switchToKidHref = getVeilRoleSwitchHref("kid");

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto max-w-lg">
        <nav className="pointer-events-auto flex items-center justify-around rounded-2xl border border-slate-700/70 bg-slate-950/90 px-2 py-2 shadow-lg shadow-slate-950/60 backdrop-blur-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  h-12 min-w-[52px] rounded-xl px-2
                  transition-all duration-200 touch-manipulation
                  ${
                    isActive
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white active:scale-95"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span
                  className={`text-[9px] font-medium ${
                    isActive ? "opacity-100" : "opacity-70"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 flex justify-center">
          {isKidRoute ? (
            <Link
              href={switchToTeacherHref}
              className="pointer-events-auto rounded-full border border-cyan-500/40 bg-slate-950/80 px-3 py-1 text-[10px] text-cyan-300 transition hover:bg-cyan-500/10"
            >
              Switch to teacher routes
            </Link>
          ) : (
            <Link
              href={switchToKidHref}
              className="pointer-events-auto rounded-full border border-purple-500/40 bg-slate-950/80 px-3 py-1 text-[10px] text-purple-200 transition hover:bg-purple-500/10"
            >
              Switch to kid routes
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
