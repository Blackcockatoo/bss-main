'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import {
  getKidBondMarks,
  releaseBond,
  getRedeemedBlessingsFromMentor,
} from '@/lib/veil';
import type { KidBondMark } from '@/lib/veil';

interface BondMarksProps {
  onClose?: () => void;
}

/**
 * BondMarks - Kid's Bonded Mentors View
 *
 * See all mentors you're bonded with. Release bonds if needed.
 * Shows blessings received from each mentor.
 */
export function BondMarks({ onClose }: BondMarksProps) {
  const [bondMarks, setBondMarks] = useState(getKidBondMarks());
  const [selectedMark, setSelectedMark] = useState<KidBondMark | null>(null);

  // Release a bond
  const handleRelease = (mentorHubId: string) => {
    if (confirm('Release this bond? You can always reconnect later.')) {
      releaseBond(mentorHubId);
      setBondMarks(getKidBondMarks());
      setSelectedMark(null);
    }
  };

  // Get color from hub ID
  const getHubColor = (hubId: string) => {
    const hash = hubId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 50%, 50%)`;
  };

  const activeMarks = bondMarks.filter(m => m.isActive);
  const inactiveMarks = bondMarks.filter(m => !m.isActive);

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
          <h1 className="text-lg font-semibold text-cyan-400">My Mentors</h1>
          <p className="text-xs text-zinc-500">{activeMarks.length} active bonds</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Active Bonds */}
        {activeMarks.length === 0 && inactiveMarks.length === 0 ? (
          <Card className="bg-slate-900/80 border-slate-700">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-zinc-400 mb-2">No mentor bonds yet</p>
              <p className="text-zinc-500 text-sm">Ask a mentor to show you their pairing QR code</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeMarks.map((mark) => {
              const blessings = getRedeemedBlessingsFromMentor(mark.mentorHubId);
              const color = getHubColor(mark.mentorHubId);

              return (
                <motion.button
                  key={mark.mentorHubId}
                  onClick={() => setSelectedMark(mark)}
                  className="w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="bg-slate-900/80 border-slate-700 hover:border-cyan-500/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        {/* Mentor icon */}
                        <div
                          className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: color, backgroundColor: `${color}20` }}
                        >
                          <svg className="w-6 h-6" style={{ color }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                          </svg>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-zinc-100">
                            Mentor
                          </p>
                          <p className="text-xs text-zinc-500">
                            Bonded {mark.bondedAt}
                          </p>
                        </div>

                        {/* Blessings count */}
                        {blessings.length > 0 && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-400">{blessings.length}</p>
                            <p className="text-xs text-zinc-500">blessings</p>
                          </div>
                        )}

                        {/* Arrow */}
                        <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </motion.button>
              );
            })}

            {/* Inactive bonds */}
            {inactiveMarks.length > 0 && (
              <>
                <p className="text-xs text-zinc-500 pt-4">Released Bonds</p>
                {inactiveMarks.map((mark) => (
                  <Card key={mark.mentorHubId} className="bg-slate-900/50 border-slate-800 opacity-50">
                    <CardContent className="py-3">
                      <p className="text-sm text-zinc-500">
                        Former mentor • {mark.bondedAt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Selected Mentor Detail */}
        <AnimatePresence>
          {selectedMark && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedMark(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="bg-slate-900 border-slate-700 w-full max-w-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-zinc-100">Mentor Bond</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMark(null)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                    <CardDescription>
                      Bonded since {selectedMark.bondedAt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* What you're sharing */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">You're sharing:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMark.consentFlags.map(flag => (
                          <span
                            key={flag}
                            className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                          >
                            {flag === 'viewWellbeing' && 'Wellbeing'}
                            {flag === 'receiveBlessings' && 'Blessings'}
                            {flag === 'receiveKeys' && 'Keys'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Blessings from this mentor */}
                    {(() => {
                      const blessings = getRedeemedBlessingsFromMentor(selectedMark.mentorHubId);
                      if (blessings.length === 0) return null;

                      return (
                        <div>
                          <p className="text-xs text-zinc-500 mb-2">
                            Blessings received: {blessings.length}
                          </p>
                          <div className="flex gap-1">
                            {blessings.slice(-10).map((b, i) => (
                              <span key={i} className="text-lg">
                                {b.type === 'sticker' && '🌟'}
                                {b.type === 'aura' && '✨'}
                                {b.type === 'accessory' && '👑'}
                              </span>
                            ))}
                            {blessings.length > 10 && (
                              <span className="text-xs text-zinc-500 self-center">
                                +{blessings.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Release bond */}
                    <Button
                      onClick={() => handleRelease(selectedMark.mentorHubId)}
                      variant="ghost"
                      className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      Release This Bond
                    </Button>

                    <p className="text-xs text-zinc-600 text-center">
                      Releasing won't delete your blessings, but you won't receive new ones.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
          <p className="text-xs text-zinc-500">
            These are the mentors you've bonded with. They can send you blessings,
            but they can never see your real name or personal details.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BondMarks;
