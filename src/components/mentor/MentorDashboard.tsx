"use client";

import { Button } from "@/components/ui/button";
import { MentorPetSprite } from "@/components/veil/MentorPetSprite";
import { BRAND_UI } from "@/lib/brand";
import {
  type SharedPetState,
  ensureSharedPetState,
  getSharedPetState,
} from "@/lib/shared-pet-state";
import {
  createBackupBundle,
  createEncryptedBackupBlob,
  createVault,
  getConstellationStats,
  getGrowthInfo,
  getLastBackupAt,
  getLastRecoveryDrillAt,
  getMentorPet,
  getTierDescription,
  getVault,
  hasMentorPet,
  hasVault,
  initializeMentorPet,
  loadEncryptedBackupFromIndexedDB,
  markRecoveryDrillCompleted,
  persistEncryptedBackupToIndexedDB,
  refreshConstellationBands,
  restoreFromBackupPayload,
} from "@/lib/veil";
import { getVeilRoleSwitchHref } from "@/lib/veil/role-state";
import type { MentorPet, TeacherVault } from "@/lib/veil/types";
import { motion } from "framer-motion";
import {
  Baby,
  Dna,
  Gamepad2,
  Gift,
  Link2,
  PawPrint,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState } from "react";

export default function MentorDashboard() {
  const [vault, setVault] = useState<TeacherVault | null>(null);
  const [mentorPet, setMentorPet] = useState<MentorPet | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restorePayload, setRestorePayload] = useState("");
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [lastDrillAt, setLastDrillAt] = useState<number | null>(null);
  const [loadingIndexedDbBackup, setLoadingIndexedDbBackup] = useState(false);
  const [sharedPetSnapshot, setSharedPetSnapshot] =
    useState<SharedPetState | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        if (!hasVault()) {
          await createVault();
        }

        const currentVault = getVault();
        setVault(currentVault);

        if (!hasMentorPet()) {
          initializeMentorPet();
        }

        const pet = getMentorPet();
        setMentorPet(pet);

        refreshConstellationBands();
        setLastBackupAt(getLastBackupAt());
        setLastDrillAt(getLastRecoveryDrillAt());
        setSharedPetSnapshot(getSharedPetState() ?? ensureSharedPetState());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Failed to initialize ${BRAND_UI.productName}`,
        );
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  const growthInfo = getGrowthInfo();
  const constellationStats = getConstellationStats();
  const switchToKidHref = getVeilRoleSwitchHref("kid");

  const backupReminder =
    !lastBackupAt || Date.now() - lastBackupAt > 7 * 24 * 60 * 60 * 1000;

  const triggerDownload = (filename: string, payload: string) => {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = async (encrypted: boolean) => {
    try {
      const bundle = await createBackupBundle();
      const filenameDate = new Date(bundle.createdAt)
        .toISOString()
        .slice(0, 10);

      if (encrypted) {
        const payload = await createEncryptedBackupBlob(
          bundle,
          backupPassphrase,
        );
        triggerDownload(`veil-backup-${filenameDate}.encrypted.json`, payload);

        try {
          await persistEncryptedBackupToIndexedDB(payload);
          setStatusMessage(
            "Encrypted backup saved to file and IndexedDB vault cache.",
          );
        } catch {
          setStatusMessage(
            "Encrypted backup saved to file. IndexedDB persistence is unavailable.",
          );
        }
      } else {
        triggerDownload(
          `veil-backup-${filenameDate}.json`,
          JSON.stringify(bundle, null, 2),
        );
        setStatusMessage("Backup downloaded. Keep it offline and private.");
      }

      setLastBackupAt(getLastBackupAt());
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Backup export failed",
      );
    }
  };

  const handleImportFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setRestorePayload(text);
    setStatusMessage(
      `Loaded ${file.name}. Review overwrite confirmation before import.`,
    );
  };

  const handleRestore = async () => {
    try {
      const result = await restoreFromBackupPayload(restorePayload, {
        passphrase: restorePassphrase || undefined,
        overwriteConfirmed,
      });

      markRecoveryDrillCompleted();
      setLastDrillAt(getLastRecoveryDrillAt());
      setStatusMessage(
        `Restore complete${result.hubId ? ` for ${result.hubId}` : ""}. Reloading state...`,
      );
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Restore failed");
    }
  };

  const loadIndexedDbBackup = async () => {
    try {
      setLoadingIndexedDbBackup(true);
      const payload = await loadEncryptedBackupFromIndexedDB();
      if (!payload) {
        setStatusMessage("No IndexedDB encrypted backup found.");
        return;
      }

      setRestorePayload(payload);
      setStatusMessage("Loaded encrypted backup from IndexedDB cache.");
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Unable to read IndexedDB backup",
      );
    } finally {
      setLoadingIndexedDbBackup(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Awakening {BRAND_UI.productName}...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-rose-400 mb-2">
            {BRAND_UI.productName} Cannot Awaken
          </h2>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-24 relative">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-cyan-400">
            {BRAND_UI.productName}
          </h1>
          <p className="text-xs text-zinc-500">
            {BRAND_UI.mentorSanctuaryName}
          </p>
        </div>
        <div className="text-xs text-zinc-600 font-mono">
          {vault?.hubId?.slice(0, 16)}
        </div>
      </div>

      {/* Mentor Pet Display */}
      <div className="flex flex-col items-center gap-6 mb-8">
        {mentorPet && (
          <>
            <MentorPetSprite
              traits={mentorPet.traits}
              tier={mentorPet.growth.tier}
              size={220}
            />

            <div className="text-center">
              <p className="text-sm text-cyan-400 font-medium">
                {getTierDescription(mentorPet.growth.tier)}
              </p>

              {growthInfo && growthInfo.nextTierXP && (
                <div className="mt-2 w-48">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>{growthInfo.xp} XP</span>
                    <span>{growthInfo.nextTierXP} XP</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${growthInfo.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stats Summary */}
      <div className="flex gap-6 mb-8 text-center">
        <div>
          <p className="text-2xl font-bold text-zinc-100">
            {constellationStats.total}
          </p>
          <p className="text-xs text-zinc-500">Bonded Crests</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-400">
            {constellationStats.active}
          </p>
          <p className="text-xs text-zinc-500">Active</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-500">
            {constellationStats.dormant}
          </p>
          <p className="text-xs text-zinc-500">Dormant</p>
        </div>
      </div>

      {sharedPetSnapshot && (
        <div className="mb-8 w-full max-w-xl rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-cyan-300">
            Shared Pet Source
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {sharedPetSnapshot.identity.displayName} (
            {sharedPetSnapshot.identity.petId})
          </p>
          <div className="mt-3 grid gap-2 text-xs text-zinc-300 sm:grid-cols-4">
            <span>Hunger {Math.round(sharedPetSnapshot.vitals.hunger)}</span>
            <span>Hygiene {Math.round(sharedPetSnapshot.vitals.hygiene)}</span>
            <span>Mood {Math.round(sharedPetSnapshot.vitals.mood)}</span>
            <span>Energy {Math.round(sharedPetSnapshot.vitals.energy)}</span>
          </div>
          <p className="mt-2 text-xs text-amber-200">
            Bond resonance: {Math.round(sharedPetSnapshot.bond.score)}% (
            {sharedPetSnapshot.bond.band})
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/veil/pair" className="w-full">
          <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 touch-manipulation">
            <Link2 className="w-5 h-5 mr-2" />
            Pair with Pet
          </Button>
        </Link>

        <Link href="/veil/forge" className="w-full">
          <Button
            variant="outline"
            className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10 touch-manipulation"
          >
            <Gift className="w-5 h-5 mr-2" />
            Forge Blessing
          </Button>
        </Link>

        <Link href="/veil/redeem" className="w-full">
          <Button
            variant="outline"
            className="w-full border-pink-500/40 text-pink-300 hover:bg-pink-500/10 touch-manipulation"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Redeem Blessing
          </Button>
        </Link>

        <Link href="/veil/constellation" className="w-full">
          <Button
            variant="outline"
            className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800 touch-manipulation"
          >
            <Star className="w-5 h-5 mr-2" />
            View Constellation
          </Button>
        </Link>

        <Link href="/veil/dna-hub" className="w-full">
          <Button
            variant="outline"
            className="w-full border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 touch-manipulation"
          >
            <Dna className="w-5 h-5 mr-2" />
            Open DNA Hub
          </Button>
        </Link>

        <Link href="/veil/school-quest" className="w-full">
          <Button
            variant="outline"
            className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 touch-manipulation"
          >
            <Gamepad2 className="w-5 h-5 mr-2" />
            Classroom Quest
          </Button>
        </Link>

        <Link href="/veil/pet" className="w-full">
          <Button
            variant="outline"
            className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 touch-manipulation"
          >
            <PawPrint className="w-5 h-5 mr-2" />
            Guardian Familiar
          </Button>
        </Link>

        <Link href={switchToKidHref} className="w-full">
          <Button
            variant="outline"
            className="w-full border-purple-500/40 text-purple-300 hover:bg-purple-500/10 touch-manipulation"
          >
            <Baby className="w-5 h-5 mr-2" />
            Open Kid Flows
          </Button>
        </Link>
      </div>

      {/* Veil Doctrine */}
      <p className="text-xs text-zinc-600 mt-8 text-center max-w-xs italic">
        &quot;Enchant, bless, whisper. Never watch.&quot;
      </p>

      <div className="mt-8 w-full max-w-xl rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-cyan-300">
            Vault Recovery
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Keep encrypted backups in at least two places. Recovery payloads
            never contain plain names, and passphrase-wrapped exports preserve
            zero-knowledge portability.
          </p>
        </div>

        <div className="text-xs text-zinc-400 space-y-1">
          <p>
            Last backup:{" "}
            <span className="text-zinc-200">
              {lastBackupAt
                ? new Date(lastBackupAt).toLocaleString()
                : "No backup yet"}
            </span>
          </p>
          {backupReminder && (
            <p className="text-amber-300">
              Reminder: create a fresh backup at least weekly.
            </p>
          )}
          <p>
            Last recovery drill:{" "}
            <span className="text-zinc-200">
              {lastDrillAt
                ? new Date(lastDrillAt).toLocaleString()
                : "Not completed yet"}
            </span>
          </p>
          {!lastDrillAt && (
            <p className="text-purple-300">
              Recovery drill prompt: run one import test this week.
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
            onClick={() => handleExportBackup(false)}
          >
            Download JSON Backup
          </Button>
          <Button
            className="bg-cyan-700 hover:bg-cyan-600"
            onClick={() => handleExportBackup(true)}
          >
            Download Encrypted Backup
          </Button>
        </div>

        <input
          value={backupPassphrase}
          onChange={(e) => setBackupPassphrase(e.target.value)}
          placeholder="Passphrase for encrypted export"
          type="password"
          className="w-full rounded-md border border-zinc-700 bg-slate-950/70 px-3 py-2 text-sm text-zinc-100"
        />

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-zinc-600 text-zinc-200"
              onClick={() => importRef.current?.click()}
            >
              Load Backup File
            </Button>
            <Button
              variant="outline"
              className="border-purple-500/60 text-purple-300"
              onClick={loadIndexedDbBackup}
              disabled={loadingIndexedDbBackup}
            >
              {loadingIndexedDbBackup ? "Loading..." : "Load IndexedDB Backup"}
            </Button>
          </div>

          <input
            ref={importRef}
            type="file"
            accept="application/json"
            onChange={handleImportFromFile}
            className="hidden"
          />

          <textarea
            value={restorePayload}
            onChange={(e) => setRestorePayload(e.target.value)}
            placeholder="Paste backup payload (raw JSON or encrypted envelope)"
            className="w-full min-h-28 rounded-md border border-zinc-700 bg-slate-950/70 px-3 py-2 text-xs text-zinc-100"
          />

          <input
            value={restorePassphrase}
            onChange={(e) => setRestorePassphrase(e.target.value)}
            placeholder="Passphrase (required for encrypted imports)"
            type="password"
            className="w-full rounded-md border border-zinc-700 bg-slate-950/70 px-3 py-2 text-sm text-zinc-100"
          />

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={overwriteConfirmed}
              onChange={(e) => setOverwriteConfirmed(e.target.checked)}
            />
            I confirm restore can overwrite existing vault state.
          </label>

          <Button
            className="w-full bg-purple-700 hover:bg-purple-600"
            onClick={handleRestore}
            disabled={!restorePayload.trim()}
          >
            Restore from Backup
          </Button>
        </div>

        {statusMessage && (
          <p className="text-xs text-cyan-200">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
