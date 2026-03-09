"use client";

import { FeaturesDashboard } from "@/components/FeaturesDashboard";
import { HUD, HUDAdvancedStats } from "@/components/HUD";
import { MindfulnessAlchemyHub } from "@/components/MindfulnessAlchemyHub";
import { PetHero } from "@/components/PetHero";
import { PetResponseOverlay } from "@/components/PetResponseOverlay";
import { AddonInventoryPanel } from "@/components/addons/AddonInventoryPanel";
import { PetProfilePanel } from "@/components/addons/PetProfilePanel";
import { NAVIGATION_TARGETS } from "@/components/steering/types";
import { Button } from "@/components/ui/button";
import { initializeStarterAddons } from "@/lib/addons/starter";
import { runCorePersistenceMigration } from "@/lib/core-persistence-migration";
import { syncSharedPetFromPetRoute } from "@/lib/shared-pet-state";
import { useStore } from "@/lib/store";
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Dna,
  Fingerprint,
  Gamepad2,
  Gift,
  Map,
  Move,
  Network,
  Orbit,
  Shield,
  ShoppingBag,
  Sparkles,
  UserCircle,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomePageClient() {
  const startTick = useStore((s) => s.startTick);
  const stopTick = useStore((s) => s.stopTick);
  const vitals = useStore((s) => s.vitals);
  const petType = useStore((s) => s.petType);
  const setPetType = useStore((s) => s.setPetType);
  const [showAddonPanel, setShowAddonPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [addonEditMode, setAddonEditMode] = useState(false);
  const [addonsInitialized, setAddonsInitialized] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    runCorePersistenceMigration();
    startTick();
    return () => stopTick();
  }, [startTick, stopTick]);

  useEffect(() => {
    syncSharedPetFromPetRoute(vitals);
  }, [vitals]);

  // Initialize starter addons on first load
  useEffect(() => {
    if (!addonsInitialized) {
      initializeStarterAddons().then((result) => {
        if (result.success) {
          console.log(
            `Addon system initialized! Created ${result.addonsCreated} starter addons.`,
          );
          setAddonsInitialized(true);
        }
      });
    }
  }, [addonsInitialized]);

  const handleToggleProfilePanel = () => {
    setShowProfilePanel((prev) => {
      const next = !prev;
      if (next) {
        setShowAddonPanel(false);
      }
      return next;
    });
  };

  const handleToggleAddonPanel = () => {
    setShowAddonPanel((prev) => {
      const next = !prev;
      if (next) {
        setShowProfilePanel(false);
      }
      return next;
    });
  };

  const closePanels = () => {
    setShowAddonPanel(false);
    setShowProfilePanel(false);
  };

  const handleToggleAdvanced = () => {
    setShowAdvanced((prev) => {
      const next = !prev;
      if (!next) {
        closePanels();
      }
      return next;
    });
  };

  const routeMeta: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; description: string }
  > = {
    "/scaffold": {
      icon: Map,
      description:
        "Explore the full systems scaffold and experimental control surfaces.",
    },
    "/space-jewbles": {
      icon: Gamepad2,
      description:
        "Launch the arcade game and keep your pet progress connected.",
    },
    "/visualizer": {
      icon: Sparkles,
      description:
        "Inspect style, visuals, and genome-driven appearance layers.",
    },
    "/share": {
      icon: Gift,
      description: "Open rewards, sharing tools, and snapshot-style outputs.",
    },
    "/shop": {
      icon: ShoppingBag,
      description: "Browse items, addons, and cosmetic companion upgrades.",
    },
    "/digital-dna": {
      icon: Dna,
      description:
        "Open the polished digital DNA viewer and 3D imprint surface.",
    },
    "/identity": {
      icon: Fingerprint,
      description: "View identity, crest, and cryptographic pet records.",
    },
    "/lineage-demo": {
      icon: Waypoints,
      description: "Inspect lineage, ancestry, and inheritance visuals.",
    },
    "/genome-resonance": {
      icon: Network,
      description: "Run the resonance lab, simulation, and explanation loop.",
    },
    "/qr-messaging": {
      icon: Compass,
      description: "Open QR messaging and MOSS60-linked communication tools.",
    },
  };

  const legacyTargets = NAVIGATION_TARGETS.filter(
    (target) => !["/", "/pet", "/compass"].includes(target.route),
  );

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col overflow-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Real-time Response Overlay */}
      <PetResponseOverlay enableAudio={true} enableAnticipation={true} />

      {/* Main Pet Window - Full Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full h-full max-w-6xl bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
          {/* Pet Display Area */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 relative px-4 py-6 md:px-6 md:py-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center">
              <div className="flex items-center justify-center">
                <PetHero className="w-full max-w-sm" />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
                        MetaPet Home
                      </p>
                      <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
                        Companion, stats, labs, and genome tools in one place
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        This restores the original home flow: your live pet on
                        top, feature tabs below, and direct access to Digital
                        DNA, Genome Resonance, and the Compass wheel.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={
                          petType === "geometric" ? "default" : "outline"
                        }
                        onClick={() => setPetType("geometric")}
                        className={
                          petType === "geometric"
                            ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                            : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                        }
                      >
                        Geometric
                      </Button>
                      <Button
                        type="button"
                        variant={petType === "auralia" ? "default" : "outline"}
                        onClick={() => setPetType("auralia")}
                        className={
                          petType === "auralia"
                            ? "bg-fuchsia-500 text-white hover:bg-fuchsia-400"
                            : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                        }
                      >
                        Auralia
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Link href="/compass">
                      <Button className="w-full justify-start gap-2 bg-cyan-600 text-white hover:bg-cyan-500">
                        <Orbit className="h-4 w-4" />
                        Compass Wheel
                      </Button>
                    </Link>
                    <Link href="/digital-dna">
                      <Button className="w-full justify-start gap-2 bg-violet-600 text-white hover:bg-violet-500">
                        <Dna className="h-4 w-4" />
                        Digital DNA
                      </Button>
                    </Link>
                    <Link href="/genome-resonance">
                      <Button className="w-full justify-start gap-2 bg-emerald-600 text-white hover:bg-emerald-500">
                        <Network className="h-4 w-4" />
                        Genome Resonance
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
                  <HUD mode="simple" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="p-6 bg-slate-900/90 border-t border-slate-700/50 flex-shrink-0 space-y-6">
            <FeaturesDashboard />

            <MindfulnessAlchemyHub />

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
                    Full App Access
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    All the older MetaPet surfaces are reachable from here
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-400">
                    Games, rewards, style, digital DNA, lineage, resonance, QR,
                    and the scaffold are all exposed on the home screen now.
                  </p>
                </div>
                <Link href="/compass">
                  <Button className="gap-2 bg-cyan-600 text-white hover:bg-cyan-500">
                    <Orbit className="h-4 w-4" />
                    Open Compass Wheel
                  </Button>
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {legacyTargets.map((target) => {
                  const meta = routeMeta[target.route];
                  const Icon = meta?.icon ?? Orbit;

                  return (
                    <Link
                      key={target.route}
                      href={target.route}
                      className="group rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-cyan-500/50 hover:bg-slate-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-cyan-300 group-hover:border-cyan-500/40">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {target.label}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {meta?.description ??
                              "Open this legacy MetaPet surface."}
                          </p>
                          <p className="mt-2 text-[11px] text-cyan-300/80">
                            {target.route}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleAdvanced}
                className="w-full justify-between border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                aria-expanded={showAdvanced}
              >
                <span className="font-semibold">Advanced / Mechanics Lab</span>
                <span className="sr-only">
                  {" "}
                  — peek under the hood to see identity, addons, and the crypto
                  systems that keep your companion secure
                </span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href="/identity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-indigo-700 bg-indigo-900/80 text-indigo-200 hover:bg-indigo-800"
                      >
                        <UserCircle className="w-4 h-4" />
                        Identity
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddonEditMode(!addonEditMode)}
                      className={`gap-2 ${
                        addonEditMode
                          ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                          : "border-slate-700 bg-slate-900/80 text-zinc-300 hover:bg-slate-800"
                      }`}
                    >
                      <Move className="w-4 h-4" />
                      {addonEditMode ? "Editing" : "Edit"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleProfilePanel}
                      className={`gap-2 ${
                        showProfilePanel
                          ? "border-amber-500 bg-amber-600 text-white hover:bg-amber-700"
                          : "border-amber-700 bg-amber-900/80 text-amber-200 hover:bg-amber-800"
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAddonPanel}
                      className={`gap-2 ${
                        showAddonPanel
                          ? "border-purple-500 bg-purple-600 text-white hover:bg-purple-700"
                          : "border-purple-700 bg-purple-900/80 text-purple-200 hover:bg-purple-800"
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Addons
                    </Button>
                  </div>

                  {addonEditMode && (
                    <div className="rounded-lg border border-blue-500/50 bg-blue-600/20 px-3 py-2 text-xs text-blue-100">
                      <span className="font-semibold">Edit Mode Active</span> —
                      Drag addons to reposition, hover for controls.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {showProfilePanel && (
                      <PetProfilePanel
                        petId="auralia-main"
                        petName="Auralia"
                        editMode={addonEditMode}
                        onEditModeChange={setAddonEditMode}
                      />
                    )}
                    {showAddonPanel && <AddonInventoryPanel />}
                    {!showProfilePanel && !showAddonPanel && (
                      <div className="rounded-lg border border-dashed border-slate-700/60 p-4 text-xs text-slate-400 space-y-2">
                        <p>
                          Use the controls above to open the profile or addon
                          panels.
                        </p>
                        <p className="text-slate-500">
                          Every addon is cryptographically signed with ECDSA —
                          the same standard used in banking and blockchain. We
                          believe digital items should be truly owned, not
                          rented.
                        </p>
                      </div>
                    )}
                  </div>

                  <HUDAdvancedStats />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
