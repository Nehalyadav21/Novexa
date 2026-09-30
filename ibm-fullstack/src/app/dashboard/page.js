'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import CheckInWidget from '@/components/CheckInWidget';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch company data
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await fetch('/api/company');
        if (!response.ok) {
          setCompanyData(null);
          setLoading(false);
          return;
        }
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setCompanyData(data);
        } catch (jsonError) {
          console.error('Company API did not return JSON:', text);
          setCompanyData(null);
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        setCompanyData(null);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchCompanyData();
    }
  }, [session]);

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="text-center relative z-10">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: COLORS.accent }}
          ></div>
          <p className="mt-4 text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">Please sign in to access the dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className={`${inter.className} relative z-10`}>
        <DashboardNavbar 
          user={session.user} 
          companyData={companyData}
        />
        
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pt-24">
          <div className="space-y-6">
            {/* Welcome Section */}
            <div 
              className="p-8 rounded-xl shadow-lg text-white relative overflow-hidden border border-gray-700"
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary}, ${COLORS.violet})`,
              }}
            >
              <h1 className="text-3xl font-bold mb-2">Welcome back, {session.user.name}!</h1>
              <p className="text-white/90 text-lg">Ready to tackle your work? Let&apos;s get started.</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Check-in Widget */}
              <CheckInWidget />

              {/* Video Meetings */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.accent}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0021 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Video Meetings</h3>
                </div>
                <p className="text-gray-300 mb-4">Start or join video conferences with HD quality.</p>
                <Link href="/meeting">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                  >
                    Go to Meetings
                  </button>
                </Link>
              </div>

              {/* Teams */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.secondary}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Teams</h3>
                </div>
                <p className="text-gray-300 mb-4">Create teams and collaborate with members.</p>
                <Link href="/teams">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.violet})` }}
                  >
                    Manage Teams
                  </button>
                </Link>
              </div>

              {/* Chats */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.violet}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.violet }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Chats</h3>
                </div>
                <p className="text-gray-300 mb-4">Chat with team members and colleagues.</p>
                <Link href="/chats">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.accent})` }}
                  >
                    Open Chats
                  </button>
                </Link>
              </div>

              {/* Tasks */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.accent}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Tasks</h3>
                </div>
                <p className="text-gray-300 mb-4">Manage and track your assigned tasks.</p>
                <Link href="/tasks">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                  >
                    View Tasks
                  </button>
                </Link>
              </div>

              {/* Meeting History */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.secondary}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Meeting History</h3>
                </div>
                <p className="text-gray-300 mb-4">View past meetings, transcripts, and AI summaries.</p>
                <Link href="/meetings">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.violet})` }}
                  >
                    View History
                  </button>
                </Link>
              </div>

              {/* Profile */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.violet}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.violet }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Profile</h3>
                </div>
                <p className="text-gray-300 mb-4">View your profile and check-in history.</p>
                <Link href="/profile">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.accent})` }}
                  >
                    View Profile
                  </button>
                </Link>
              </div>

              {/* AI Agent */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.secondary}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">AI Agent</h3>
                </div>
                <p className="text-gray-300 mb-4">Chat with our intelligent AI assistant.</p>
                <Link href="/agent">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.violet})` }}
                  >
                    Chat with AI
                  </button>
                </Link>
              </div>

              {/* Company Info */}
              <div className="bg-[#1a1a1d] p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition-all transform hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS.accent}20` }}>
                    <svg className="w-6 h-6" style={{ color: COLORS.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold ml-3 text-white">Company Info</h3>
                </div>
                <p className="text-gray-300 mb-4">View company details and settings.</p>
                <Link href="/company-info">
                  <button 
                    className="w-full text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                  >
                    Company Details
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
