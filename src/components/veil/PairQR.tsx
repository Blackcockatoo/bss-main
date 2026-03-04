'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { BRAND_UI } from '@/lib/brand';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import {
  createPairingInvite,
  processPairingResponse,
  PAIRING_EXPIRY_MS,
} from '@/lib/veil';
import { createTransportToken, fetchReplyMessage } from '@/lib/protocol/transport-client';

interface PairQRProps {
  onBack: () => void;
  onPaired?: () => void;
}

export function PairQR({ onBack, onPaired }: PairQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState<'generating' | 'ready' | 'expired' | 'processing' | 'success' | 'error'>('generating');
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [linkActionState, setLinkActionState] = useState<'idle' | 'success' | 'error'>('idle');
  const [linkActionMessage, setLinkActionMessage] = useState('');
  const canExportQR = status === 'ready' || status === 'success';
  const canUseInviteActions = canExportQR && Boolean(inviteUrl);

  const generateInvite = useCallback(async () => {
    setStatus('generating');
    setError(null);

    try {
      const newInvite = await createPairingInvite();
      if (!newInvite) {
        throw new Error('Failed to create pairing invite');
      }

      const created = await createTransportToken({
        type: 'pair-invite',
        invite: newInvite,
      }, PAIRING_EXPIRY_MS);

      const origin = window.location.origin;
      const qrTargetUrl = `${origin}/veil/pair/connect/${created.id}`;

      setInviteToken(created.id);
      setInviteUrl(qrTargetUrl);

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrTargetUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
      }

      setTimeLeft(Math.floor((created.expiresAt - Date.now()) / 1000));
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    generateInvite();
  }, [generateInvite]);

  useEffect(() => {
    if (status !== 'ready' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  useEffect(() => {
    if (status !== 'ready' || !inviteToken) return;

    const interval = setInterval(async () => {
      try {
        const envelope = await fetchReplyMessage(inviteToken);
        if (!envelope || envelope.payload.type !== 'pair-accept') {
          return;
        }

        setStatus('processing');
        const result = await processPairingResponse(envelope.payload.response);

        if (!result.success) {
          throw new Error(result.error || 'Failed to process pairing');
        }

        setStatus('success');
        onPaired?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process pairing response');
        setStatus('error');
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [inviteToken, onPaired, status]);

  useEffect(() => () => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadQR = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'pairing-qr.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handlePrintQR = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', 'print-qr', 'width=600,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
            img { width: 280px; height: 280px; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="Pairing QR code" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }, []);

  const updateLinkActionState = useCallback((state: 'success' | 'error', message: string) => {
    setLinkActionState(state);
    setLinkActionMessage(message);

    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }

    playbackTimeoutRef.current = setTimeout(() => {
      setLinkActionState('idle');
      setLinkActionMessage('');
      playbackTimeoutRef.current = null;
    }, 2200);
  }, []);

  const copyInviteLink = useCallback(async () => {
    if (!inviteUrl) return false;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      updateLinkActionState('success', 'Invite link copied.');
      return true;
    } catch {
      updateLinkActionState('error', 'Could not copy invite link.');
      return false;
    }
  }, [inviteUrl, updateLinkActionState]);

  const handleShareInvite = useCallback(async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pairing Invite',
          text: 'Use this single-use invite to pair.',
          url: inviteUrl,
        });
        updateLinkActionState('success', 'Invite shared.');
        return;
      } catch {
        // Fall back to clipboard if share was cancelled or unavailable in current context.
      }
    }

    await copyInviteLink();
  }, [copyInviteLink, inviteUrl, updateLinkActionState]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-cyan-400">Pairing Ritual</h1>
          <p className="text-xs text-zinc-500">Bond with a pet</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-zinc-100">
              {status === 'success' ? 'Bond Established!' : 'Show This to the Pet Owner'}
            </CardTitle>
            <CardDescription>
              {status === 'ready' && `Expires in ${formatTime(timeLeft)}`}
              {status === 'processing' && 'Processing pet owner confirmation...'}
              {status === 'expired' && 'Invite has expired'}
              {status === 'generating' && 'Generating secure invite...'}
              {status === 'success' && 'A new crest has been added to your constellation'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              className={`rounded-xl border-2 p-4 transition-all ${
                status === 'ready'
                  ? 'border-cyan-500/50 bg-white'
                  : status === 'success'
                  ? 'border-green-500/50 bg-white'
                  : status === 'expired'
                  ? 'border-rose-500/30 bg-slate-800'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <canvas
                ref={canvasRef}
                className={status === 'ready' || status === 'success' ? '' : 'opacity-30'}
                width={280}
                height={280}
              />

              {status === 'expired' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-xl">
                  <p className="text-rose-400 text-sm">Expired</p>
                </div>
              )}

              {status === 'success' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-xl"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2"
                    >
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                    <p className="text-green-600 font-medium">Connected!</p>
                  </div>
                </motion.div>
              )}
            </div>

            {inviteUrl && (
              <p className="text-[11px] text-zinc-500 break-all text-center">
                Pairing link: {inviteUrl}
              </p>
            )}

            <div className="w-full grid gap-2 sm:grid-cols-2">
              <Button onClick={handleDownloadQR} disabled={!canExportQR} variant="outline">
                Download for handouts
              </Button>
              <Button onClick={handlePrintQR} disabled={!canExportQR} variant="outline">
                Print QR
              </Button>
              <Button onClick={copyInviteLink} disabled={!canUseInviteActions} variant="outline">
                Copy Invite Link
              </Button>
              <Button onClick={handleShareInvite} disabled={!canUseInviteActions} variant="outline">
                Share Invite
              </Button>
            </div>

            <div className="w-full space-y-1 text-center">
              <p className="text-[11px] text-zinc-500">
                QR, copied link, and share all point to the same single-use invite.
              </p>
              {linkActionState !== 'idle' && (
                <p className={`text-xs ${linkActionState === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {linkActionMessage}
                </p>
              )}
            </div>

            {status === 'ready' && (
              <div className="w-full">
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    style={{
                      width: `${(timeLeft / (PAIRING_EXPIRY_MS / 1000)) * 100}%`,
                      transition: 'width 1s linear',
                    }}
                  />
                </div>
              </div>
            )}

            {(status === 'expired' || status === 'error') && (
              <Button onClick={generateInvite} className="w-full">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate New Invite
              </Button>
            )}
          </CardContent>
        </Card>

        {status === 'success' && (
          <Button onClick={onBack} className="w-full">
            Return to {BRAND_UI.productName}
          </Button>
        )}

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
          <h3 className="text-xs font-medium text-zinc-400 mb-2">How Pairing Works</h3>
          <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
            <li>Show the QR code to the pet owner</li>
            <li>They scan and review consent on their own device</li>
            <li>Their acceptance is sent through a single-use secure token</li>
            <li>This screen auto-completes once the bond is accepted</li>
          </ol>
          <p className="text-xs text-cyan-500/70 mt-3 italic">
            You'll never see their name, only their pet's crest.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PairQR;
