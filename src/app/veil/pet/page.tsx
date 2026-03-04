'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { ArrowLeft, Download, Upload, TriangleAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MentorPetSprite } from '@/components/veil/MentorPetSprite';
import { RoleGuard } from '@/components/role/RoleGuard';
import {
  hasMentorPet,
  getMentorPet,
  getGrowthInfo,
  getTierDescription,
  getConstellationStats,
  hasVault,
  exportVaultBackup,
  restoreVaultBackup,
  clearMentorPet,
  initializeMentorPet,
  getVault,
} from '@/lib/veil';
import type { MentorPet } from '@/lib/veil/types';

export default function MentorPetPage() {
  const [mentorPet, setMentorPet] = useState<MentorPet | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupConfirmPassphrase, setBackupConfirmPassphrase] = useState('');
  const [vaultPasscode, setVaultPasscode] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreFileText, setRestoreFileText] = useState('');
  const [restoreFileName, setRestoreFileName] = useState('');
  const [replaceConsent, setReplaceConsent] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (hasMentorPet()) {
      setMentorPet(getMentorPet());
    }
  }, []);

  const growthInfo = getGrowthInfo();
  const stats = getConstellationStats();
  const vaultExists = hasVault();

  const handleExportBackup = async () => {
    setBackupStatus(null);

    if (!vaultExists) {
      setBackupStatus('No vault exists yet, so there is nothing to back up.');
      return;
    }

    if (backupPassphrase.length < 8) {
      setBackupStatus('Backup passphrase must be at least 8 characters.');
      return;
    }

    if (backupPassphrase !== backupConfirmPassphrase) {
      setBackupStatus('Backup passphrase confirmation does not match.');
      return;
    }

    setIsExporting(true);

    try {
      const backup = await exportVaultBackup(backupPassphrase, vaultPasscode || undefined);
      const serialized = JSON.stringify(backup, null, 2);
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const hubId = getVault()?.hubId ?? 'mentor';
      anchor.href = url;
      anchor.download = `veil-vault-backup-${hubId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setBackupStatus('Backup created and downloaded successfully. Store it in a safe location.');
      setBackupPassphrase('');
      setBackupConfirmPassphrase('');
      setVaultPasscode('');
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
    setRestoreStatus(null);

    if (!restoreFileText) {
      setRestoreStatus('Upload a backup file before restoring.');
      return;
    }

    if (!restorePassphrase) {
      setRestoreStatus('Enter the backup passphrase.');
      return;
    }

    const currentlyHasVault = hasVault();
    if (currentlyHasVault && !replaceConsent) {
      setRestoreStatus('Explicit consent is required before replacing existing vault keys.');
      return;
    }

    setIsRestoring(true);

    try {
      await restoreVaultBackup(restoreFileText, restorePassphrase, {
        allowOverwrite: replaceConsent || !currentlyHasVault,
      });

      clearMentorPet();
      initializeMentorPet();
      setMentorPet(getMentorPet());

      setRestoreStatus('Vault restore succeeded. Guardian Familiar identity was refreshed safely.');
      setRestorePassphrase('');
      setRestoreFileText('');
      setRestoreFileName('');
      setReplaceConsent(false);
    } catch (error) {
      setRestoreStatus(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const onBackupFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreStatus(null);

    try {
      const text = await file.text();
      setRestoreFileText(text);
      setRestoreFileName(file.name);
    } catch {
      setRestoreStatus('Could not read the selected backup file.');
      setRestoreFileText('');
      setRestoreFileName('');
    }
  };

  if (!mentorPet) {
    return (
      <RoleGuard requiredRole="teacher" redirectTo="/veil/kid">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-zinc-400 mb-4">No mentor pet initialized yet.</p>
            <Link href="/veil">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredRole="teacher" redirectTo="/veil/kid">
      <div className="min-h-screen p-6 pb-24">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/veil">
              <Button variant="ghost" size="icon" className="touch-manipulation">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-cyan-400">Guardian Familiar</h1>
              <p className="text-xs text-zinc-500">Your mentor pet companion</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <MentorPetSprite
              traits={mentorPet.traits}
              tier={mentorPet.growth.tier}
              size={280}
            />

            <div className="text-center">
              <p className="text-lg font-semibold text-cyan-400">
                {getTierDescription(mentorPet.growth.tier)}
              </p>
              <p className="text-sm text-zinc-500 mt-1">Tier {mentorPet.growth.tier}</p>
            </div>

            {growthInfo && growthInfo.nextTierXP && (
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>{growthInfo.xp} XP</span>
                  <span>{growthInfo.nextTierXP} XP</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: `${growthInfo.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-8 text-center">
              <div>
                <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
                <p className="text-xs text-zinc-500">Bonded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                <p className="text-xs text-zinc-500">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-500">{stats.dormant}</p>
                <p className="text-xs text-zinc-500">Dormant</p>
              </div>
            </div>

            <div className="w-full space-y-3 mt-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Growth Stats</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Total XP:</span>
                    <span className="ml-2 text-white">{growthInfo?.xp ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Blessings Forged:</span>
                    <span className="ml-2 text-purple-400">{mentorPet.forgedBlessings.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Redemptions:</span>
                    <span className="ml-2 text-green-400">{mentorPet.forgedBlessings.filter(b => b.wasRedeemed).length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Crests Bonded:</span>
                    <span className="ml-2 text-cyan-400">{mentorPet.constellation.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <TriangleAlert className="w-4 h-4 text-amber-300 mt-0.5" />
                <p className="text-xs text-amber-100">
                  Backup files are encrypted locally with your passphrase. Never transmit raw private keys or share your backup passphrase.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-300">Secure Vault Backup</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Creates an encrypted backup package with authenticated metadata (version, createdAt, and key id).
              </p>
              <input
                type="password"
                value={backupPassphrase}
                onChange={(event) => setBackupPassphrase(event.target.value)}
                placeholder="Backup passphrase (min 8 chars)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="password"
                value={backupConfirmPassphrase}
                onChange={(event) => setBackupConfirmPassphrase(event.target.value)}
                placeholder="Confirm backup passphrase"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="password"
                value={vaultPasscode}
                onChange={(event) => setVaultPasscode(event.target.value)}
                placeholder="Current vault passcode (if vault is locked)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <Button
                onClick={handleExportBackup}
                disabled={isExporting || !vaultExists}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              >
                {isExporting ? 'Creating backup...' : 'Download Encrypted Backup'}
              </Button>
              {backupStatus && (
                <p className="text-xs text-zinc-300">{backupStatus}</p>
              )}
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-300">Restore Vault Backup</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Restore verifies backup integrity and decrypts key material locally before rehydrating vault keys.
              </p>
              <input
                type="file"
                accept="application/json,.json"
                onChange={onBackupFileSelected}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-zinc-200"
              />
              {restoreFileName && (
                <p className="text-xs text-zinc-400">Selected: {restoreFileName}</p>
              )}
              <input
                type="password"
                value={restorePassphrase}
                onChange={(event) => setRestorePassphrase(event.target.value)}
                placeholder="Backup passphrase"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {vaultExists && (
                <label className="flex items-start gap-2 text-xs text-rose-200">
                  <input
                    type="checkbox"
                    checked={replaceConsent}
                    onChange={(event) => setReplaceConsent(event.target.checked)}
                    className="mt-0.5"
                  />
                  I explicitly consent to replacing existing keys on this device.
                </label>
              )}

              <Button
                onClick={handleRestoreBackup}
                disabled={isRestoring}
                variant="outline"
                className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {isRestoring ? 'Restoring backup...' : 'Restore Backup'}
              </Button>
              {restoreStatus && (
                <p className="text-xs text-zinc-300">{restoreStatus}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
