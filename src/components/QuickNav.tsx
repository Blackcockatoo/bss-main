"use client";

import {
  ArrowDownToLine,
  ArrowLeft,
  BookOpen,
  Compass,
  Dna,
  FlaskConical,
  Home,
  QrCode,
  Share,
  UserCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/haptics";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/compass", label: "Compass", icon: Compass },
  { href: "/school-game", label: "School", icon: BookOpen },
  { href: "/identity", label: "Identity", icon: UserCircle },
  { href: "/genome-explorer", label: "Genome", icon: Dna },
];

const LAB_ITEMS = [
  { href: "/digital-dna", label: "Digital DNA", icon: Dna },
  { href: "/genome-resonance", label: "Genome Resonance", icon: Compass },
  { href: "/genome-explorer", label: "Genome Explorer", icon: Dna },
  { href: "/qr-messaging", label: "QR (Experimental)", icon: QrCode },
];

/** Detect iOS (iPhone / iPad / iPod) */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Detect whether the app is already running as a standalone PWA */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export function QuickNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  const [isLabsOpen, setIsLabsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsLabsOpen(false);
  }

  // Initialise client-side state once mounted
  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIOS());
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleBack = useCallback(() => {
    triggerHaptic("light");
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  const handleInstall = useCallback(async () => {
    triggerHaptic("success");

    if (installPrompt) {
      // Chrome / Edge / Android — native install prompt
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setInstalled(true);
      }
      return;
    }

    if (ios) {
      // iOS Safari — show manual instructions tooltip
      setShowIosHint((v) => !v);
      return;
    }
  }, [installPrompt, ios]);

  const handleNavClick = useCallback(() => {
    triggerHaptic("selection");
  }, []);

  const handleLabsToggle = useCallback(() => {
    triggerHaptic("selection");
    setIsLabsOpen((open) => !open);
  }, []);

  // Show the download button when:
  //  - NOT already installed/standalone
  //  - AND either a native prompt is available OR we're on iOS
  const showInstall = !installed && (installPrompt !== null || ios);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 pointer-events-none">
      <div className="max-w-lg mx-auto">
        {/* iOS "Add to Home Screen" hint tooltip */}
        {showIosHint && (
          <div className="pointer-events-auto mb-2 rounded-2xl border border-slate-700/70 bg-slate-950/95 px-4 py-3 shadow-lg shadow-slate-950/60 backdrop-blur-lg text-sm text-slate-200 relative">
            <button
              type="button"
              onClick={() => setShowIosHint(false)}
              className="absolute top-2 right-2 text-slate-500 hover:text-white p-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
              <Share className="h-4 w-4" />
              Install MetaPet on iOS
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-xs">
              <li>
                Tap the <Share className="inline h-3.5 w-3.5 align-middle" />{" "}
                <span className="font-semibold">Share</span> button in Safari
              </li>
              <li>
                Scroll down and tap{" "}
                <span className="font-semibold">Add to Home Screen</span>
              </li>
              <li>
                Tap <span className="font-semibold">Add</span>
              </li>
            </ol>
          </div>
        )}

        <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-950/90 px-2 py-2 shadow-lg shadow-slate-950/60 backdrop-blur-lg">
          {/* Back button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-12 w-12 rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white touch-manipulation"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-slate-700/50" />

          {/* Nav Items */}
          <div className="flex-1 flex items-center justify-around">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname === "/pet"
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className="flex"
                >
                  <div
                    className={`
                      flex flex-col items-center justify-center gap-0.5
                      min-w-[52px] h-12 px-2 rounded-xl
                      transition-all duration-200
                      touch-manipulation
                      ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white active:scale-95"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span
                      className={`text-[9px] font-medium ${isActive ? "opacity-100" : "opacity-70"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleLabsToggle}
                className={`h-12 w-12 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white touch-manipulation ${
                  isLabsOpen ? "bg-slate-800/70 text-white" : ""
                }`}
                aria-label="Toggle labs navigation"
              >
                <FlaskConical className="h-5 w-5" />
              </Button>
              {isLabsOpen && (
                <div className="absolute bottom-14 right-0 w-44 rounded-xl border border-slate-700/70 bg-slate-950/95 p-2 shadow-lg shadow-slate-950/60 backdrop-blur-lg">
                  <div className="px-2 pb-1 text-[10px] uppercase tracking-wide text-slate-500">
                    Labs
                  </div>
                  <div className="space-y-1">
                    {LAB_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleNavClick}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        >
                          <Icon className="h-4 w-4" />
                          <span
                            className={isActive ? "text-cyan-300" : undefined}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Download / Install button */}
          {showInstall && (
            <>
              <div className="h-8 w-px bg-slate-700/50" />
              <Button
                type="button"
                variant="ghost"
                onClick={handleInstall}
                className="h-12 px-3 rounded-xl text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 touch-manipulation flex flex-col items-center justify-center gap-0.5"
                aria-label="Download app"
              >
                <ArrowDownToLine className="h-5 w-5" />
                <span className="text-[9px] font-medium opacity-80">
                  {ios ? "Install" : "Download"}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
