'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { fetchTransportMessage, TransportError } from '@/lib/protocol/transport-client';
import { isBlessingRedeemed, redeemBlessing, verifyBlessingObject } from '@/lib/veil';
import type { Blessing } from '@/lib/veil/types';

export default function BlessingClaimTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [status, setStatus] = useState<'loading' | 'ready' | 'claiming' | 'success' | 'error'>('loading');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blessing, setBlessing] = useState<Blessing | null>(null);

  const loadBlessing = useCallback(async () => {
    try {
      const envelope = await fetchTransportMessage(token);
      if (envelope.payload.type !== 'blessing-claim-request') {
        throw new TransportError('invalid-payload', 'This token is not a blessing claim');
      }

      setBlessing(envelope.payload.blessing);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      if (err instanceof TransportError) {
        setErrorCode(err.code);
        setError(err.message);
      } else {
        setErrorCode('invalid-token');
        setError(err instanceof Error ? err.message : 'Unable to load blessing');
      }
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadBlessing();
    }
  }, [token, loadBlessing]);

  const handleClaim = useCallback(async () => {
    if (!blessing) return;
    setStatus('claiming');

    try {
      if (isBlessingRedeemed(blessing.blessingId)) {
        throw new Error('This blessing was already claimed on this device.');
      }

      const verification = await verifyBlessingObject(blessing);
      if (!verification.valid) {
        throw new Error('Blessing signature verification failed.');
      }

      const result = await redeemBlessing(blessing);
      if (!result.success) {
        throw new Error(result.error || 'Redemption failed.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Claim failed');
    }
  }, [blessing]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-zinc-300">Loading blessing...</div>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-900/80 border-rose-500/40">
          <CardHeader>
            <CardTitle className="text-rose-400">Blessing unavailable</CardTitle>
            <CardDescription>
              {errorCode === 'expired-token' && 'This blessing link expired. Ask your mentor for a new one.'}
              {errorCode === 'already-used-token' && 'This blessing link was already used and cannot be reused.'}
              {errorCode !== 'expired-token' && errorCode !== 'already-used-token' && 'This blessing link is invalid.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <p className="text-xs text-zinc-500">{error}</p>}
            <Link href="/veil">
              <Button className="w-full">Return home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-900/80 border-green-500/40">
          <CardHeader>
            <CardTitle className="text-green-400">Blessing claimed</CardTitle>
            <CardDescription>Your pet has received this gift.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/veil">
              <Button className="w-full">Done</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="max-w-md w-full bg-slate-900/80 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-zinc-100">Claim blessing</CardTitle>
          <CardDescription>{blessing?.metadata.name ?? 'A mentor gift is ready for you.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {blessing?.metadata.flavorText && <p className="text-sm text-zinc-400 italic">"{blessing.metadata.flavorText}"</p>}
          <Button onClick={handleClaim} disabled={status === 'claiming'} className="w-full">
            {status === 'claiming' ? 'Claiming...' : 'Claim now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
