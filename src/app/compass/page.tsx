"use client";

import { SteeringWheel } from "@/components/steering";
import { NAVIGATION_TARGETS } from "@/components/steering/types";
import type { NavigationTarget } from "@/components/steering/types";
import {
  SHARED_PET_STATE_UPDATED_EVENT,
  ensureSharedPetState,
  getSharedPetState,
} from "@/lib/shared-pet-state";
import { useStore } from "@/lib/store";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Dna,
  Droplets,
  Fingerprint,
  Gamepad2,
  GitBranch,
  Heart,
  Home,
  MapPin,
  Moon,
  Network,
  QrCode,
  ShoppingBag,
  Sparkles,
  Trophy,
  Wind,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// ── Vitals bar ────────────────────────────────────────────────────────────────

function vitalColor(value: number): string {
  if (value < 25) return "bg-red-500";
  if (value < 50) return "bg-amber-400";
  if (value < 75) return "bg-cyan-400";
  return "bg-emerald-400";
}

function vitalTextColor(value: number): string {
  if (value < 25) return "text-red-300";
  if (value < 50) return "text-amber-300";
  if (value < 75) return "text-cyan-300";
  return "text-emerald-300";
}

interface VitalBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function VitalBar({ label, value, icon }: VitalBarProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`shrink-0 ${vitalTextColor(value)}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <span
            className={`text-[10px] font-bold tabular-nums ${vitalTextColor(value)}`}
          >
            {Math.round(value)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${vitalColor(value)}`}
            style={{ width: `${Math.max(2, value)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sector detail panel ───────────────────────────────────────────────────────

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="h-5 w-5" />,
  Explore: <MapPin className="h-5 w-5" />,
  Pet: <Heart className="h-5 w-5" />,
  "Space Jewbles": <Gamepad2 className="h-5 w-5" />,
  Style: <Sparkles className="h-5 w-5" />,
  Rewards: <Trophy className="h-5 w-5" />,
  Shop: <ShoppingBag className="h-5 w-5" />,
  "Digital DNA": <Dna className="h-5 w-5" />,
  Identity: <Fingerprint className="h-5 w-5" />,
  Lineage: <GitBranch className="h-5 w-5" />,
  "Genome Resonance": <Network className="h-5 w-5" />,
  "QR Messaging": <QrCode className="h-5 w-5" />,
};

const SECTOR_DESCRIPTIONS: Record<string, string> = {
  Home: "Return to the main MetaPet companion screen.",
  Explore:
    "Browse and test app surfaces. Dev scaffold with all routes exposed.",
  Pet: "Your live pet — feed, care, and interact. Vitals tick in real-time.",
  "Space Jewbles":
    "Arcade shoot-em-up with your pet as the hero. Idle upgrades, wave battles.",
  Style:
    "Visual trait explorer — see how genome data maps to your pet's appearance.",
  Rewards:
    "Share a pet snapshot and generate a unique link to show off your companion.",
  Shop: "Browse and preview cosmetic addons — stickers, auras, accessories.",
  "Digital DNA": "Animated 3D double-helix view of your pet's genome sequence.",
  Identity:
    "Your pet's cryptographic identity — HeptaTag, crest hash, and key details.",
  Lineage:
    "Visual coat-of-arms and lineage graph showing your pet's ancestry chain.",
  "Genome Resonance":
    "Simulate and sonify trait interactions. Advanced systems view.",
  "QR Messaging":
    "(Experimental) Encode short messages into QR codes using genome crypto.",
};

const SECTOR_TIPS: Record<string, string> = {
  Home: "Your pet misses you when vitals are low.",
  Explore: "Use this to jump between any route in the app quickly.",
  Pet: "Feed first — hunger drains fastest and causes sickness.",
  "Space Jewbles": "Upgrade your weapon between waves using gems collected.",
  Style: "Switch between Red, Blue, and Black genome sequences.",
  Rewards: "QR share links expire after 24 hours.",
  Shop: "Starter addons are given automatically on first launch.",
  "Digital DNA": "Force 2D fallback mode if your device struggles with WebGL.",
  Identity:
    "Your HeptaTag is stable — it's derived from your genome, not a server.",
  Lineage: "Lineage grows richer the longer you keep your pet alive.",
  "Genome Resonance":
    'Try the "What If" lab to see how trait changes ripple through the system.',
  "QR Messaging": "Keys are generated locally — no server sees your messages.",
};

function SectorPanel({
  target,
  vitals,
}: {
  target: NavigationTarget;
  vitals: {
    hunger: number;
    hygiene: number;
    mood: number;
    energy: number;
    isSick: boolean;
  } | null;
}) {
  const icon = SECTOR_ICONS[target.label] ?? <Compass className="h-5 w-5" />;
  const desc = SECTOR_DESCRIPTIONS[target.label] ?? "Navigate to this section.";
  const tip = SECTOR_TIPS[target.label] ?? "";

  // Pet sector shows inline vitals preview
  const showVitals = target.label === "Pet" && vitals;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-cyan-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{target.label}</h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
            {desc}
          </p>
        </div>
      </div>

      {showVitals && vitals && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <VitalBar
            label="Hunger"
            value={100 - vitals.hunger}
            icon={<Droplets className="h-3 w-3" />}
          />
          <VitalBar
            label="Hygiene"
            value={vitals.hygiene}
            icon={<Wind className="h-3 w-3" />}
          />
          <VitalBar
            label="Mood"
            value={vitals.mood}
            icon={<Heart className="h-3 w-3" />}
          />
          <VitalBar
            label="Energy"
            value={vitals.energy}
            icon={<Moon className="h-3 w-3" />}
          />
          {vitals.isSick && (
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-2 py-1.5 mt-1">
              <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-red-300">
                Pet is sick — visit the pet screen to treat it.
              </span>
            </div>
          )}
        </div>
      )}

      {tip && (
        <p className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-500 leading-relaxed">
          <Zap className="h-3 w-3 text-amber-500/70 shrink-0 mt-0.5" />
          {tip}
        </p>
      )}

      <Link
        href={target.route}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 active:scale-[0.98]"
      >
        Open {target.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ── Session stats ─────────────────────────────────────────────────────────────

function useSessionTime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Vitals health ring ────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 75
      ? "#34d399"
      : score >= 50
        ? "#38bdf8"
        : score >= 25
          ? "#fbbf24"
          : "#f87171";
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth="4"
      />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill={color}
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ── Main compass page ─────────────────────────────────────────────────────────

export default function CompassPage() {
  const router = useRouter();
  const storeVitals = useStore((s) => s.vitals);
  const genome = useStore((s) => s.genome);
  const sessionTime = useSessionTime();
  const [sharedVitals, setSharedVitals] = useState(
    () => getSharedPetState()?.vitals ?? null,
  );

  const [selectedSector, setSelectedSector] = useState<number>(2); // default: Pet

  useEffect(() => {
    setSharedVitals(
      getSharedPetState()?.vitals ?? ensureSharedPetState().vitals,
    );

    const handleSharedUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ vitals?: typeof storeVitals }>)
        .detail;
      if (detail?.vitals) {
        setSharedVitals(detail.vitals);
        return;
      }
      setSharedVitals(getSharedPetState()?.vitals ?? null);
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes("metapet-shared-pet-state")) {
        setSharedVitals(getSharedPetState()?.vitals ?? null);
      }
    };

    window.addEventListener(
      SHARED_PET_STATE_UPDATED_EVENT,
      handleSharedUpdate as EventListener,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        SHARED_PET_STATE_UPDATED_EVENT,
        handleSharedUpdate as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [storeVitals]);

  const vitals = sharedVitals ?? storeVitals;

  // Health score = average of good vitals (hunger inverted since high hunger = bad)
  const healthScore = useMemo(() => {
    if (!vitals) return 0;
    return (
      (100 - vitals.hunger + vitals.hygiene + vitals.mood + vitals.energy) / 4
    );
  }, [vitals]);

  const selectedTarget = NAVIGATION_TARGETS[selectedSector];

  // When wheel activates a sector, navigate immediately
  const handleActivate = (position: number) => {
    const target = NAVIGATION_TARGETS[position];
    if (target) {
      router.push(target.route);
    }
  };

  // Single-tap selects and shows the panel; double-activate navigates (handled by wheel)
  const handleSelect = (position: number) => {
    setSelectedSector(position);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  Navigator
                </span>
              </div>
              <p className="text-[10px] text-slate-500">MOSS60 compass wheel</p>
            </div>
          </div>

          {/* Live vitals summary */}
          <div className="flex items-center gap-3">
            {vitals && (
              <div className="hidden sm:flex items-center gap-3">
                <HealthRing score={healthScore} />
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">Pet health</p>
                  <p
                    className={`text-xs font-semibold ${healthScore >= 75 ? "text-emerald-400" : healthScore >= 50 ? "text-cyan-400" : healthScore >= 25 ? "text-amber-400" : "text-red-400"}`}
                  >
                    {healthScore >= 75
                      ? "Excellent"
                      : healthScore >= 50
                        ? "Good"
                        : healthScore >= 25
                          ? "Low"
                          : "Critical"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5">
              <Activity className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] tabular-nums text-slate-400">
                {sessionTime}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 mx-auto w-full max-w-4xl flex flex-col lg:flex-row gap-6 p-4 pt-6">
        {/* Left / center: wheel + vitals bar */}
        <div className="flex flex-col items-center gap-5 flex-1">
          {/* Compact vitals strip — always visible */}
          {vitals && (
            <div className="w-full max-w-lg rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3">
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
                <VitalBar
                  label="Hunger"
                  value={100 - vitals.hunger}
                  icon={<Droplets className="h-3 w-3" />}
                />
                <VitalBar
                  label="Hygiene"
                  value={vitals.hygiene}
                  icon={<Wind className="h-3 w-3" />}
                />
                <VitalBar
                  label="Mood"
                  value={vitals.mood}
                  icon={<Heart className="h-3 w-3" />}
                />
                <VitalBar
                  label="Energy"
                  value={vitals.energy}
                  icon={<Moon className="h-3 w-3" />}
                />
              </div>
              {vitals.isSick && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-300">
                    Your pet is sick.{" "}
                    <Link
                      href="/pet"
                      className="underline underline-offset-2 hover:text-red-200"
                    >
                      Go treat it now.
                    </Link>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* The wheel */}
          <div className="w-full">
            <SteeringWheel
              externalSelectedSector={selectedSector}
              onSectorSelect={handleSelect}
              onSectorActivate={handleActivate}
            />
          </div>

          {/* Genome status strip */}
          <div className="w-full max-w-lg rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dna className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">
                {genome ? "Pet DNA loaded" : "No genome — seed data active"}
              </span>
            </div>
            {genome && (
              <span className="text-[10px] text-purple-300 font-mono">
                R{genome.red60?.[0] ?? "?"} B{genome.blue60?.[0] ?? "?"} K
                {genome.black60?.[0] ?? "?"}
              </span>
            )}
            {!genome && (
              <Link
                href="/pet"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 transition"
              >
                Open pet →
              </Link>
            )}
          </div>
        </div>

        {/* Right panel: sector detail */}
        <div className="lg:w-80 flex flex-col gap-4">
          {/* Selected sector detail */}
          {selectedTarget && (
            <SectorPanel target={selectedTarget} vitals={vitals} />
          )}

          {/* Quick links grid */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
              Quick jump
            </p>
            <div className="grid grid-cols-3 gap-2">
              {NAVIGATION_TARGETS.map((t) => (
                <Link
                  key={t.route}
                  href={t.route}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-medium transition text-center leading-tight ${
                    selectedSector === t.position
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                  onClick={() => setSelectedSector(t.position)}
                >
                  <span className="text-base opacity-80">
                    {SECTOR_ICONS[t.label] ?? <Compass className="h-4 w-4" />}
                  </span>
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Session info */}
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-500">Session time</p>
                <p className="text-sm font-bold tabular-nums text-emerald-300">
                  {sessionTime}
                </p>
              </div>
            </div>
            {vitals && (
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Overall health</p>
                <p className="text-sm font-bold text-white">
                  {Math.round(healthScore)}
                  <span className="text-xs text-slate-500">/100</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
