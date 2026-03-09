"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useStore } from "@/lib/store";
import { useWellnessStore } from "@/lib/wellness";

import {
  Droplets,
  FlaskConical,
  Heart,
  MoonStar,
  Orbit,
  QrCode,
  Sparkles,
} from "lucide-react";
import { RitualLoop } from "./RitualLoop";
import { QuickMoodButton, WellnessSync } from "./WellnessSync";
import { Button } from "./ui/button";

type AlchemyBase = "vitality" | "focus" | "harmony";
type AlchemyCatalyst = "sunpetal" | "moondew" | "stardust";

interface AlchemyRecipe {
  base: AlchemyBase;
  catalyst: AlchemyCatalyst;
}

interface BrewResult {
  name: string;
  effect: string;
  potency: number;
  brewedAt: number;
}

const ALCHEMY_BASE_LABELS: Record<AlchemyBase, string> = {
  vitality: "Vitality Essence",
  focus: "Focus Infusion",
  harmony: "Harmony Tonic",
};

const ALCHEMY_CATALYST_LABELS: Record<AlchemyCatalyst, string> = {
  sunpetal: "Sunpetal",
  moondew: "Moondew",
  stardust: "Stardust",
};

const ALCHEMY_CATALYST_EFFECTS: Record<AlchemyCatalyst, string> = {
  sunpetal: "warms the core and boosts mood stability",
  moondew: "settles the aura and improves recovery",
  stardust: "sharpens attention and amplifies curiosity",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createBrewResult(
  recipe: AlchemyRecipe,
  resonanceIndex: number,
  evolutionStage: string,
): BrewResult {
  const stageBonus =
    evolutionStage === "SPECIATION"
      ? 12
      : evolutionStage === "QUANTUM"
        ? 8
        : evolutionStage === "NEURO"
          ? 4
          : 0;
  const potency = clamp(
    Math.round(resonanceIndex * 0.65 + stageBonus + Math.random() * 12),
    20,
    100,
  );
  const catalystEffect = ALCHEMY_CATALYST_EFFECTS[recipe.catalyst];

  return {
    name: `${ALCHEMY_CATALYST_LABELS[recipe.catalyst]} ${ALCHEMY_BASE_LABELS[recipe.base]}`,
    effect: `${ALCHEMY_BASE_LABELS[recipe.base]} ${catalystEffect}.`,
    potency,
    brewedAt: Date.now(),
  };
}

export function MindfulnessAlchemyHub() {
  const genome = useStore((state) => state.genome);
  const ritualProgress = useStore((state) => state.ritualProgress);
  const evolution = useStore((state) => state.evolution);
  const vitals = useStore((state) => state.vitals);
  const essence = useStore((state) => state.essence);
  const lastAction = useStore((state) => state.lastAction);
  const addRitualRewards = useStore((state) => state.addRitualRewards);
  const feed = useStore((state) => state.feed);

  const wellnessEnabled = useWellnessStore(
    (state) => state.enabledFeatures.mirrorVitals,
  );
  const hydration = useWellnessStore((state) => state.hydration);
  const sleep = useWellnessStore((state) => state.sleep);
  const anxiety = useWellnessStore((state) => state.anxiety);
  const reminderMode = useWellnessStore((state) => state.reminderMode);
  const setupCompletedAt = useWellnessStore((state) => state.setupCompletedAt);
  const completeSetup = useWellnessStore((state) => state.completeSetup);

  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [alchemyRecipe, setAlchemyRecipe] = useState<AlchemyRecipe>({
    base: "vitality",
    catalyst: "sunpetal",
  });
  const [latestBrew, setLatestBrew] = useState<BrewResult | null>(null);
  const [brewHistory, setBrewHistory] = useState<BrewResult[]>([]);
  const [brewCooldownUntil, setBrewCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (brewCooldownUntil <= Date.now()) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [brewCooldownUntil]);

  const jewbleDigits = useMemo(() => {
    if (!genome) return undefined;
    return {
      red: genome.red60,
      blue: genome.blue60,
      black: genome.black60,
    };
  }, [genome]);

  const resonanceIndex = useMemo(() => {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (vitals.mood +
            vitals.energy +
            vitals.hygiene +
            (100 - vitals.hunger)) /
            4,
        ),
      ),
    );
  }, [vitals.energy, vitals.hunger, vitals.hygiene, vitals.mood]);

  const brewCooldownSeconds = Math.max(
    0,
    Math.ceil((brewCooldownUntil - now) / 1000),
  );
  const latestRitual =
    ritualProgress.history[ritualProgress.history.length - 1] ?? null;
  const latestSleepHours = useMemo(() => {
    const entry = sleep.entries[sleep.entries.length - 1];
    if (!entry?.wakeTime) return null;
    return (
      Math.round(((entry.wakeTime - entry.sleepTime) / (1000 * 60 * 60)) * 10) /
      10
    );
  }, [sleep.entries]);

  const handleRitualComplete = (data: {
    resonance: number;
    nectar: number;
    energy: number;
    stage: string;
    progress: typeof ritualProgress;
  }) => {
    const essenceDelta = Math.max(1, data.nectar + Math.floor(data.energy / 8));
    addRitualRewards({
      resonanceDelta: data.resonance,
      reward: {
        essenceDelta,
        source: "ritual",
      },
      progress: data.progress,
    });
  };

  const handleBrewElixir = () => {
    if (brewCooldownSeconds > 0) return;

    const result = createBrewResult(
      alchemyRecipe,
      resonanceIndex,
      evolution.state,
    );
    setLatestBrew(result);
    setBrewHistory((prev) => [result, ...prev].slice(0, 5));
    setBrewCooldownUntil(Date.now() + 8_000);
    setNow(Date.now());
    feed();
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 md:p-5 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
            Mindfulness And Alchemy
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Ritual grounding, wellness mirror, and the old alchemist station
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            This restores the reflective part of MetaPet: ritual sessions, mood
            check-ins, and support elixirs that feed back into your companion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {wellnessEnabled ? (
            <QuickMoodButton onClick={() => setWellnessOpen(true)} />
          ) : (
            <Button
              type="button"
              onClick={() => {
                completeSetup();
                setWellnessOpen(true);
              }}
              className="bg-purple-600 text-white hover:bg-purple-500"
            >
              <Heart className="mr-2 h-4 w-4" />
              Enable Wellness Mirror
            </Button>
          )}
          <Link href="/qr-messaging">
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
            >
              <QrCode className="mr-2 h-4 w-4" />
              QR Section
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Ritual Loop</h3>
              <p className="mt-1 text-xs text-slate-400">
                Tap, hold, breathe, or draw yantras to build resonance and
                essence.
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Resonance {ritualProgress.resonance}</div>
              <div>Nectar {ritualProgress.nectar}</div>
              <div>Streak {ritualProgress.streak}</div>
            </div>
          </div>
          <RitualLoop
            petId="metapet-primary"
            jewbleDigits={jewbleDigits}
            initialProgress={ritualProgress}
            onRitualComplete={handleRitualComplete}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-purple-100">
                  Wellness Mirror
                </h3>
                <p className="mt-1 text-xs text-purple-100/70">
                  Mood check-ins and mirrored pet reflections.
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-purple-300" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-purple-500/20 bg-slate-950/40 p-3 text-xs text-slate-300">
                <p className="text-purple-200">Reminder mode</p>
                <p className="mt-1">{reminderMode}</p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-slate-950/40 p-3 text-xs text-slate-300">
                <p className="text-purple-200">Setup</p>
                <p className="mt-1">
                  {setupCompletedAt ? "Complete" : "Ready to begin"}
                </p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-slate-950/40 p-3 text-xs text-slate-300">
                <p className="text-purple-200">Grounding sessions</p>
                <p className="mt-1">{anxiety.totalSessions}</p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-slate-950/40 p-3 text-xs text-slate-300">
                <p className="text-purple-200">Last ritual</p>
                <p className="mt-1 capitalize">
                  {latestRitual?.ritual ?? "None yet"}
                </p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-slate-950/40 p-3 text-xs text-slate-300">
                <p className="text-purple-200">Hydration entries</p>
                <p className="mt-1">{hydration.entries.length}</p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-slate-950/40 p-3 text-xs text-slate-300">
                <p className="text-purple-200">Last sleep</p>
                <p className="mt-1">
                  {latestSleepHours === null
                    ? "No sleep log yet"
                    : `${latestSleepHours}h tracked`}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (!setupCompletedAt) completeSetup();
                  setWellnessOpen(true);
                }}
                className="bg-purple-600 text-white hover:bg-purple-500"
              >
                <Heart className="mr-2 h-4 w-4" />
                Open Mindfulness Check-In
              </Button>
              <Link href="/geometry-sound">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                >
                  <Orbit className="mr-2 h-4 w-4" />
                  Geometry Sound
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-amber-100">
                  Alchemist Station
                </h3>
                <p className="mt-1 text-xs text-amber-100/70">
                  Combine base essences with catalysts to brew a quick support
                  elixir for your companion.
                </p>
              </div>
              <FlaskConical className="h-4 w-4 text-amber-300" />
            </div>

            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-amber-200/70">
                  Base Essence
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ALCHEMY_BASE_LABELS) as AlchemyBase[]).map(
                    (base) => (
                      <Button
                        key={base}
                        size="sm"
                        variant={
                          alchemyRecipe.base === base ? "default" : "outline"
                        }
                        onClick={() =>
                          setAlchemyRecipe((prev) => ({ ...prev, base }))
                        }
                        className={
                          alchemyRecipe.base === base
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                        }
                      >
                        {ALCHEMY_BASE_LABELS[base]}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-amber-200/70">
                  Catalyst
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.keys(ALCHEMY_CATALYST_LABELS) as AlchemyCatalyst[]
                  ).map((catalyst) => (
                    <Button
                      key={catalyst}
                      size="sm"
                      variant={
                        alchemyRecipe.catalyst === catalyst
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setAlchemyRecipe((prev) => ({ ...prev, catalyst }))
                      }
                      className={
                        alchemyRecipe.catalyst === catalyst
                          ? "bg-violet-600 hover:bg-violet-700"
                          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                      }
                    >
                      {ALCHEMY_CATALYST_LABELS[catalyst]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-slate-950/40 p-3 text-xs text-amber-100">
                <p className="font-semibold">Current Formula</p>
                <p className="mt-1">
                  {ALCHEMY_CATALYST_LABELS[alchemyRecipe.catalyst]} +{" "}
                  {ALCHEMY_BASE_LABELS[alchemyRecipe.base]}
                </p>
                <p className="mt-1 text-amber-200/80">
                  Resonance Index: {resonanceIndex} · Evolution Stage:{" "}
                  {evolution.state} · Essence: {essence}
                </p>
              </div>

              <Button
                onClick={handleBrewElixir}
                disabled={brewCooldownSeconds > 0}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                {brewCooldownSeconds > 0
                  ? `Cooling retort (${brewCooldownSeconds}s)`
                  : "Brew Elixir"}
              </Button>

              {latestBrew ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <p className="font-semibold text-emerald-200">
                    Latest Brew: {latestBrew.name}
                  </p>
                  <p className="mt-1 text-zinc-300">{latestBrew.effect}</p>
                  <p className="mt-1 text-xs text-emerald-300">
                    Potency {latestBrew.potency}% · Companion nourished
                  </p>
                </div>
              ) : null}

              {brewHistory.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-amber-200/70">
                    Recent Brews
                  </p>
                  <div className="space-y-2">
                    {brewHistory.map((brew) => (
                      <div
                        key={brew.brewedAt}
                        className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs"
                      >
                        <p className="text-zinc-200">{brew.name}</p>
                        <p className="text-zinc-400">Potency {brew.potency}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <p className="flex items-center gap-2 text-cyan-200">
            <Droplets className="h-4 w-4" /> Wellness Mirror
          </p>
          <p className="mt-2">
            Mindfulness prompts, mood check-ins, and mirrored pet feedback are
            now part of home.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <p className="flex items-center gap-2 text-cyan-200">
            <MoonStar className="h-4 w-4" /> Ritual Memory
          </p>
          <p className="mt-2">
            Ritual completions feed resonance, nectar, essence, and companion
            energy through the shared store.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <p className="flex items-center gap-2 text-cyan-200">
            <FlaskConical className="h-4 w-4" /> Alchemy Restored
          </p>
          <p className="mt-2">
            The old alchemist station is back with base essences, catalysts,
            brew cooldowns, and recent elixir history.
          </p>
        </div>
      </div>

      <WellnessSync
        isOpen={wellnessOpen}
        onClose={() => setWellnessOpen(false)}
        lastAction={lastAction}
      />
    </div>
  );
}
