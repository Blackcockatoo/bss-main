"use client";

import { PairConfirm } from "@/components/veil";
import {
  type SharedPetState,
  ensureSharedPetState,
  getSharedPetCrestHash,
  getSharedPetState,
  markSharedPetPaired,
} from "@/lib/shared-pet-state";
import { deserializeInvite } from "@/lib/veil";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function KidPairPage() {
  const params = useSearchParams();
  const [responseCode, setResponseCode] = useState<string | null>(null);
  const [sharedPet, setSharedPet] = useState<SharedPetState | null>(() => {
    if (typeof window === "undefined") return null;
    return getSharedPetState() ?? ensureSharedPetState();
  });

  const inviteData = params.get("invite");
  const crest =
    params.get("crest") ||
    sharedPet?.identity.crestHash ||
    getSharedPetCrestHash();

  const invite = useMemo(() => {
    if (!inviteData) return null;
    return deserializeInvite(inviteData);
  }, [inviteData]);

  if (!inviteData || !invite) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4">
          <h1 className="text-base font-semibold text-amber-300">
            Missing pairing invite
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Add a serialized invite using{" "}
            <code className="text-amber-200">?invite=...</code>.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Quick test: copy the invite from the teacher Pair page, then open
            this route.
          </p>
          <Link
            href="/veil/kid"
            className="mt-4 inline-block text-xs text-amber-200 underline"
          >
            Back to kid home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <PairConfirm
        invite={invite}
        petCrestHash={crest}
        onCancel={() => window.history.back()}
        onComplete={(code) => {
          setResponseCode(code);
          const next = markSharedPetPaired(invite.hubId);
          setSharedPet(next);
        }}
      />

      {sharedPet && (
        <section className="mx-auto w-full max-w-3xl px-4 pt-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <h2 className="text-sm font-semibold text-cyan-300">
              Shared Pet Snapshot
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {sharedPet.identity.displayName} ({sharedPet.identity.petId})
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
              <span>Hunger {Math.round(sharedPet.vitals.hunger)}</span>
              <span>Hygiene {Math.round(sharedPet.vitals.hygiene)}</span>
              <span>Mood {Math.round(sharedPet.vitals.mood)}</span>
              <span>Energy {Math.round(sharedPet.vitals.energy)}</span>
            </div>
            <p className="mt-2 text-xs text-amber-200">
              Bond resonance: {Math.round(sharedPet.bond.score)}% (
              {sharedPet.bond.band})
            </p>
          </div>
        </section>
      )}

      {responseCode && (
        <section className="mx-auto w-full max-w-3xl p-4 pb-24">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/10 p-4">
            <h2 className="text-sm font-semibold text-emerald-300">
              Response code ready
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Share this response with the teacher so they can complete pairing.
            </p>
            <textarea
              value={responseCode}
              readOnly
              className="mt-3 h-24 w-full rounded-lg border border-emerald-500/30 bg-slate-950/80 p-2 text-xs text-emerald-100"
            />
          </div>
        </section>
      )}
    </main>
  );
}
