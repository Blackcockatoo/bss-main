'use client';

import dynamic from 'next/dynamic';

const DigitalDNAHub = dynamic(() => import('@/components/veil/DigitalDNAHub'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Veil Digital DNA"
      className="min-h-screen bg-slate-950 text-amber-50"
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-6xl" aria-hidden="true">🧬</div>
        <h1 className="text-2xl font-semibold text-amber-300">Loading Digital DNA</h1>
        <p className="mt-3 text-sm text-slate-300">
          Initializing the 3D helix engine and interactive controls.
        </p>
      </div>
    </div>
  ),
});

export default function DigitalDNAPage() {
  return <DigitalDNAHub />;
}
