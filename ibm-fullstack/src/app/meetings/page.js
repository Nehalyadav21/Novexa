'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardNavbar from '@/components/DashboardNavbar';
import MeetingsDashboard from '@/components/MeetingsDashboard';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

export default function MeetingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/meetings'));
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className={`min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="relative z-10">
          <DashboardNavbar user={session?.user} />
          <div className="pt-20 flex items-center justify-center">
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-gray-600">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: COLORS.accent }}></div>
              <p className="text-center mt-4 text-gray-300">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  return (
    <div className={`min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className="relative z-10">
        <DashboardNavbar user={session?.user} />
        <div className="pt-16">
          <MeetingsDashboard />
        </div>
      </div>
    </div>
  );
}
