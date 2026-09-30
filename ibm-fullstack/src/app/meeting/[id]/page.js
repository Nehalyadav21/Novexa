/**
 * Dynamic Meeting Room Page
 * 
 * This page handles direct meeting room access via URL parameters
 * Route: /meeting/[id] where id is the meetingId
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MeetingJoin from '../../../components/MeetingJoin';
import MeetingRoom from '../../../components/MeetingRoom';
import DashboardNavbar from '../../../components/DashboardNavbar';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

export default function DynamicMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Meeting state
  const [currentView, setCurrentView] = useState('join'); // 'join' | 'meeting'
  const [meetingId, setMeetingId] = useState('');
  const [user, setUser] = useState(null);
  const [meetingPassword, setMeetingPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Extract meeting ID from URL params
  useEffect(() => {
    if (params?.id) {
      setMeetingId(params.id);
    }
  }, [params]);

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        profilePicture: session.user.profilePicture
      });
      setIsLoading(false);
    }
  }, [session, status, router]);

  // Don't auto-join meetings anymore - always show join screen for password collection
  // This ensures password-protected meetings can collect the password
  // useEffect(() => {
  //   if (user && meetingId && currentView === 'join') {
  //     // Auto-proceed to meeting room for direct links
  //     setCurrentView('meeting');
  //   }
  // }, [user, meetingId, currentView]);

  const handleJoinMeeting = (id, userData, password = '') => {
    setMeetingId(id);
    setUser(userData);
    setMeetingPassword(password);
    setCurrentView('meeting');
  };

  const handleLeaveMeeting = () => {
    setCurrentView('join');
    setMeetingId('');
    router.push('/meeting');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.background }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: COLORS.accent }}></div>
          <p className="text-white">Loading meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen`} style={{ background: COLORS.background }}>
      <Particles />
      
      {currentView === 'join' ? (
        <>
          <DashboardNavbar />
          <div className="pt-20">
            <MeetingJoin 
              onJoinMeeting={handleJoinMeeting}
              initialMeetingId={meetingId}
              initialUser={user}
            />
          </div>
        </>
      ) : (
        <MeetingRoom 
          meetingId={meetingId} 
          user={user} 
          meetingPassword={meetingPassword}
          onLeaveMeeting={handleLeaveMeeting}
        />
      )}
    </div>
  );
}
