'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { COLORS } from '@/lib/theme';
import { 
  FiCheck, 
  FiClock
} from 'react-icons/fi';

const CheckInWidget = () => {
  const { data: session } = useSession();
  const [todayCheckIn, setTodayCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkInForm, setCheckInForm] = useState({
    captcha: '',
    captchaQuestion: '',
    captchaAnswer: ''
  });

  const generateCaptcha = useCallback(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    let question;
    
    switch (operation) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;
      case '-':
        answer = num1 - num2;
        question = `${num1} - ${num2}`;
        break;
      case '*':
        answer = num1 * num2;
        question = `${num1} × ${num2}`;
        break;
      default:
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
    }
    
    setCheckInForm(prev => ({
      ...prev,
      captchaQuestion: question,
      captchaAnswer: answer.toString(),
      captcha: ''
    }));
  }, []);

  const checkOwnerStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/company');
      if (response.ok) {
        const companyData = await response.json();
        const userIsOwner = companyData.owner && companyData.owner._id === session?.user?.id;
        setIsOwner(userIsOwner);
      }
    } catch (error) {
      console.error('Error checking owner status:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) {
      checkTodayCheckIn();
      checkOwnerStatus();
    }
  }, [session, checkOwnerStatus]);

  // Generate CAPTCHA when modal opens
  useEffect(() => {
    if (showCheckInModal) {
      generateCaptcha();
    }
  }, [showCheckInModal, generateCaptcha]);

  // Auto-refresh when window gains focus to sync check-in status
  useEffect(() => {
    const handleFocus = () => {
      if (session) {
        checkTodayCheckIn();
        checkOwnerStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session, checkOwnerStatus]);

  const checkTodayCheckIn = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().substring(0, 7); // YYYY-MM format
      const response = await fetch(`/api/checkins?month=${today}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Get today's date in YYYY-MM-DD format (local timezone)
        const todayDate = new Date();
        const todayDateString = todayDate.getFullYear() + '-' + 
                              String(todayDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(todayDate.getDate()).padStart(2, '0');
        
        const todayCheckInRecord = data.checkIns.find(ci => {
          // Convert the check-in date to YYYY-MM-DD format for comparison
          const checkInDate = new Date(ci.date);
          const checkInDateString = checkInDate.getFullYear() + '-' + 
                                   String(checkInDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                   String(checkInDate.getDate()).padStart(2, '0');
          
          return checkInDateString === todayDateString;
        });
        
        setTodayCheckIn(todayCheckInRecord || null);
      } else {
        console.error('Failed to fetch check-ins:', await response.text());
      }
    } catch (error) {
      console.error('Error checking today\'s check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    
    // Validate CAPTCHA
    if (checkInForm.captcha !== checkInForm.captchaAnswer) {
      alert('Incorrect CAPTCHA answer. Please try again.');
      generateCaptcha();
      return;
    }
    
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captchaVerified: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTodayCheckIn(data.checkIn);
        setShowCheckInModal(false);
        setCheckInForm({ captcha: '', captchaQuestion: '', captchaAnswer: '' });
        // Immediately update the widget state
        await checkTodayCheckIn();
      } else {
        console.error('Check-in failed:', data);
        
        // Handle specific error cases
        if (data.error === 'Already checked in today' && data.checkIn) {
          // User already checked in, update the state to show check-in status
          setTodayCheckIn(data.checkIn);
          setShowCheckInModal(false);
          setCheckInForm({ captcha: '', captchaQuestion: '', captchaAnswer: '' });
          await checkTodayCheckIn();
        } else {
          // For any other error, show the error message
          alert(data.error || 'Failed to check in');
        }
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-6 hover:border-orange-500 transition-all">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-6 hover:border-orange-500 transition-all transform hover:scale-105">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Daily Check-in</h3>
          <FiClock className="h-5 w-5 text-orange-400" />
        </div>

        {todayCheckIn ? (
          <div className="text-center">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: `${COLORS.emerald}20` }}
            >
              <FiCheck className="h-8 w-8" style={{ color: COLORS.emerald }} />
            </div>
            <p className="text-green-400 font-medium mb-2">Checked in for today!</p>
            <p className="text-sm text-gray-300">
              {new Date(todayCheckIn.checkInTime).toLocaleTimeString()}
            </p>
          </div>
        ) : isOwner ? (
          <div className="text-center">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: `${COLORS.violet}20` }}
            >
              <svg className="h-8 w-8" style={{ color: COLORS.violet }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
              </svg>
            </div>
            <p className="text-purple-400 font-medium mb-2">Company Owner</p>
            <p className="text-gray-400 text-sm">As the company owner, you don&apos;t need to check in daily. You can view your team&apos;s check-ins from the company dashboard.</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800/50 rounded-full mb-4">
              <FiClock className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-300 mb-4">You haven&apos;t checked in today</p>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="w-full text-white py-2 px-4 rounded-xl hover:opacity-90 transition-all"
              style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
            >
              Check In Now
            </button>
          </div>
        )}
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Daily Check-in</h2>
            <form onSubmit={handleCheckIn}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Security Verification
                  </label>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                    <div className="text-center">
                      <p className="text-white text-lg font-mono mb-2">
                        What is {checkInForm.captchaQuestion}?
                      </p>
                      <p className="text-xs text-gray-400">
                        Please solve this simple math problem to verify you&apos;re human
                      </p>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={checkInForm.captcha}
                    onChange={(e) => setCheckInForm({...checkInForm, captcha: e.target.value})}
                    placeholder="Enter your answer"
                    required
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="mt-2 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Generate new question
                  </button>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-800/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105"
                  style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                >
                  Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckInWidget;
