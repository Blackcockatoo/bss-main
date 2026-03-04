'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import {
  isBlessingRedeemed,
  redeemBlessing,
  getBlessingTypeName,
} from '@/lib/veil';
import { formatClaimCode, validateClaimCode } from '@/lib/veil/claim-code';
import type { Blessing } from '@/lib/veil/types';

interface RedeemBlessingProps {
  onClose?: () => void;
  onRedeemed?: (blessing: Blessing) => void;
}

/**
 * RedeemBlessing - Kid Redemption UI
 *
 * Enter a blessing code, verify it, unlock the cosmetic.
 * Simple, joyful, no tracking visible to kids.
 */
export function RedeemBlessing({ onClose, onRedeemed }: RedeemBlessingProps) {
  const [shortCode, setShortCode] = useState('');
  const [status, setStatus] = useState<'input' | 'verifying' | 'success' | 'error'>('input');
  const [redeemedBlessing, setRedeemedBlessing] = useState<Blessing | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redeem the blessing
  const handleRedeem = useCallback(async () => {
    setStatus('verifying');
    setError(null);

    try {
      const preValidation = validateClaimCode(shortCode);
      if (!preValidation.valid) {
        if (preValidation.reason === 'malformed') {
          throw new Error('That code format looks off. Use something like ABCD-EFGH-2K.');
        }

        throw new Error('That code does not pass the typo check. Please review each character.');
      }

      const response = await fetch('/api/blessings/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: preValidation.formatted }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not redeem that blessing code.');
      }

      const blessing = payload?.blessing as Blessing | undefined;
      if (!blessing) {
        throw new Error('Blessing payload missing from server response');
      }

      if (isBlessingRedeemed(blessing.blessingId)) {
        throw new Error('You already redeemed this blessing on this device.');
      }

      const result = await redeemBlessing(blessing);
      if (!result.success) {
        throw new Error(result.error || 'Failed to redeem blessing');
      }

      setRedeemedBlessing(blessing);
      setStatus('success');
      onRedeemed?.(blessing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redemption failed');
      setStatus('error');
    }
  }, [shortCode, onRedeemed]);

  // Reset to try another
  const reset = () => {
    setShortCode('');
    setRedeemedBlessing(null);
    setStatus('input');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-purple-400">Redeem Blessing</h1>
          <p className="text-xs text-zinc-500">Unlock a gift from your mentor</p>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {status !== 'success' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-zinc-100">Enter Blessing Code</CardTitle>
                  <CardDescription>
                    Your teacher shares a short blessing code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Short code input */}
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">
                      Enter short claim code
                    </label>
                    <input
                      value={shortCode}
                      onChange={(e) => setShortCode(formatClaimCode(e.target.value))}
                      placeholder="ABCD-EFGH-2K"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-3 text-lg tracking-widest uppercase text-zinc-200 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={12}
                    />
                  </div>

                  {/* Redeem button */}
                  <Button
                    onClick={handleRedeem}
                    disabled={status === 'verifying' || !shortCode.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                  >
                    {status === 'verifying' ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Unlock Blessing
                      </>
                    )}
                  </Button>

                  {/* Error */}
                  {error && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                      <p className="text-sm text-rose-400">{error}</p>
                      {status === 'error' && (
                        <Button
                          onClick={() => setStatus('input')}
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-rose-400"
                        >
                          Try Again
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info */}
              <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                <p className="text-xs text-zinc-500">
                  Blessings are gifts from your mentors. Type the short code exactly as shared.
                  Codes are one-time and may expire, so redeem soon!
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/80 border-green-500/50">
                <CardContent className="pt-8 pb-6 text-center">
                  {/* Celebration animation */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="w-24 h-24 mx-auto mb-4"
                  >
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-5xl">
                        {redeemedBlessing?.type === 'sticker' && '🌟'}
                        {redeemedBlessing?.type === 'aura' && '✨'}
                        {redeemedBlessing?.type === 'accessory' && '👑'}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-xl font-bold text-zinc-100 mb-1">
                      Blessing Received!
                    </h2>
                    <p className="text-purple-400 font-medium">
                      {redeemedBlessing?.metadata.name || getBlessingTypeName(redeemedBlessing?.type || 'sticker')}
                    </p>
                    {redeemedBlessing?.metadata.flavorText && (
                      <p className="text-sm text-zinc-400 mt-2 italic">
                        "{redeemedBlessing.metadata.flavorText}"
                      </p>
                    )}
                  </motion.div>

                  {/* Sparkles animation */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 1, duration: 1 }}
                  >
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-purple-400 rounded-full"
                        initial={{
                          x: '50%',
                          y: '40%',
                          scale: 0,
                        }}
                        animate={{
                          x: `${50 + (Math.random() - 0.5) * 80}%`,
                          y: `${40 + (Math.random() - 0.5) * 60}%`,
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 0.8,
                          delay: i * 0.05,
                          ease: 'easeOut',
                        }}
                      />
                    ))}
                  </motion.div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={reset} variant="outline" className="flex-1">
                  Redeem Another
                </Button>
                {onClose && (
                  <Button onClick={onClose} className="flex-1">
                    Done
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default RedeemBlessing;
