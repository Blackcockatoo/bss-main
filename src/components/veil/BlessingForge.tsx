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
  forgeBlessing,
  getBlessingTypeName,
  getDefaultBlessingMetadata,
} from "@/lib/veil";
import { formatClaimCode } from "@/lib/veil/claim-code";
import type { Blessing, BlessingType } from "@/lib/veil/types";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

interface BlessingForgeProps {
  onBack: () => void;
}

interface BlessingClaimSummary {
  code: string;
  status: "active" | "redeemed" | "expired" | "revoked";
  createdAt: number;
  expiresAt: number;
  redeemedAt: number | null;
  revokedAt: number | null;
  blessing: {
    blessingId: string;
    type: BlessingType;
    metadata: {
      name: string;
      flavorText?: string;
    };
  };
}

const STATUS_LABEL: Record<BlessingClaimSummary["status"], string> = {
  active: "Active",
  redeemed: "Redeemed",
  expired: "Expired",
  revoked: "Revoked",
};

const STATUS_STYLE: Record<BlessingClaimSummary["status"], string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  redeemed: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  expired: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  revoked: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export function BlessingForge({ onBack }: BlessingForgeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedType, setSelectedType] = useState<BlessingType | null>(null);
  const [customName, setCustomName] = useState("");
  const [customFlavor, setCustomFlavor] = useState("");
  const [forgedBlessing, setForgedBlessing] = useState<Blessing | null>(null);
  const [isForging, setIsForging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [claimExpiresAt, setClaimExpiresAt] = useState<number | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [claims, setClaims] = useState<BlessingClaimSummary[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);

  const blessingTypes: {
    type: BlessingType;
    icon: string;
    description: string;
    color: string;
  }[] = [
    {
      type: "sticker",
      icon: "🌟",
      description: "A decorative sticker for their pet",
      color: "from-amber-500 to-orange-500",
    },
    {
      type: "aura",
      icon: "✨",
      description: "A glowing aura effect",
      color: "from-purple-500 to-pink-500",
    },
    {
      type: "accessory",
      icon: "👑",
      description: "A wearable accessory",
      color: "from-cyan-500 to-blue-500",
    },
  ];

  const loadClaims = useCallback(async () => {
    setClaimsLoading(true);
    setClaimError(null);

    try {
      const response = await fetch(
        "/api/blessings/claims?includeRedeemed=true&includeExpired=true&includeRevoked=true",
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Could not load blessing claims.");
      }

      const payload = await response.json();
      setClaims(Array.isArray(payload.claims) ? payload.claims : []);
    } catch (err) {
      setClaimError(
        err instanceof Error ? err.message : "Could not load blessing claims.",
      );
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const handleForge = useCallback(async () => {
    if (!selectedType) {
      setError("Select a blessing type");
      return;
    }

    setIsForging(true);
    setError(null);

    try {
      const defaultMeta = getDefaultBlessingMetadata(selectedType);
      const metadata = {
        ...defaultMeta,
        name: customName || defaultMeta.name,
        flavorText: customFlavor || defaultMeta.flavorText,
      };

      const blessing = await forgeBlessing(selectedType, metadata);
      if (!blessing) {
        throw new Error("Failed to forge blessing");
      }

      const claimResponse = await fetch("/api/blessings/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blessing }),
      });

      if (!claimResponse.ok) {
        throw new Error(
          "Could not create a short claim code. Please try again.",
        );
      }

      const claimPayload = await claimResponse.json();
      const claimToken = claimPayload.code ?? claimPayload.token;

      if (!claimToken) {
        throw new Error("Claim response missing code/token");
      }

      const nextClaimUrl = `${window.location.origin}/veil/blessing/claim/${encodeURIComponent(claimToken)}`;

      setClaimCode(
        claimPayload.code ? formatClaimCode(claimPayload.code) : claimToken,
      );
      setClaimExpiresAt(claimPayload.expiresAt);
      setForgedBlessing(blessing);
      setClaimUrl(nextClaimUrl);

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, nextClaimUrl, {
          width: 220,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forging failed");
    } finally {
      setIsForging(false);
    }
  }, [selectedType, customName, customFlavor]);

  const revokeClaim = useCallback(
    async (code: string) => {
      setRevokingCode(code);
      setClaimError(null);

      try {
        const response = await fetch("/api/blessings/claims/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const payload = await response.json();

        if (!response.ok) {
          if (payload?.error) {
            setClaimError(payload.error);
          } else {
            setClaimError("Could not revoke blessing claim.");
          }

          await loadClaims();
          return;
        }

        setClaims((current) =>
          current.map((claim) => {
            if (claim.code !== payload.code) {
              return claim;
            }

            return {
              ...claim,
              status: "revoked",
              revokedAt: payload.revokedAt ?? Date.now(),
            };
          }),
        );
      } catch {
        setClaimError("Could not revoke blessing claim.");
      } finally {
        setRevokingCode(null);
      }
    },
    [loadClaims],
  );

  const copyCode = useCallback(async () => {
    if (!forgedBlessing) return;

    if (!claimCode) {
      setError("No short code available yet");
      return;
    }

    try {
      await navigator.clipboard.writeText(claimCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Please select and copy manually.");
    }
  }, [claimCode, forgedBlessing]);

  // Copy full blessing data (for advanced use)
  const copyFullBlessing = useCallback(async () => {
    if (!claimUrl) return;

    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy claim link");
    }
  }, [claimUrl]);

  const reset = () => {
    setForgedBlessing(null);
    setSelectedType(null);
    setCustomName("");
    setCustomFlavor("");
    setCopied(false);
    setClaimCode(null);
    setClaimExpiresAt(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-purple-400">
            Blessing Forge
          </h1>
          <p className="text-xs text-zinc-500">
            Create gifts for your constellation
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {!forgedBlessing ? (
            <motion.div
              key="forge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-zinc-100">
                    Choose a Gift Type
                  </CardTitle>
                  <CardDescription>
                    What blessing will you forge?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blessingTypes.map(({ type, icon, description, color }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedType === type ? "border-purple-500 bg-purple-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-2xl`}
                        >
                          {icon}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">
                            {getBlessingTypeName(type)}
                          </p>
                          <p className="text-sm text-zinc-400">{description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {selectedType && (
                <Card className="bg-slate-900/80 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-300">
                      Customize (Optional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <input
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value)}
                      placeholder={
                        getDefaultBlessingMetadata(selectedType).name
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
                    />
                    <input
                      value={customFlavor}
                      onChange={(event) => setCustomFlavor(event.target.value)}
                      placeholder={
                        getDefaultBlessingMetadata(selectedType).flavorText
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
                    />
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleForge}
                disabled={!selectedType || isForging}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isForging ? "Forging..." : "Forge Blessing"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/80 border-purple-500/50">
                <CardHeader className="text-center">
                  <CardTitle className="text-zinc-100">
                    Blessing Forged!
                  </CardTitle>
                  <CardDescription>
                    {forgedBlessing.metadata.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-950 rounded-lg p-4 text-center">
                    <p className="text-xs text-zinc-500 mb-2">
                      Short Claim Code
                    </p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-2xl font-mono font-bold text-purple-400 tracking-wider select-all"
                    >
                      {claimCode || "..."}
                    </motion.p>
                    {claimExpiresAt && (
                      <p className="text-[11px] text-zinc-500 mt-2">
                        Expires {new Date(claimExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {forgedBlessing.metadata.flavorText && (
                    <p className="text-sm text-zinc-400 text-center italic">
                      "{forgedBlessing.metadata.flavorText}"
                    </p>
                  )}

                  {claimUrl && (
                    <div className="bg-white rounded-lg p-3 flex justify-center">
                      <canvas ref={canvasRef} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={copyCode}
                      variant="outline"
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-2 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy Short Code
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      variant="ghost"
                      className="px-3"
                      title="Print"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                    </Button>
                  </div>

                  {/* Advanced: Copy full data */}
                  <button
                    onClick={copyFullBlessing}
                    disabled={!claimUrl}
                    className="text-xs text-zinc-500 hover:text-zinc-400 underline w-full text-center"
                  >
                    {copied ? "Copied!" : "Copy Short Code"}
                  </button>
                </CardContent>
              </Card>
              <Button onClick={reset} variant="outline" className="w-full">
                Forge Another
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-base">
              Claim Management
            </CardTitle>
            <CardDescription>
              Review active and completed claims, then revoke active ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadClaims()}
                disabled={claimsLoading}
              >
                {claimsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {claimError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <p className="text-xs text-rose-300">{claimError}</p>
              </div>
            )}

            {!claimsLoading && claims.length === 0 && (
              <p className="text-sm text-zinc-400">No claims found yet.</p>
            )}

            <div className="space-y-2">
              {claims.map((claim) => (
                <div
                  key={claim.code}
                  className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-zinc-100 font-medium">
                        {claim.blessing.metadata.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatClaimCode(claim.code)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLE[claim.status]}`}
                    >
                      {STATUS_LABEL[claim.status]}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 space-y-1">
                    <p>Expires: {new Date(claim.expiresAt).toLocaleString()}</p>
                    {claim.redeemedAt && (
                      <p>
                        Redeemed: {new Date(claim.redeemedAt).toLocaleString()}
                      </p>
                    )}
                    {claim.revokedAt && (
                      <p>
                        Revoked: {new Date(claim.revokedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        claim.status !== "active" || revokingCode === claim.code
                      }
                      onClick={() => void revokeClaim(claim.code)}
                    >
                      {revokingCode === claim.code ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
          <p className="text-xs text-zinc-500">
            <strong className="text-purple-400">How it works:</strong> Share the
            short claim code with your class. The full blessing stays
            server-side until a kid redeems once. You&apos;ll never know who
            claimed it — you&apos;ll just see your mentor pet grow.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BlessingForge;
