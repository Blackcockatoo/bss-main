import Link from 'next/link';
import { LegalNotice } from '@/components/LegalNotice';
import { BRAND_LEGAL, BRAND_UI } from '@/lib/brand';

export default function LegalPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-16 pt-12 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Legal</h1>
        <p className="text-sm text-slate-300">
          Licensing and ownership details for the {BRAND_UI.teacherHubTitle.toLowerCase()} experience.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <LegalNotice className="text-sm text-slate-200" />
        <p className="mt-4 text-xs text-slate-400">
          This notice applies across the {BRAND_LEGAL.productFamilyName} experience, including all companion assets and
          materials delivered through the platform.
        </p>
      </section>

      <Link href="/veil" className="text-sm text-purple-300 transition hover:text-purple-200">
        Back to Hub
      </Link>
    </div>
  );
}
