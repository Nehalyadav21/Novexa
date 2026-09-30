/**
 * Meeting Page - Main Entry Point
 * 
 * This page handles:
 * 1. Meeting routing (join/create)
 * 2. User state management
 * 3. Meeting state transitions
 * 4. URL parameter handling for direct meeting joins
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MeetingJoin from '../../components/MeetingJoin';
import MeetingRoom from '../../components/MeetingRoom';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

const MeetingContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Meeting state - Always start with 'join' view for password collection
  const [currentView, setCurrentView] = useState('join'); // 'join' | 'meeting'
  const [meetingId, setMeetingId] = useState('');
  const [user, setUser] = useState(null);
  const [meetingPassword, setMeetingPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  console.log('🔧 Current state:', { currentView, meetingId, hasUser: !!user, meetingPassword });

  // Check for meeting ID in URL parameters
  useEffect(() => {
    const urlMeetingId = searchParams.get('id');
    console.log('🔍 URL Check:', { urlMeetingId, currentView });
    if (urlMeetingId) {
      setMeetingId(urlMeetingId);
      
      // Don't auto-join anymore - always show join screen for password collection
      // This ensures password-protected meetings can collect the password
      console.log('📝 Setting meeting ID but staying on join view for password collection');
      // 
      // // If user data exists in localStorage, auto-join
      // const savedUserName = localStorage.getItem('meetingUserName');
      // if (savedUserName) {
      //   const userData = {
      //     userId: Date.now().toString(),
      //     name: savedUserName,
      //     email: savedUserName.includes('@') ? savedUserName : `${savedUserName}@example.com`
      //   };
      //   setUser(userData);
      //   setCurrentView('meeting');
      // }
    }
    setIsLoading(false);
  }, [searchParams]);

  /**
   * Handle creating a new meeting
   */
  const handleCreateMeeting = async (newMeetingId, userData) => {
    console.log('Creating meeting:', newMeetingId, userData);
    
    // Ensure userData has proper structure for DirectWebRTC
    const preparedUserData = {
      id: userData.userId || userData.id || `temp_${Date.now()}`,
      userId: userData.userId || userData.id || `temp_${Date.now()}`,
      name: userData.name || userData.userName || userData.email || 'Anonymous User',
      email: userData.email || userData.name || 'anonymous@example.com'
    };
    
    console.log('Prepared user data for meeting creation:', preparedUserData);
    
    try {
      // Save meeting to database
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: newMeetingId, // Add the meeting room ID
          title: userData.meetingName || `Meeting ${newMeetingId}`,
          description: `Meeting created by ${preparedUserData.name}`,
          scheduledAt: new Date().toISOString(),
          participants: [],
          password: userData.password, // Add password
          settings: {
            transcriptionEnabled: true,
            audioEnabled: true,
            videoEnabled: true,
            recordingEnabled: false
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Meeting saved to database:', result);
      }
    } catch (error) {
      console.error('Failed to save meeting to database:', error);
    }
    
    setMeetingId(newMeetingId);
    setUser(preparedUserData);
    setCurrentView('meeting');
    
    // Update URL without page reload
    const newUrl = `/meeting?id=${newMeetingId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  /**
   * Handle joining an existing meeting
   */
  const handleJoinMeeting = (meetingIdToJoin, userData, password = '') => {
    console.log('Joining meeting:', meetingIdToJoin, userData);
    
    // Ensure userData has proper structure for DirectWebRTC
    const preparedUserData = {
      id: userData.userId || userData.id || `temp_${Date.now()}`,
      userId: userData.userId || userData.id || `temp_${Date.now()}`,
      name: userData.name || userData.userName || userData.email || 'Anonymous User',
      email: userData.email || userData.name || 'anonymous@example.com'
    };
    
    console.log('Prepared user data for meeting:', preparedUserData);
    
    setMeetingId(meetingIdToJoin);
    setUser(preparedUserData);
    setMeetingPassword(password);
    setCurrentView('meeting');
    
    // Update URL without page reload
    const newUrl = `/meeting?id=${meetingIdToJoin}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  /**
   * Handle leaving the meeting
   */
  const handleLeaveMeeting = () => {
    console.log('Leaving meeting');
    
    setCurrentView('join');
    setMeetingId('');
    setUser(null);
    setMeetingPassword('');
    
    // Clear the URL parameters and redirect to the main meeting page
    router.replace('/meeting');
  };

  /**
   * Generate shareable meeting link
   */
  const generateMeetingLink = (meetingId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/meeting?id=${meetingId}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: COLORS.accent }}></div>
            <p className="text-lg text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate view
  console.log('🎭 Rendering view:', { currentView, meetingId, hasUser: !!user });
  return (
    <div className={`min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      
      {currentView === 'join' ? (
        <>
          <DashboardNavbar />
          <div className="relative z-10 min-h-screen pt-16">
            <MeetingJoin
              onJoinMeeting={handleJoinMeeting}
              onCreateMeeting={handleCreateMeeting}
              initialMeetingId={meetingId}
            />
          </div>
        </>
      ) : (
        <div className="relative z-10 min-h-screen">
          <MeetingRoom
            meetingId={meetingId}
            user={user}
            meetingPassword={meetingPassword}
            onLeaveMeeting={handleLeaveMeeting}
          />
        </div>
      )}
    </div>
  );
};

const MeetingPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MeetingContent />
    </Suspense>
  );
};

export default MeetingPage;
