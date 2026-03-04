"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Button } from "@/components/ui/button";
import {
  TransportError,
  createReplyToken,
  fetchTransportMessage,
} from "@/lib/protocol/transport-client";
import {
  type SharedPetState,
  ensureSharedPetState,
  getSharedPetState,
  markSharedPetPaired,
} from "@/lib/shared-pet-state";
import {
  addBondMark,
  createPairingResponse,
  verifyPairingInvite,
} from "@/lib/veil";
import type { ConsentFlag, PairingInvite } from "@/lib/veil/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function PairConnectTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invite, setInvite] = useState<PairingInvite | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "submitting" | "success" | "error"
  >("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alias, setAlias] = useState("");
  const [consentFlags, setConsentFlags] = useState<ConsentFlag[]>([
    "receiveBlessings",
  ]);
  const [sharedPet, setSharedPet] = useState<SharedPetState | null>(() => {
    if (typeof window === "undefined") return null;
    return getSharedPetState() ?? ensureSharedPetState();
  });

  const toggleFlag = (flag: ConsentFlag) => {
    setConsentFlags((prev) =>
      prev.includes(flag)
        ? prev.filter((item) => item !== flag)
        : [...prev, flag],
    );
  };

  const loadInvite = useCallback(async () => {
    try {
      setStatus("loading");
      const envelope = await fetchTransportMessage(token);
      if (envelope.payload.type !== "pair-invite") {
        throw new TransportError(
          "invalid-payload",
          "This token is not a pairing invite",
        );
      }

      const verification = await verifyPairingInvite(envelope.payload.invite);
      if (!verification.valid) {
        throw new Error(verification.error ?? "Invite failed verification");
      }

      setInvite(envelope.payload.invite);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      if (err instanceof TransportError) {
        setErrorCode(err.code);
        setError(err.message);
      } else {
        setErrorCode("invalid-token");
        setError(err instanceof Error ? err.message : "Unable to load invite");
      }
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadInvite();
    }
  }, [token, loadInvite]);

  const handleAccept = useCallback(async () => {
    if (!invite) return;
    setStatus("submitting");
    setError(null);

    try {
      const petState = sharedPet ?? ensureSharedPetState();
      const response = await createPairingResponse(
        petState.identity.crestHash,
        consentFlags,
        alias || undefined,
      );

      await createReplyToken(token, {
        type: "pair-accept",
        response,
      });

      addBondMark(invite, consentFlags);
      setSharedPet(markSharedPetPaired(invite.hubId));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      if (err instanceof TransportError) {
        setErrorCode(err.code);
      }
      setError(
        err instanceof Error ? err.message : "Failed to submit acceptance",
      );
    }
  }, [invite, consentFlags, alias, token, sharedPet]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-300">
        Loading invite...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-900/80 border-rose-500/40">
          <CardHeader>
            <CardTitle className="text-rose-400">Invite unavailable</CardTitle>
            <CardDescription className="text-zinc-400">
              {errorCode === "expired-token" &&
                "This pairing token expired. Ask your mentor for a fresh QR code."}
              {errorCode === "already-used-token" &&
                "This pairing token was already used once and cannot be replayed."}
              {errorCode !== "expired-token" &&
                errorCode !== "already-used-token" &&
                "This pairing token is invalid."}
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

  if (status === "success") {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-900/80 border-green-500/40">
          <CardHeader>
            <CardTitle className="text-green-400">Bond accepted</CardTitle>
            <CardDescription>
              Your mentor will see this bond in a moment.
            </CardDescription>
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
      <Card className="max-w-md w-full bg-slate-900/80 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-zinc-100">Accept mentor pairing</CardTitle>
          <CardDescription>
            Review what you want to share before confirming.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            Mentor ID: <code className="text-cyan-400">{invite?.hubId}</code>
          </p>

          {sharedPet && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-xs text-zinc-300 space-y-1">
              <p>
                Pet identity:{" "}
                <span className="text-cyan-300">
                  {sharedPet.identity.displayName}
                </span>
              </p>
              <p className="text-zinc-400">
                Crest hash: {sharedPet.identity.crestHash.slice(0, 16)}…
              </p>
              <p className="text-amber-200">
                Bond resonance: {Math.round(sharedPet.bond.score)}% (
                {sharedPet.bond.band})
              </p>
            </div>
          )}

          <input
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Nickname (optional)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            <button
              onClick={() => toggleFlag("receiveBlessings")}
              className="w-full rounded-lg border border-slate-700 p-3 text-left text-sm"
            >
              Receive blessings
            </button>
            <button
              onClick={() => toggleFlag("viewWellbeing")}
              className="w-full rounded-lg border border-slate-700 p-3 text-left text-sm"
            >
              Share wellbeing band
            </button>
          </div>

          <Button
            onClick={handleAccept}
            disabled={status === "submitting"}
            className="w-full"
          >
            {status === "submitting" ? "Submitting..." : "Accept bond"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
