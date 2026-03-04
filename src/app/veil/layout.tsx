import type { Metadata } from "next";
import Link from "next/link";
import { VeilNav } from "@/components/VeilNav";
import { LegalNotice } from "@/components/LegalNotice";
import { BRAND_UI, getCopyrightNotice } from '@/lib/brand';

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: BRAND_UI.teacherHubTitle,
  description: BRAND_UI.teacherHubDescription,
  other: {
    copyright: getCopyrightNotice(CURRENT_YEAR),
  },
};

export default function VeilLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="dark antialiased min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 flex flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-800/70 bg-slate-950/70 px-6 py-4 text-center">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <LegalNotice className="text-[11px] text-slate-400" />
          <div className="flex items-center justify-center gap-3 text-[11px]">
            <Link
              href="/veil/legal"
              className="text-slate-500 transition hover:text-slate-200"
            >
              Legal details
            </Link>
            <span className="text-slate-700" aria-hidden="true">•</span>
            <Link
              href="/veil/routes"
              className="text-slate-500 transition hover:text-slate-200"
            >
              Route map
            </Link>
            <span className="text-slate-700" aria-hidden="true">•</span>
            <Link
              href="/pet"
              className="text-slate-500 transition hover:text-slate-200"
            >
              Student app
            </Link>
          </div>
        </div>
      </footer>
      <VeilNav />
    </div>
  );
}
