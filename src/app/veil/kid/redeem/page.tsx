'use client';

import { useRouter } from 'next/navigation';
import { RedeemBlessing } from '@/components/veil';

export default function KidRedeemPage() {
  const router = useRouter();

  return (
    <RedeemBlessing
      onClose={() => router.push('/veil/kid')}
    />
  );
}
