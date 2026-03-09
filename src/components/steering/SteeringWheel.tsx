"use client";

import {
  K as SEED_BLACK,
  B as SEED_BLUE,
  R as SEED_RED,
} from "@/lib/qr-messaging/crypto";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CompassNav } from "./CompassNav";
import { GeometryView } from "./GeometryView";
import { NetworkView } from "./NetworkView";
import { WheelModeSelector } from "./WheelModeSelector";
import type {
  DataSource,
  SteeringColor,
  SteeringMode,
  SteeringViewProps,
} from "./types";
import { NAVIGATION_TARGETS } from "./types";

// MossPrimeSeed canonical strings (from the original calculator)
const SEED_STRINGS = {
  red: SEED_RED.join(""),
  blue: SEED_BLUE.join(""),
  black: SEED_BLACK.join(""),
};

interface SteeringWheelProps {
  /**
   * When provided, the wheel is externally controlled — the parent decides
   * which sector is selected. The wheel still handles its own rotation/drag
   * but syncs the selection back to the parent via onSectorSelect.
   */
  externalSelectedSector?: number;
  /**
   * Called when the user selects (single-tap/drag-stops-on) a sector.
   * If not provided, selection is managed internally.
   */
  onSectorSelect?: (position: number) => void;
  /**
   * Called when the user activates (double-tap / navigates) a sector.
   * If not provided, the wheel navigates via useRouter internally.
   */
  onSectorActivate?: (position: number) => void;
}

export function SteeringWheel({
  externalSelectedSector,
  onSectorSelect,
  onSectorActivate,
}: SteeringWheelProps = {}) {
  const router = useRouter();
  const genome = useStore((state) => state.genome);

  const [mode, setMode] = useState<SteeringMode>("compass");
  const [color, setColor] = useState<SteeringColor>("red");
  const [dataSource, setDataSource] = useState<DataSource>("seed");
  // Internal selected state — used when no external control is provided
  const [internalSelected, setInternalSelected] = useState(0);

  const selectedFeature = externalSelectedSector ?? internalSelected;

  const hasGenome = genome !== null;

  // Build number strings from either seed or live genome
  const numberStrings = useMemo(() => {
    if (dataSource === "pet" && genome) {
      return {
        red: genome.red60.join(""),
        blue: genome.blue60.join(""),
        black: genome.black60.join(""),
      };
    }
    return SEED_STRINGS;
  }, [dataSource, genome]);

  const handleFeatureSelect = useCallback(
    (position: number) => {
      setInternalSelected(position);
      onSectorSelect?.(position);
    },
    [onSectorSelect],
  );

  const handleFeatureActivate = useCallback(
    (position: number) => {
      setInternalSelected(position);
      onSectorSelect?.(position);

      if (onSectorActivate) {
        onSectorActivate(position);
      } else {
        // Default: navigate via router
        const target = NAVIGATION_TARGETS[position];
        if (target) {
          router.push(target.route);
        }
      }
    },
    [onSectorSelect, onSectorActivate, router],
  );

  // Shared props for all views
  const viewProps: SteeringViewProps = {
    color,
    numberStrings,
    selectedFeature,
    onFeatureSelect: handleFeatureSelect,
    onFeatureActivate: handleFeatureActivate,
  };

  const selectedTarget = NAVIGATION_TARGETS[selectedFeature];
  const showGenomeResonanceNote =
    mode === "network" || selectedTarget?.route === "/genome-resonance";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Navigator</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Explore the MOSS60 universe
        </p>
      </div>

      <WheelModeSelector
        mode={mode}
        onModeChange={setMode}
        color={color}
        onColorChange={setColor}
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        hasGenome={hasGenome}
      />

      {mode === "compass" && <CompassNav {...viewProps} />}
      {mode === "network" && <NetworkView {...viewProps} />}
      {mode === "geometry" && <GeometryView {...viewProps} />}

      {selectedTarget && (
        <div className="w-full max-w-lg flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-4 py-2">
          <span className="text-sm font-medium text-zinc-200">
            {selectedTarget.label}
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            {selectedTarget.route}
          </span>
        </div>
      )}

      {showGenomeResonanceNote && (
        <div className="w-full max-w-lg rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3 text-center">
          <p className="text-xs text-cyan-200">
            <span className="font-semibold">Genome Resonance:</span> Selecting
            this node opens the Genome Resonance v1 Loop page for simulation and
            explanation tools.
          </p>
        </div>
      )}

      {/* Sequence info footer */}
      <div className="p-3 bg-zinc-900 rounded-lg max-w-lg text-center">
        <p className="text-xs text-zinc-400 font-mono truncate">
          {numberStrings[color].substring(0, 40)}...
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          {dataSource === "seed" ? "MossPrimeSeed" : "Pet Genome"} &middot;{" "}
          {color} &middot; 60-digit base-{dataSource === "seed" ? "10" : "7"}
        </p>
      </div>
    </div>
  );
}
