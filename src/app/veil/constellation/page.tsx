'use client';

import { useRouter } from 'next/navigation';
import { Constellation } from '@/components/veil';
import { RoleGuard } from '@/components/role/RoleGuard';

export default function ConstellationPage() {
  const router = useRouter();

  return (
    <RoleGuard requiredRole="teacher" redirectTo="/veil/kid">
      <Constellation
        onBack={() => router.push('/veil')}
      />
    </RoleGuard>
  );
}
