'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { NovexaLogo, Particles, Field } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

export default function JoinPage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('create');
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [joinCompanyName, setJoinCompanyName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user already has a company
  useEffect(() => {
    const checkCompany = async () => {
      try {
        console.log('Session status:', status);
        console.log('Update function available:', !!update);
        
        // First try to refresh the user data
        const refreshRes = await fetch('/api/auth/refresh');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          console.log('Refresh data:', refreshData);
          if (refreshData.user?.company) {
            console.log('Found company in refresh data:', refreshData.user.company);
            // Try to update the session
            if (update) {
              try {
                console.log('Attempting to update session...');
                await update({
                  company: refreshData.user.company
                });
                console.log('Session update successful');
              } catch (error) {
                console.error('Session update failed:', error);
                // Force a page reload to refresh the session
                window.location.href = '/dashboard';
                return;
              }
            } else {
              console.log('Update function not available, forcing page reload');
              // Force a page reload to refresh the session
              window.location.href = '/dashboard';
              return;
            }
            router.push('/dashboard');
            return;
          }
        }

        // Fallback to the original check
        const res = await fetch('/api/user/company');
        
        // Check if response is actually JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Non-JSON response from /api/user/company:', text);
          return;
        }
        
        const data = await res.json();
        console.log('User company data:', data);
        if (data.company) {
          // Try to update the session
          if (update) {
            try {
              console.log('Updating session with company:', data.company._id);
              await update({
                company: data.company._id
              });
            } catch (error) {
              console.error('Session update failed:', error);
              // Force a page reload to refresh the session
              window.location.href = '/dashboard';
              return;
            }
          } else {
            console.log('Update function not available, forcing page reload');
            // Force a page reload to refresh the session
            window.location.href = '/dashboard';
            return;
          }
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking company:', error);
      }
    };

    if (session && status === 'authenticated') {
      checkCompany();
    }
  }, [session, router, update, status]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate input
      const trimmedName = companyName.trim();
      const trimmedDescription = companyDescription.trim();
      const trimmedPassword = companyPassword.trim();

      if (!trimmedName) {
        throw new Error('Company name is required');
      }
      if (!trimmedDescription) {
        throw new Error('Company description is required');
      }
      if (!trimmedPassword) {
        throw new Error('Company password is required');
      }

      // Debug log to check the values being sent
      console.log('Creating company with:', { 
        name: trimmedName, 
        description: trimmedDescription 
      });

      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: trimmedName, 
          description: trimmedDescription,
          password: trimmedPassword
        }),
      });

      const data = await res.json();
      console.log('Server response:', data);

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create company');
      }

      // Update the session with the new company information
      if (update) {
        try {
          await update({
            company: data.company._id
          });
          // Small delay to ensure session is updated
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } catch (error) {
          console.error('Session update failed:', error);
          // Fallback: Force a page reload to refresh the session
          window.location.href = '/dashboard';
        }
      } else {
        // Fallback: Force a page reload to refresh the session
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error creating company:', error);
      setError(error.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    setError('');
    setLoading(true);

    try {
      const trimmedCompanyName = joinCompanyName.trim();
      const trimmedPassword = joinPassword.trim();

      if (!trimmedCompanyName) {
        throw new Error('Company name is required');
      }
      if (!trimmedPassword) {
        throw new Error('Password is required');
      }

      console.log('Attempting to join company:', trimmedCompanyName);

      const res = await fetch('/api/company/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: trimmedCompanyName,
          password: trimmedPassword
        }),
      });

      const data = await res.json();
      console.log('Server response:', data);

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to join company');
      }

      // Update the session with the new company information
      if (update) {
        try {
          await update({
            company: data.company._id
          });
        } catch (error) {
          console.error('Session update failed:', error);
        }
      }

      // Show success message and redirect
      setError('Successfully joined company. Redirecting...');
      
      // Add a small delay to show the success message and ensure session is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to dashboard using page reload to ensure fresh session
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error joining company:', error);
      setError(error.message || 'Failed to join company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d0d0f] flex items-center justify-center overflow-hidden">
      <Particles />
      <div
        className={`${inter.className} min-h-screen px-6 pt-24 pb-16 relative z-10`}
        style={{ backgroundColor: COLORS.background }}
      >
        <main className="flex justify-center items-start">
          <div className="w-full max-w-2xl">
            <div className="mb-6 text-center">
              <NovexaLogo />
              <p className="mt-2 text-base text-gray-400">
                Join or create your company workspace
              </p>
            </div>

            <div
              className="rounded-xl border p-6 md:p-8 relative z-20"
              style={{
                backgroundColor: "#141417",
                borderColor: COLORS.border,
              }}
            >
              {/* Tab Navigation */}
              <div className="mb-8">
                <div className="flex border-b border-gray-700">
                  <button
                    className={`py-3 px-6 font-medium transition-all duration-300 ${
                      activeTab === 'create'
                        ? 'border-b-2 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    style={{
                      borderBottomColor: activeTab === 'create' ? COLORS.accent : 'transparent'
                    }}
                    onClick={() => setActiveTab('create')}
                  >
                    Create Company
                  </button>
                  <button
                    className={`py-3 px-6 font-medium transition-all duration-300 ${
                      activeTab === 'join'
                        ? 'border-b-2 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    style={{
                      borderBottomColor: activeTab === 'join' ? COLORS.accent : 'transparent'
                    }}
                    onClick={() => setActiveTab('join')}
                  >
                    Join Company
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-md border px-4 py-3 text-sm border-red-600 bg-red-950 text-red-400">
                  {error}
                </div>
              )}

              {activeTab === 'create' ? (
                <div>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-semibold text-white">
                      Create Your Company
                    </h2>
                    <p className="mt-2 text-gray-400 text-sm">
                      Set up your workspace and invite your team
                    </p>
                  </div>

                  <form onSubmit={handleCreateCompany} className="space-y-6">
                    <Field label="Company Name" htmlFor="companyName">
                      <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your Company Name"
                        className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </Field>

                    <Field label="Company Description" htmlFor="companyDescription">
                      <textarea
                        id="companyDescription"
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        placeholder="Describe what your company does..."
                        className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none h-32"
                        required
                      />
                    </Field>

                    <Field label="Company Password" htmlFor="companyPassword">
                      <input
                        type="password"
                        id="companyPassword"
                        value={companyPassword}
                        onChange={(e) => setCompanyPassword(e.target.value)}
                        placeholder="Set a secure password"
                        className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        Team members will need this password to join your company
                      </p>
                    </Field>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-md px-5 py-3 font-medium text-white transition disabled:opacity-60 hover:opacity-90 cursor-pointer"
                      style={{
                        background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                      }}
                    >
                      {loading ? 'Creating Company...' : 'Create Company'}
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-semibold text-white">
                      Join a Company
                    </h2>
                    <p className="mt-2 text-gray-400 text-sm">
                      Enter your company details to join the workspace
                    </p>
                  </div>

                  <div className="space-y-6">
                    <Field label="Company Name" htmlFor="joinCompanyName">
                      <input
                        type="text"
                        id="joinCompanyName"
                        value={joinCompanyName}
                        onChange={(e) => setJoinCompanyName(e.target.value)}
                        placeholder="Enter the company name"
                        className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </Field>

                    <Field label="Company Password" htmlFor="joinPassword">
                      <input
                        type="password"
                        id="joinPassword"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        placeholder="Enter the company password"
                        className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </Field>

                    <button
                      onClick={handleJoinCompany}
                      disabled={loading}
                      className="w-full rounded-md px-5 py-3 font-medium text-white transition disabled:opacity-60 hover:opacity-90 cursor-pointer"
                      style={{
                        background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.violet})`,
                      }}
                    >
                      {loading ? 'Joining Company...' : 'Join Company'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  Already have a workspace?{" "}
                  <Link
                    href="/login"
                    style={{ color: COLORS.secondary }}
                    className="underline underline-offset-4 hover:text-white"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Link
                href="/"
                className="px-5 py-2 text-sm font-medium text-white border border-gray-700 rounded-full hover:bg-[#1a1a1d]"
              >
                ← Get Started
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
