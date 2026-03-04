import Link from 'next/link';
import { BRAND_UI } from '@/lib/brand';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-bold text-purple-500/30 mb-4">404</div>
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">
          Lost Beyond {BRAND_UI.productName}
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          This path does not exist in the mentor&apos;s sanctuary.
        </p>
        <Link
          href="/veil"
          className="inline-flex items-center justify-center rounded-md px-6 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
        >
          Return to Hub
        </Link>
      </div>
    </div>
  );
}
