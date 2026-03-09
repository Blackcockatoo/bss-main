"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Dna,
  Gamepad2,
  Map,
  Network,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AchievementsPanel } from "./AchievementsPanel";
import { BattleArena } from "./BattleArena";
import { CosmeticsPanel } from "./CosmeticsPanel";
import { EvolutionPanel } from "./EvolutionPanel";
import { HUDAdvancedStats } from "./HUD";
import { MiniGamesPanel } from "./MiniGamesPanel";
import { Moss60Hub } from "./Moss60Hub";
import { PatternRecognitionGame } from "./PatternRecognitionGame";
import { TraitPanel } from "./TraitPanel";
import { VimanaMap } from "./VimanaMap";
import { Button } from "./ui/button";

export function FeaturesDashboard() {
  const [activeTab, setActiveTab] = useState("stats");

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 mb-6 h-auto gap-1 bg-transparent">
          <TabsTrigger
            value="stats"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Stats</span>
          </TabsTrigger>
          <TabsTrigger
            value="vimana"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <Map className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Explore</span>
          </TabsTrigger>
          <TabsTrigger
            value="battle"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <Swords className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Battle</span>
          </TabsTrigger>
          <TabsTrigger
            value="games"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <Gamepad2 className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Games</span>
          </TabsTrigger>
          <TabsTrigger
            value="cosmetics"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <Sparkles className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Style</span>
          </TabsTrigger>
          <TabsTrigger
            value="achievements"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <Trophy className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Rewards</span>
          </TabsTrigger>
          <TabsTrigger
            value="moss60"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation"
          >
            <Shield className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">MOSS60</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800 space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-zinc-200">
                    Advanced Vitals
                  </h3>
                  <HUDAdvancedStats />
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <TraitPanel />
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <EvolutionPanel />
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      Genome Tools
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      Open the polished digital imprint surfaces directly from
                      home.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Link href="/digital-dna">
                      <Button className="w-full justify-start gap-2 bg-violet-600 text-white hover:bg-violet-500">
                        <Dna className="h-4 w-4" />
                        Digital DNA
                      </Button>
                    </Link>
                    <Link href="/genome-explorer">
                      <Button className="w-full justify-start gap-2 bg-cyan-600 text-white hover:bg-cyan-500">
                        <Dna className="h-4 w-4" />
                        Genome Explorer
                      </Button>
                    </Link>
                    <Link href="/genome-resonance">
                      <Button className="w-full justify-start gap-2 bg-emerald-600 text-white hover:bg-emerald-500">
                        <Network className="h-4 w-4" />
                        Resonance
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vimana" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <VimanaMap />
          </div>
        </TabsContent>

        <TabsContent value="battle" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <BattleArena />
          </div>
        </TabsContent>

        <TabsContent value="games" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <div className="space-y-6">
              <MiniGamesPanel />

              <div className="border-t border-zinc-700 pt-6">
                <PatternRecognitionGame />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cosmetics" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <CosmeticsPanel />
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <AchievementsPanel />
          </div>
        </TabsContent>

        <TabsContent value="moss60" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <Moss60Hub />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
