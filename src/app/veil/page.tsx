'use client';

import MentorDashboard from '@/components/mentor/MentorDashboard';
import { RoleGuard } from '@/components/role/RoleGuard';

export default function HomePage() {
  return (
    <RoleGuard requiredRole="teacher" redirectTo="/veil/kid">
      <MentorDashboard />
    </RoleGuard>
  );
}
