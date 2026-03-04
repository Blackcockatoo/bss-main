'use client';

import { useRouter } from 'next/navigation';
import { RedeemBlessing } from '@/components/veil';

export default function RedeemPage() {
  const router = useRouter();

  return <RedeemBlessing onClose={() => router.push('/veil')} />;
}
