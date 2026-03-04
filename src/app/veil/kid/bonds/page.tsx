'use client';

import { useRouter } from 'next/navigation';
import { BondMarks } from '@/components/veil';

export default function KidBondsPage() {
  const router = useRouter();

  return (
    <BondMarks
      onClose={() => router.push('/veil/kid')}
    />
  );
}
