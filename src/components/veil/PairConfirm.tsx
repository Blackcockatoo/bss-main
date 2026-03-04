'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import {
  verifyPairingInvite,
  createPairingResponse,
  serializeResponse,
  addBondMark,
} from '@/lib/veil';
import type { PairingInvite, ConsentFlag } from '@/lib/veil/types';

interface PairConfirmProps {
  invite: PairingInvite;
  petCrestHash: string;
  onComplete: (responseCode: string) => void;
  onCancel: () => void;
}

/**
 * PairConfirm - Kid Consent Screen
 *
 * Kid reviews what they're sharing and chooses consent flags.
 * Returns a signed response code for the teacher.
 */
export function PairConfirm({
  invite,
  petCrestHash,
  onComplete,
  onCancel,
}: PairConfirmProps) {
  const [alias, setAlias] = useState('');
  const [consentFlags, setConsentFlags] = useState<ConsentFlag[]>(['receiveBlessings']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle consent flag
  const toggleFlag = (flag: ConsentFlag) => {
    setConsentFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  // Accept pairing
  const handleAccept = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Verify the invite
      const verification = await verifyPairingInvite(invite);
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid invite');
      }

      // Create response
      const response = await createPairingResponse(
        petCrestHash,
        consentFlags,
        alias || undefined
      );

      // Store bond mark locally
      addBondMark(invite, consentFlags);

      // Serialize for teacher
      const responseCode = serializeResponse(response);
      onComplete(responseCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create response');
      setIsProcessing(false);
    }
  }, [invite, petCrestHash, consentFlags, alias, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-900/80 border-cyan-500/30">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-2"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </motion.div>
            <CardTitle className="text-zinc-100">Bond with a Mentor?</CardTitle>
            <CardDescription>
              A mentor wants to connect with your pet
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Mentor info */}
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Mentor ID</p>
              <code className="text-sm text-cyan-400">{invite.hubId}</code>
            </div>

            {/* Alias (optional) */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Nickname (optional)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="How should they see you?"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                maxLength={20}
              />
              <p className="text-xs text-zinc-500 mt-1">
                They'll never see your real name, only this nickname (or nothing)
              </p>
            </div>

            {/* Consent flags */}
            <div>
              <label className="text-sm text-zinc-400 mb-3 block">
                What do you want to share?
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => toggleFlag('receiveBlessings')}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    consentFlags.includes('receiveBlessings')
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        consentFlags.includes('receiveBlessings')
                          ? 'border-cyan-500 bg-cyan-500'
                          : 'border-slate-600'
                      }`}
                    >
                      {consentFlags.includes('receiveBlessings') && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-100">Receive Blessings</p>
                      <p className="text-xs text-zinc-500">Get stickers, auras, and gifts</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => toggleFlag('viewWellbeing')}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    consentFlags.includes('viewWellbeing')
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        consentFlags.includes('viewWellbeing')
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-slate-600'
                      }`}
                    >
                      {consentFlags.includes('viewWellbeing') && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-100">Share Wellbeing</p>
                      <p className="text-xs text-zinc-500">Mentor sees if your pet is thriving (no details)</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onCancel}
                variant="ghost"
                className="flex-1"
                disabled={isProcessing}
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Bonding...
                  </>
                ) : (
                  'Accept Bond'
                )}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            )}

            {/* Privacy note */}
            <p className="text-xs text-zinc-600 text-center">
              You can release this bond anytime from your pet's profile.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default PairConfirm;
