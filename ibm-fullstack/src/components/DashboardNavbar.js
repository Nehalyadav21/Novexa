'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';
import { COLORS } from '@/lib/theme';
import Image from 'next/image';
import { SocketManager } from '@/lib/socket-manager';

export default function DashboardNavbar({ user, companyData }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(companyData || null);

  // Fetch notifications and company data
  useEffect(() => {
    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    const fetchCompanyData = async () => {
      if (!companyInfo) {
        try {
          const response = await fetch('/api/company');
          if (response.ok) {
            const data = await response.json();
            setCompanyInfo(data);
          }
        } catch (error) {
          console.error('Error fetching company data:', error);
        }
      }
    };

    let socketManager = null;

    if (session) {
      fetchNotifications();
      fetchCompanyData();
      
      // Set up socket connection for real-time notifications
      socketManager = new SocketManager();
      socketManager.connect();
      
      // Join user-specific room for notifications
      socketManager.emit('join-user-room', session.user.id);
      
      // Listen for task notifications
      socketManager.on('taskNotification', (data) => {
        console.log('📬 Received real-time task notification:', data);
        // Add the notification to the local state
        const newNotification = {
          _id: `temp-${Date.now()}`,
          type: data.type,
          title: data.title,
          message: data.message,
          read: false,
          createdAt: new Date(),
          data: {
            taskId: data.taskId,
            meetingId: data.meetingId
          }
        };
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.message,
            icon: '/novexa.svg'
          });
        }
      });
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      
      return () => {
        clearInterval(interval);
        if (socketManager) {
          socketManager.disconnect();
        }
      };
    }
  }, [session, companyInfo]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <nav className="fixed w-full bg-[#0d0d0f]/95 backdrop-blur-md border-b border-gray-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Image
                src="/novexa2.png"
                alt="Novexa"
                width={32}
                height={32}
                className="object-contain"
              />
              <span 
                className="text-xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                }}
              >
                Novexa
              </span>
            </Link>
          </div>

          {/* Middle: Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Navigation Links */}
            <div className="flex items-baseline space-x-4">
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/meeting"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Meeting
              </Link>
              <Link
                href="/meetings"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                History
              </Link>
              <Link
                href="/tasks"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Tasks
              </Link>
              <Link
                href="/teams"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Teams
              </Link>
              <Link
                href="/chats"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Chats
              </Link>
              <Link
                href="/company-info"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Company
              </Link>
            </div>
          </div>

          {/* Mobile Navigation Toggle - for future implementation */}
          <div className="md:hidden">
            {/* Mobile menu button can be added here if needed */}
          </div>

          {/* Right: Notifications + Avatar */}
          <div className="flex items-center space-x-4">
            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-300 hover:text-white transition-colors relative"
              >
                {unreadCount > 0 ? (
                  <BellSolid className="h-6 w-6" style={{ color: COLORS.accent }} />
                ) : (
                  <BellIcon className="h-6 w-6" />
                )}
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    style={{ backgroundColor: COLORS.secondary }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1a1a1d] border border-gray-700 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs hover:text-white transition-colors"
                          style={{ color: COLORS.accent }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            className={`px-4 py-3 text-sm border-b border-gray-700 ${
                              !notification.read ? 'bg-gray-800/50' : ''
                            }`}
                          >
                            <div className="font-medium text-white">
                              {notification.title}
                            </div>
                            <div className="text-gray-300 mt-1">
                              {notification.message}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </div>
                            
                            {/* Meeting Invite Actions */}
                            {(notification.type === 'meeting_invite' || notification.type === 'meeting_invite_live') && notification.data?.meetingRoomId && (
                              <div className="mt-2 flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/meeting/${notification.data.meetingRoomId}`, '_blank');
                                    if (!notification.read) {
                                      markNotificationAsRead(notification._id);
                                    }
                                  }}
                                  className="text-white px-3 py-1 rounded text-xs hover:opacity-90 transition-all"
                                  style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                                >
                                  Join Meeting
                                </button>
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationAsRead(notification._id);
                                    }}
                                    className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-500 transition-colors"
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Other notification types */}
                            {notification.type !== 'meeting_invite' && notification.type !== 'meeting_invite_live' && (
                              <div
                                className="cursor-pointer"
                                onClick={() => {
                                  if (!notification.read) {
                                    markNotificationAsRead(notification._id);
                                  }
                                  if (notification.actionUrl) {
                                    window.location.href = notification.actionUrl;
                                  }
                                }}
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <Link href="/profile" className="flex-shrink-0">
              <div className="flex items-center hover:bg-gray-800/50 rounded-lg p-2 transition-colors">
                {session?.user?.profilePicture ? (
                  <Image
                    src={session.user.profilePicture}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover border-2 border-gray-600"
                  />
                ) : (
                  <div 
                    className="rounded-full p-2 h-8 w-8 flex items-center justify-center"
                    style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                  >
                    <span className="text-white text-sm font-medium">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Close notifications dropdown when clicking outside */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </nav>
  );
}
