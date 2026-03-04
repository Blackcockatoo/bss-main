import Link from 'next/link';

const gamePillars = [
  {
    title: 'Math Relay',
    details: 'Players solve age-appropriate math prompts to move their class team across a shared map.',
  },
  {
    title: 'Word Forge',
    details: 'Build vocabulary through quick sentence challenges tied to current class reading goals.',
  },
  {
    title: 'Science Lab Sprint',
    details: 'Short hypothesis-and-evidence rounds reward curiosity and collaborative reasoning.',
  },
];

export default function SchoolQuestPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl p-6 pb-24">
      <header className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Game concept update</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Classroom Quest</h1>
        <p className="mt-3 text-sm text-slate-300">
          We&apos;re retiring the old Space Jewels concept and moving to a school-friendly mini game that
          reinforces classroom learning outcomes.
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {gamePillars.map((pillar) => (
          <article key={pillar.title} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold text-emerald-300">{pillar.title}</h2>
            <p className="mt-2 text-xs text-slate-300">{pillar.details}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-cyan-500/30 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-cyan-300">Brainstorm prompts</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
          <li>What curriculum standards should each game round reinforce?</li>
          <li>How should teams earn points for collaboration, not just speed?</li>
          <li>What accessibility options should be available from day one?</li>
        </ul>
        <div className="mt-4 flex gap-3">
          <Link href="/veil" className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500">
            Back to Hub
          </Link>
          <Link href="/veil/digital-dna" className="rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800">
            Open Digital DNA
          </Link>
        </div>
      </section>
    </main>
  );
}
