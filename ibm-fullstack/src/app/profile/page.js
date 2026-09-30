'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import { 
  FiUser, 
  FiCalendar, 
  FiCheck, 
  FiX, 
  FiBriefcase,
  FiMail,
  FiClock,
  FiMapPin,
  FiEdit,
  FiCamera,
  FiSave,
  FiXCircle
} from 'react-icons/fi';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

const ProfilePage = () => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [checkIns, setCheckIns] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchProfile();
      fetchCheckIns();
    }
  }, [session, status, selectedMonth]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchCheckIns = async () => {
    try {
      const response = await fetch(`/api/checkins?month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setCheckIns(data.checkIns);
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameEdit = () => {
    setEditedName(session?.user?.name || '');
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    if (!editedName.trim()) return;

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the session with the new name
        await update({ name: data.user.name });
        setIsEditingName(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Failed to update name');
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Update the session with the new profile picture
        await update({ profilePicture: data.profilePicture });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const generateCalendar = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const calendar = [];
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const checkIn = checkIns.find(ci => ci.date.substring(0, 10) === dateStr);
      const isToday = isCurrentMonth && today.getDate() === day;
      const dayDate = new Date(year, month - 1, day);
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isPastDay = dayDate < todayDate;

      calendar.push({
        day,
        dateStr,
        checkIn,
        isToday,
        isPastDay
      });
    }

    return calendar;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar user={session?.user} />
        <div className="pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const calendar = generateCalendar();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className="relative z-10">
        <DashboardNavbar user={session?.user} />
        <div className="pt-20 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 mb-6 border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {session?.user?.profilePicture ? (
                      <img
                        src={session.user.profilePicture}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover border-4"
                        style={{ borderColor: COLORS.accent }}
                      />
                    ) : (
                      <div className="rounded-full p-3 h-20 w-20 flex items-center justify-center"
                           style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}>
                        <FiUser className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <label
                      htmlFor="profile-picture-upload"
                      className="absolute -bottom-2 -right-2 bg-gray-700 rounded-full p-2 shadow-lg border-2 border-gray-600 cursor-pointer hover:bg-gray-600 transition-colors"
                      title="Change profile picture"
                    >
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                      ) : (
                        <FiCamera className="h-4 w-4 text-white" />
                      )}
                    </label>
                    <input
                      id="profile-picture-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {isEditingName ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:border-transparent"
                            style={{ focusRingColor: COLORS.accent }}
                            autoFocus
                          />
                          <button
                            onClick={handleNameSave}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                          >
                            <FiSave className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingName(false);
                              setEditedName('');
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <FiXCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <h1 className="text-2xl font-bold text-white">{session?.user?.name}</h1>
                          <button
                            onClick={() => {
                              setIsEditingName(true);
                              setEditedName(session?.user?.name || '');
                            }}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <FiEdit className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-gray-300 mt-2">
                      <div className="flex items-center space-x-2">
                        <FiMail className="h-4 w-4" />
                        <span>{session?.user?.email}</span>
                      </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 mt-2">
                  <div className="flex items-center space-x-2">
                    <FiMail className="h-4 w-4" />
                    <span>{session?.user?.email}</span>
                  </div>
                  {profile?.role && (
                    <div className="flex items-center space-x-2">
                      <FiBriefcase className="h-4 w-4" />
                      <span>{profile.role}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-6 py-3 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-white">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Company</label>
                <p className="text-white">{profile?.companyName || 'Not assigned'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400">Role</label>
                <p className="text-white">{profile?.role || 'Not assigned'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400">Seniority Level</label>
                <p className="text-white">
                  {profile?.seniorityLevel ? `Level ${profile.seniorityLevel}` : 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400">Joined</label>
                <p className="text-white">
                  {profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Check-in Calendar */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Check-in Calendar</h2>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-600 bg-gray-700/50 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ focusRingColor: COLORS.accent }}
              />
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Week day headers */}
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-400">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendar.map((day, index) => (
                <div key={index} className="aspect-square">
                  {day ? (
                    <div className={`
                      w-full h-full p-1 text-center text-sm border rounded text-white
                      ${day.isCurrentMonth ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-800/30 border-gray-700 text-gray-500'}
                      ${day.checkIn ? 'border-2' : 
                        day.isPastDay ? 'border-2' : 'border-gray-600'}
                      ${day.isToday ? 'ring-2' : ''}
                    `}
                    style={{
                      backgroundColor: day.checkIn ? `${COLORS.accent}20` : 
                                     day.isPastDay ? `${COLORS.secondary}20` : '',
                      borderColor: day.checkIn ? COLORS.accent : 
                                  day.isPastDay ? COLORS.secondary : '',
                      ringColor: day.isToday ? COLORS.violet : ''
                    }}>
                      <div className="font-medium">{day.day}</div>
                      {day.checkIn ? (
                        <FiCheck className="h-3 w-3 mx-auto mt-1" style={{ color: COLORS.accent }} />
                      ) : day.isPastDay ? (
                        <FiX className="h-3 w-3 mx-auto mt-1" style={{ color: COLORS.secondary }} />
                      ) : null}
                    </div>
                  ) : (
                    <div className="w-full h-full"></div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2 border"
                  style={{ 
                    backgroundColor: `${COLORS.accent}20`,
                    borderColor: COLORS.accent
                  }}
                ></div>
                <span className="text-gray-300">Present</span>
              </div>
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2 border"
                  style={{ 
                    backgroundColor: `${COLORS.secondary}20`,
                    borderColor: COLORS.secondary
                  }}
                ></div>
                <span className="text-gray-300">Absent</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-700/50 border border-gray-600 rounded mr-2"></div>
                <span className="text-gray-300">Future</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Check-ins */}
        {checkIns.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 mt-6 border border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Check-ins</h2>
            <div className="space-y-3">
              {checkIns.slice(0, 5).map((checkIn) => (
                <div key={checkIn._id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <FiCalendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">
                        {new Date(checkIn.date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <FiClock className="h-4 w-4 mr-1" />
                          {new Date(checkIn.checkInTime).toLocaleTimeString()}
                        </div>
                        {checkIn.location && (
                          <div className="flex items-center">
                            <FiMapPin className="h-4 w-4 mr-1" />
                            {checkIn.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    checkIn.status === 'present' ? 'border' :
                    checkIn.status === 'late' ? 'border' :
                    'border'
                  }`}
                  style={{
                    backgroundColor: checkIn.status === 'present' ? `${COLORS.accent}20` :
                                   checkIn.status === 'late' ? `${COLORS.violet}20` :
                                   `${COLORS.secondary}20`,
                    color: checkIn.status === 'present' ? COLORS.accent :
                          checkIn.status === 'late' ? COLORS.violet :
                          COLORS.secondary,
                    borderColor: checkIn.status === 'present' ? COLORS.accent :
                               checkIn.status === 'late' ? COLORS.violet :
                               COLORS.secondary
                  }}>
                    {checkIn.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};export default ProfilePage;
