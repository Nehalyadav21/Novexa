'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import { 
  FiUser, 
  FiCalendar, 
  FiCheck, 
  FiBriefcase,
  FiMail,
  FiClock,
  FiMapPin,
  FiArrowLeft
} from 'react-icons/fi';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

const UserProfilePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { userId } = params;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session && userId) {
      fetchUserProfile();
    }
  }, [session, status, userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/profile/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="relative z-10">
          <DashboardNavbar user={session?.user} />
          <div className="pt-32 max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center">
              <div 
                className="animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: COLORS.accent }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="relative z-10">
          <DashboardNavbar user={session?.user} />
          <div className="pt-32 max-w-7xl mx-auto px-4">
            <div className="bg-red-500/20 text-red-400 rounded-xl border border-red-500/50 backdrop-blur-sm p-6 text-center">
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className="relative z-10">
        <DashboardNavbar user={session?.user} />
        <div className="pt-32 max-w-7xl mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <FiArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>

          {/* Profile Header */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-8 mb-8 border border-gray-600">
            <div className="flex items-center space-x-6">
              <div className="relative">
                {profile?.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover border-4"
                    style={{ borderColor: COLORS.accent }}
                  />
                ) : (
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center border-4"
                    style={{ 
                      backgroundColor: `${COLORS.accent}20`,
                      borderColor: COLORS.accent
                    }}
                  >
                    <FiUser className="h-12 w-12" style={{ color: COLORS.accent }} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{profile?.name}</h1>
                <div className="flex items-center space-x-4 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <FiMail className="h-4 w-4" />
                    <span>{profile?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiBriefcase className="h-4 w-4" />
                    <span>{profile?.role}</span>
                  </div>
                </div>
                {profile?.joinedAt && (
                  <div className="flex items-center space-x-2 text-gray-400 mt-2">
                    <FiCalendar className="h-4 w-4" />
                    <span>Joined {formatDate(profile.joinedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 mb-8 border border-gray-600">
            <h2 className="text-xl font-bold text-white mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Company</label>
                <p className="text-white">{profile?.company?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                <p className="text-white">{profile?.role}</p>
              </div>
            </div>
          </div>

          {/* Recent Check-ins */}
          {profile?.recentCheckIns && profile.recentCheckIns.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-600">
              <h2 className="text-xl font-bold text-white mb-6">Recent Check-ins</h2>
              <div className="space-y-4">
                {profile.recentCheckIns.map((checkIn) => (
                  <div key={checkIn._id} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FiCheck className="h-4 w-4 text-green-400" />
                        <span className="font-medium text-white">
                          {formatDate(checkIn.date)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <FiClock className="h-4 w-4" />
                        <span>{formatTime(checkIn.checkInTime)}</span>
                      </div>
                    </div>
                    {checkIn.location && (
                      <div className="flex items-center space-x-2 text-gray-400 mb-2">
                        <FiMapPin className="h-4 w-4" />
                        <span>{checkIn.location}</span>
                      </div>
                    )}
                    {checkIn.notes && (
                      <div className="text-gray-300 text-sm">
                        <strong>Notes:</strong> {checkIn.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.recentCheckIns && profile.recentCheckIns.length === 0 && (
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-600">
              <h2 className="text-xl font-bold text-white mb-6">Recent Check-ins</h2>
              <div className="text-center text-gray-400 py-8">
                <FiCalendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent check-ins found</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
