import Link from 'next/link';

const KID_FLOWS = [
  {
    href: '/veil/kid/pair',
    title: 'Pair with Mentor',
    description: 'Open a mentor invite, review consent flags, and return a response code.',
  },
  {
    href: '/veil/kid/redeem',
    title: 'Redeem Blessing',
    description: 'Paste signed blessing data from a mentor and unlock the gift.',
  },
  {
    href: '/veil/kid/bonds',
    title: 'Manage Bonds',
    description: 'Review active mentor bonds and release any bond at any time.',
  },
] as const;

export default function KidHomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <section className="mb-5 rounded-2xl border border-purple-500/30 bg-slate-900/60 p-4">
        <h1 className="text-xl font-semibold text-purple-300">Kid Flows</h1>
        <p className="mt-2 text-sm text-slate-400">
          Use these routes to walk through the kid-side journey end-to-end.
        </p>
      </section>

      <section className="grid gap-3">
        {KID_FLOWS.map((flow) => (
          <Link
            key={flow.href}
            href={flow.href}
            className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 transition hover:border-purple-400/70"
          >
            <h2 className="text-base font-semibold text-slate-100">{flow.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{flow.description}</p>
            <p className="mt-3 text-xs text-purple-300">{flow.href}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
