'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Particles } from '@/components/ui/ThemeComponents';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'] });

export default function CompanyInfoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const [selectedRoleForSeniority, setSelectedRoleForSeniority] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState(1);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const res = await fetch('/api/user/company');
        const data = await res.json();
        
        if (!data.company) {
          router.push('/join');
          return;
        }
        
        setCompanyData(data.company);
        setIsOwner(String(data.company.owner) === session?.user?.id);
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError('Failed to fetch company data');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchCompanyData();
    }
  }, [session, router]);

  const handleAddRole = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/companies/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyData._id,
          roleName: newRole.name,
          roleDescription: newRole.description,
          seniorityLevel: 1 // Default seniority level for new roles
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setCompanyData(data.company);
      setNewRole({ name: '', description: '' });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateMemberRole = async () => {
    if (!selectedMember || !selectedRole) return;

    try {
      const res = await fetch('/api/companies/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyData._id,
          memberId: selectedMember,
          newRole: selectedRole
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setCompanyData(data.company);
      setSelectedMember(null);
      setSelectedRole('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRemoveRole = async (roleId) => {
    try {
      const res = await fetch(`/api/companies/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyData._id
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setCompanyData(data.company);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await fetch(`/api/companies/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyData._id
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setCompanyData(data.company);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateSeniorityLevel = async () => {
    if (!selectedRoleForSeniority || !seniorityLevel) return;

    try {
      const res = await fetch('/api/companies/roles/seniority', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyData._id,
          roleId: selectedRoleForSeniority,
          seniorityLevel: Number(seniorityLevel)
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setCompanyData(data.company);
      setSelectedRoleForSeniority('');
      setSeniorityLevel(1);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    try {
      const res = await fetch('/api/company/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyData._id,
          newPassword
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setError(''); // Clear any previous errors
      // Show success message
      alert('Company password updated successfully!');
    } catch (error) {
      setPasswordError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
        <Particles />
        <DashboardNavbar user={session?.user} companyData={companyData} />
        <div className="pt-32 max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 shadow-glow"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className="relative z-10">
        <DashboardNavbar user={session?.user} companyData={companyData} />
        <div className="pt-32 max-w-7xl mx-auto px-4">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 text-red-400 rounded-xl border border-red-500/50 backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Company Details */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 mb-8 border border-gray-600">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl font-bold text-white">Company Information</h1>
              {!isOwner && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to leave this company?')) {
                    try {
                      const res = await fetch('/api/companies/leave', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.message);

                      // Sign out and back in to refresh the session
                      const { signOut } = await import('next-auth/react');
                      await signOut({ redirect: false });

                      // Redirect to login
                      router.push('/login');
                    } catch (error) {
                      setError(error.message);
                    }
                  }
                }}
                  className="px-4 py-2 bg-red-600/80 text-white rounded-xl hover:bg-red-600 hover:shadow-lg transition-all duration-300 backdrop-blur-sm"
                >
                  Leave Company
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Name</h2>
              <p className="text-gray-300">{companyData?.name}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Description</h2>
              <p className="text-gray-300">{companyData?.description}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Role</h2>
              <p className="text-gray-300">{isOwner ? 'Owner' : (companyData?.members?.find(m => 
                String(m.user._id || m.user) === session?.user?.id)?.role || 'Member')}</p>
            </div>
            {isOwner && (
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Company Password</h2>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-glow transition-all duration-300"
                  >
                    Set/Reset Password
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Set a password that new members need to enter when joining your company
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-glass-dark backdrop-blur-xl rounded-xl shadow-glow p-6 mb-8 border border-gray-700/30">
          <h2 className="text-xl font-bold text-white mb-6">Roles</h2>
          
          {/* Existing Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {companyData?.roles?.map((role) => (
              <div key={role._id} className="p-4 bg-gray-800/30 border border-gray-600/50 rounded-xl flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                <div>
                  <h3 className="font-semibold text-white">{role.name}</h3>
                  {role.description && (
                    <p className="text-sm text-gray-400">{role.description}</p>
                  )}
                  <p className="text-sm font-medium" style={{ color: COLORS.accent }}>
                    Seniority Level: {role.seniorityLevel || 10}
                    {role.name === 'Owner' && ' (Highest)'}
                  </p>
                </div>
                {isOwner && role.name !== 'Owner' && (
                  <button
                    onClick={() => handleRemoveRole(role._id)}
                    className="px-3 py-1 bg-red-600/80 text-white rounded-xl hover:bg-red-600 hover:shadow-glow transition-all duration-300 text-sm"
                  >
                    Remove Role
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Seniority Level Management */}
          {isOwner && (
            <div className="mb-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-4">Manage Seniority Levels</h3>
              <p className="text-sm text-gray-400 mb-4">
                Set seniority levels (1-10) to control task assignment permissions. Lower numbers mean higher seniority.
                Owner always has level 1 (highest).
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={selectedRoleForSeniority}
                  onChange={(e) => setSelectedRoleForSeniority(e.target.value)}
                  className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                >
                  <option value="">Select Role</option>
                  {companyData?.roles?.filter(role => role.name !== 'Owner').map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name} (Current: {role.seniorityLevel || 1})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={seniorityLevel}
                  onChange={(e) => setSeniorityLevel(e.target.value)}
                  placeholder="Level (1-9)"
                  className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors w-32"
                />
                <button
                  onClick={handleUpdateSeniorityLevel}
                  disabled={!selectedRoleForSeniority || !seniorityLevel}
                  className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Level
                </button>
              </div>
            </div>
          )}

          {/* Add New Role Form */}
          {isOwner && (
            <form onSubmit={handleAddRole} className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Add New Role</h3>
              <div>
                <input
                  type="text"
                  placeholder="Role Name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Role Description (optional)"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-glow transition-all duration-300"
              >
                Add Role
              </button>
            </form>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-glass-dark backdrop-blur-xl rounded-xl shadow-glow p-6 mb-8 border border-gray-700/30">
          <h2 className="text-xl font-bold text-white mb-6">Company Members</h2>
          <div className="space-y-4">
            {companyData?.members?.map((member) => {
              // Skip rendering if user data is not available
              if (!member?.user) return null;

              const memberId = member.user._id || member.user;
              const memberName = member.user.name || 'Unknown User';
              const memberEmail = member.user.email || 'No email';
              const memberRole = member.role || 'Member';
              const isOwnerMember = String(memberId) === String(companyData.owner);

              return (
                <div key={memberId} className="p-4 bg-gray-800/30 border border-gray-600/50 rounded-lg flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                  <div className="flex-1">
                    {isOwner ? (
                      <button
                        onClick={() => router.push(`/profile/${memberId}`)}
                        className="text-left w-full hover:text-orange-400 transition-colors"
                      >
                        <p className="font-semibold text-white hover:text-orange-400 transition-colors">{memberName}</p>
                        <p className="text-sm text-gray-400">{memberEmail}</p>
                        <p className="text-sm text-orange-400">Role: {memberRole}</p>
                      </button>
                    ) : (
                      <div>
                        <p className="font-semibold text-white">{memberName}</p>
                        <p className="text-sm text-gray-400">{memberEmail}</p>
                        <p className="text-sm text-orange-400">Role: {memberRole}</p>
                      </div>
                    )}
                  </div>
                  {isOwner && !isOwnerMember && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedMember === String(memberId) ? selectedRole : ''}
                        onChange={(e) => {
                          setSelectedMember(String(memberId));
                          setSelectedRole(e.target.value);
                        }}
                        className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      >
                        <option value="">Select Role</option>
                        {companyData.roles?.map((role, index) => (
                          <option key={index} value={role.name}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleUpdateMemberRole()}
                        className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-glow transition-all duration-300"
                        disabled={!selectedRole || selectedMember !== String(memberId)}
                      >
                        Update Role
                      </button>
                      <button
                        onClick={() => handleRemoveMember(memberId)}
                        className="px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 hover:shadow-glow transition-all duration-300"
                      >
                        Remove Member
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-glass-dark backdrop-blur-xl rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700/30 shadow-glow">
            <h2 className="text-xl font-bold mb-4 text-white">Set/Reset Company Password</h2>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <div className="text-sm text-gray-400">
                <p>• Password must be at least 6 characters long</p>
                <p>• This password will be required for new members to join your company</p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-glow transition-all duration-300"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}