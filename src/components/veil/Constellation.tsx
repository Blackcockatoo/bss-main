"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Button } from "@/components/ui/button";
import { BRAND_UI } from "@/lib/brand";
import {
  applyCareCapsuleSubmission,
  createCareCapsuleSubmissionEvent,
  getAllCareCapsules,
  getConstellationStats,
  getMentorPet,
  refreshConstellationBands,
  removeBondedCrest,
  updateCrestWellbeing,
} from "@/lib/veil";
import type {
  BondedCrest,
  LastSeenBand,
  WellbeingBand,
} from "@/lib/veil/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface ConstellationProps {
  onBack: () => void;
}

type FilterType = "all" | "active" | "dormant";
type CapsuleSyncStatus = NonNullable<BondedCrest["careCapsuleSync"]>["status"];

/**
 * Constellation - Bonded Crests View
 *
 * A grid of pet crests. Glow = active. Dim = dormant.
 * No names, no drill-down. Just the veil.
 */
export function Constellation({ onBack }: ConstellationProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCrest, setSelectedCrest] = useState<BondedCrest | null>(null);
  const [capsuleSyncLoading, setCapsuleSyncLoading] = useState(true);
  const [capsuleSyncError, setCapsuleSyncError] = useState<string | null>(null);

  useEffect(() => {
    setCapsuleSyncLoading(true);
    setCapsuleSyncError(null);

    try {
      refreshConstellationBands();

      const capsuleSubmissions = getAllCareCapsules().map((capsule) =>
        createCareCapsuleSubmissionEvent(capsule),
      );

      for (const submission of capsuleSubmissions) {
        applyCareCapsuleSubmission(submission);
      }
    } catch (error) {
      setCapsuleSyncError(
        error instanceof Error
          ? error.message
          : "Failed to sync care capsules.",
      );
    } finally {
      setCapsuleSyncLoading(false);
    }
  }, []);

  const mentorPet = getMentorPet();
  const stats = getConstellationStats();

  // Filter crests
  const filteredCrests = useMemo(() => {
    if (!mentorPet) return [];

    switch (filter) {
      case "active":
        return mentorPet.constellation.filter(
          (c) => c.lastSeenBand !== "dormant",
        );
      case "dormant":
        return mentorPet.constellation.filter(
          (c) => c.lastSeenBand === "dormant",
        );
      default:
        return mentorPet.constellation;
    }
  }, [mentorPet, filter]);

  // Generate a color from crest hash
  const getCrestColor = (hash: string) => {
    const hue = Number.parseInt(hash.slice(0, 4), 16) % 360;
    return `hsl(${hue}, 50%, 50%)`;
  };

  // Get glow intensity based on last seen
  const getGlowIntensity = (lastSeen: LastSeenBand): number => {
    switch (lastSeen) {
      case "today":
        return 1;
      case "thisWeek":
        return 0.7;
      case "thisMonth":
        return 0.4;
      case "dormant":
        return 0.15;
      default:
        return 0.5;
    }
  };

  // Get last seen label
  const getLastSeenLabel = (lastSeen: LastSeenBand): string => {
    switch (lastSeen) {
      case "today":
        return "Active today";
      case "thisWeek":
        return "This week";
      case "thisMonth":
        return "This month";
      case "dormant":
        return "Dormant";
      default:
        return "Unknown";
    }
  };

  const getCapsuleSyncLabel = (status?: CapsuleSyncStatus): string => {
    switch (status) {
      case "synced":
        return "Care capsule synced";
      case "stale":
        return "Care capsule stale";
      case "error":
        return "Capsule sync failed";
      case "pending":
        return "Waiting for capsule";
      default:
        return "No capsule yet";
    }
  };

  const getCapsuleSyncTone = (status?: CapsuleSyncStatus): string => {
    switch (status) {
      case "synced":
        return "text-green-400 border-green-500/40 bg-green-500/10";
      case "stale":
        return "text-amber-300 border-amber-500/40 bg-amber-500/10";
      case "error":
        return "text-rose-300 border-rose-500/40 bg-rose-500/10";
      default:
        return "text-zinc-400 border-slate-600 bg-slate-800/40";
    }
  };

  // Handle unpair
  const handleUnpair = (crestHash: string) => {
    if (
      confirm(
        "Release this bond? The crest will disappear from your constellation.",
      )
    ) {
      removeBondedCrest(crestHash);
      setSelectedCrest(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-cyan-400">Constellation</h1>
          <p className="text-xs text-zinc-500">{stats.total} bonded crests</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Stats Bar */}
        <div className="flex justify-center gap-4 text-center">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === "all"
                ? "bg-slate-700 text-zinc-100"
                : "bg-slate-800/50 text-zinc-400 hover:bg-slate-800"
            }`}
          >
            <span className="text-lg font-bold">{stats.total}</span>
            <span className="text-xs block">All</span>
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === "active"
                ? "bg-green-900/50 text-green-400 border border-green-500/30"
                : "bg-slate-800/50 text-zinc-400 hover:bg-slate-800"
            }`}
          >
            <span className="text-lg font-bold">{stats.active}</span>
            <span className="text-xs block">Active</span>
          </button>
          <button
            onClick={() => setFilter("dormant")}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === "dormant"
                ? "bg-zinc-800 text-zinc-300 border border-zinc-600"
                : "bg-slate-800/50 text-zinc-400 hover:bg-slate-800"
            }`}
          >
            <span className="text-lg font-bold">{stats.dormant}</span>
            <span className="text-xs block">Dormant</span>
          </button>
        </div>

        <Card className="bg-slate-900/70 border-slate-700">
          <CardContent className="py-3 text-xs text-zinc-300 space-y-2">
            {capsuleSyncLoading ? (
              <p className="text-zinc-400">
                Syncing care capsules into your constellation…
              </p>
            ) : capsuleSyncError ? (
              <p className="text-rose-300">
                Care capsule sync error: {capsuleSyncError}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-full border border-green-500/40 bg-green-500/10 text-green-300">
                  Synced: {stats.capsuleSynced}
                </span>
                <span className="px-2 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                  Stale: {stats.capsuleStale}
                </span>
                <span className="px-2 py-1 rounded-full border border-slate-600 bg-slate-800/40 text-zinc-300">
                  Waiting: {stats.capsulePending}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Constellation Grid */}
        {filteredCrests.length === 0 ? (
          <Card className="bg-slate-900/80 border-slate-700">
            <CardContent className="py-12 text-center">
              {stats.total === 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-zinc-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </div>
                  <p className="text-zinc-400 mb-2">
                    Your constellation is empty
                  </p>
                  <p className="text-zinc-500 text-sm">
                    Pair with pets to see their crests here
                  </p>
                </>
              ) : (
                <p className="text-zinc-400">No {filter} crests</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            <AnimatePresence>
              {filteredCrests.map((crest, index) => {
                const color = getCrestColor(crest.petCrestHash);
                const intensity = getGlowIntensity(crest.lastSeenBand);

                return (
                  <motion.button
                    key={crest.petCrestHash}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedCrest(crest)}
                    className="aspect-square relative group"
                  >
                    {/* Glow */}
                    <div
                      className="absolute inset-0 rounded-full blur-md transition-opacity"
                      style={{
                        backgroundColor: color,
                        opacity: intensity * 0.5,
                      }}
                    />

                    {/* Crest circle */}
                    <div
                      className="absolute inset-1 rounded-full border-2 transition-all group-hover:scale-110"
                      style={{
                        backgroundColor: `${color}20`,
                        borderColor: color,
                        opacity: intensity,
                      }}
                    >
                      {/* Inner pattern (simplified crest) */}
                      <svg className="w-full h-full p-2" viewBox="0 0 24 24">
                        <circle
                          cx={12}
                          cy={12}
                          r={6}
                          fill={color}
                          opacity={0.3}
                        />
                        <circle
                          cx={12}
                          cy={12}
                          r={3}
                          fill={color}
                          opacity={0.6}
                        />
                      </svg>
                    </div>

                    <div
                      className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-slate-900 ${
                        crest.careCapsuleSync?.status === "synced"
                          ? "bg-green-400"
                          : crest.careCapsuleSync?.status === "stale"
                            ? "bg-amber-300"
                            : crest.careCapsuleSync?.status === "error"
                              ? "bg-rose-400"
                              : "bg-zinc-600"
                      }`}
                      title={getCapsuleSyncLabel(crest.careCapsuleSync?.status)}
                    />

                    {/* Alias (if set) */}
                    {crest.alias && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900/90 px-1.5 py-0.5 rounded text-[10px] text-zinc-300 whitespace-nowrap max-w-full truncate">
                        {crest.alias}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Selected Crest Detail */}
        <AnimatePresence>
          {selectedCrest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Crest preview */}
                      <div
                        className="w-12 h-12 rounded-full border-2"
                        style={{
                          backgroundColor: `${getCrestColor(selectedCrest.petCrestHash)}20`,
                          borderColor: getCrestColor(
                            selectedCrest.petCrestHash,
                          ),
                        }}
                      />
                      <div>
                        <CardTitle className="text-zinc-100">
                          {selectedCrest.alias || "Anonymous Crest"}
                        </CardTitle>
                        <CardDescription>
                          Bonded {selectedCrest.bondedAt}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCrest(null)}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedCrest.lastSeenBand === "dormant"
                          ? "bg-zinc-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-sm text-zinc-400">
                      {getLastSeenLabel(selectedCrest.lastSeenBand)}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-2">
                      Care capsule sync:
                    </p>
                    <div
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${getCapsuleSyncTone(selectedCrest.careCapsuleSync?.status)}`}
                    >
                      {getCapsuleSyncLabel(
                        selectedCrest.careCapsuleSync?.status,
                      )}
                    </div>
                    {selectedCrest.careCapsuleSync?.weekOf && (
                      <p className="text-xs text-zinc-500 mt-2">
                        Week {selectedCrest.careCapsuleSync.weekOf}
                      </p>
                    )}
                    {selectedCrest.careCapsuleSync?.indicators && (
                      <div className="mt-2 space-y-1 text-xs text-zinc-400">
                        <p>
                          Streak band:{" "}
                          {selectedCrest.careCapsuleSync.indicators.streakBand}
                        </p>
                        <p>
                          Stability band:{" "}
                          {
                            selectedCrest.careCapsuleSync.indicators
                              .stabilityBand
                          }
                        </p>
                        <p>
                          Variety band:{" "}
                          {selectedCrest.careCapsuleSync.indicators.varietyBand}
                        </p>
                        <p>
                          Overall:{" "}
                          {selectedCrest.careCapsuleSync.indicators
                            .overallBand === 0
                            ? "Needs attention"
                            : selectedCrest.careCapsuleSync.indicators
                                  .overallBand === 1
                              ? "Doing okay"
                              : "Thriving"}
                        </p>
                      </div>
                    )}
                    {selectedCrest.careCapsuleSync?.error && (
                      <p className="text-xs text-rose-300 mt-2">
                        {selectedCrest.careCapsuleSync.error}
                      </p>
                    )}
                  </div>

                  {/* Consent flags */}
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">
                      Shared with you:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCrest.consentFlags.map((flag) => (
                        <span
                          key={flag}
                          className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        >
                          {flag === "viewWellbeing" && "Wellbeing"}
                          {flag === "receiveBlessings" && "Blessings"}
                          {flag === "receiveKeys" && "Keys"}
                        </span>
                      ))}
                      {selectedCrest.consentFlags.length === 0 && (
                        <span className="text-xs text-zinc-500">
                          Basic pairing only
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Wellbeing (if consented) */}
                  {selectedCrest.consentFlags.includes("viewWellbeing") && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">
                        Wellbeing (tap to set):
                      </p>
                      <div className="flex gap-1">
                        {([0, 1, 2] as const).map((i) => (
                          <button
                            key={i}
                            onClick={() => {
                              updateCrestWellbeing(
                                selectedCrest.petCrestHash,
                                i as WellbeingBand,
                              );
                              setSelectedCrest({
                                ...selectedCrest,
                                wellbeingBand: i as WellbeingBand,
                              });
                            }}
                            className={`h-3 w-10 rounded-full transition-all ${
                              selectedCrest.wellbeingBand !== undefined &&
                              i <= selectedCrest.wellbeingBand
                                ? i === 0
                                  ? "bg-rose-500"
                                  : i === 1
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                                : "bg-slate-700 opacity-50 hover:opacity-75"
                            }`}
                          />
                        ))}
                      </div>
                      {selectedCrest.wellbeingBand !== undefined && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {selectedCrest.wellbeingBand === 0 &&
                            "Needs attention"}
                          {selectedCrest.wellbeingBand === 1 && "Doing okay"}
                          {selectedCrest.wellbeingBand === 2 && "Thriving"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Crest hash (truncated) */}
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Crest ID:</p>
                    <code className="text-xs text-zinc-400 bg-slate-800 px-2 py-1 rounded">
                      {selectedCrest.petCrestHash.slice(0, 16)}...
                    </code>
                  </div>

                  {/* Release bond */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnpair(selectedCrest.petCrestHash)}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    Release Bond
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
          <p className="text-xs text-zinc-500">
            <strong className="text-cyan-400">{BRAND_UI.productName}</strong>{" "}
            shows you crests, not names. Bright crests are active. Dim crests
            are dormant. You can send blessings to anyone in your constellation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Constellation;
