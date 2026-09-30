'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles, Field } from '@/components/ui/ThemeComponents';
import DashboardNavbar from '@/components/DashboardNavbar';

const inter = Inter({ subsets: ['latin'] });

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    selectedMembers: []
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [teamsRes, invitesRes, membersRes, companyRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/teams/invites'),
        fetch('/api/company/members'),
        fetch('/api/company')
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        // Extract the members array from the response
        setCompanyMembers(membersData.members || []);
      }

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompanyData(companyData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewTeam({ name: '', description: '', selectedMembers: [] });
        setMemberSearch('');
        fetchData();
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  // Filter members based on search
  const filteredMembers = companyMembers
    .filter(member => member.user && member.user._id !== session?.user?.id)
    .filter(member => {
      if (!memberSearch) return true;
      const searchLower = memberSearch.toLowerCase();
      return (
        member.user.name.toLowerCase().includes(searchLower) ||
        member.user.email.toLowerCase().includes(searchLower) ||
        member.role.toLowerCase().includes(searchLower)
      );
    });

  const handleInviteResponse = async (inviteId, action) => {
    try {
      const response = await fetch(`/api/teams/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error responding to invite:', error);
    }
  };

  const handleViewDetails = (team) => {
    setSelectedTeam(team);
    setShowDetailsModal(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone and will also delete the team chat.')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowDetailsModal(false);
        fetchData(); // Refresh the teams list
        alert('Team deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete team');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  const handleTeamChat = async (team) => {
    // Navigate to chats page with team chat ID as query parameter
    if (team.chat) {
      router.push(`/chats?teamChat=${team.chat}`);
    } else {
      // If no chat exists, just go to chats page
      router.push('/chats');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="text-center relative z-10">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: COLORS.accent }}
          ></div>
          <p className="mt-4 text-gray-300">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className={`${inter.className} relative z-10`}>
        <DashboardNavbar user={session.user} companyData={companyData} />
        
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pt-24">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105 hover:shadow-glow"
              style={{
                background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
              }}
            >
              Create Team
            </button>
          </div>

          {/* Team Invites */}
          {invites.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Team Invitations</h2>
              <div className="grid gap-4">
                {invites.map((invite) => (
                  <div key={invite._id} className="bg-[#1a1a1d] border border-yellow-500/30 rounded-xl p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{invite.teamName}</h3>
                        <p className="text-gray-300">Invited by {invite.teamLead?.name}</p>
                        <p className="text-sm text-gray-400">
                          Invited on {new Date(invite.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleInviteResponse(invite._id, 'accept')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleInviteResponse(invite._id, 'reject')}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams Grid */}
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team._id} className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-6 hover:border-orange-500 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                    {team.teamLead._id === session.user.id && (
                      <span className="bg-gradient-to-r from-orange-500 to-pink-600 text-white text-xs px-3 py-1 rounded-full">
                        Team Lead
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-300 mb-4">{team.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Members ({team.members.length + 1})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <span 
                        className="text-white text-xs px-3 py-1 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.secondary})`,
                        }}
                      >
                        {team.teamLead.name} (Lead)
                      </span>
                      {team.members.map((member) => (
                        <span
                          key={member.user._id}
                          className="bg-gray-700 text-gray-200 text-xs px-3 py-1 rounded-full"
                        >
                          {member.user.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleViewDetails(team)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:shadow-glow text-sm transition-all duration-300"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => handleTeamChat(team)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white px-3 py-2 rounded-lg hover:shadow-glow text-sm transition-all duration-300"
                    >
                      Team Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No teams found</div>
              <p className="text-gray-500 mt-2">Create your first team to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 px-8 py-4 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105 hover:shadow-glow"
                style={{
                  background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                }}
              >
                Create Your First Team
              </button>
            </div>
          )}
        </div>

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-8 w-full max-w-md mx-4">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Team</h2>
              
              <form onSubmit={handleCreateTeam} className="space-y-6">
                <Field label="Team Name" htmlFor="teamName">
                  <input
                    type="text"
                    id="teamName"
                    required
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Enter team name"
                    className="w-full rounded-md bg-gray-800/50 px-4 py-3 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </Field>

                <Field label="Description" htmlFor="description">
                  <textarea
                    id="description"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="Describe your team's purpose"
                    className="w-full rounded-md bg-gray-800/50 px-4 py-3 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    rows="3"
                  />
                </Field>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Select Members to Invite
                  </label>
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search members by name, email, or role..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto bg-gray-800/30 border border-gray-700 rounded-xl p-3">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <div key={member.user._id} className="flex items-center mb-3 p-3 hover:bg-gray-700/50 rounded-lg transition-all">
                          <input
                            type="checkbox"
                            id={member.user._id}
                            checked={newTeam.selectedMembers.includes(member.user._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTeam({
                                  ...newTeam,
                                  selectedMembers: [...newTeam.selectedMembers, member.user._id]
                                });
                              } else {
                                setNewTeam({
                                  ...newTeam,
                                  selectedMembers: newTeam.selectedMembers.filter(id => id !== member.user._id)
                                });
                              }
                            }}
                            className="mr-4 w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <label htmlFor={member.user._id} className="text-sm text-white font-medium cursor-pointer">
                              {member.user.name}
                            </label>
                            <div className="text-xs text-gray-400">
                              {member.user.email} • {member.role}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 text-center py-6">
                        {memberSearch ? 'No members found matching your search' : 'No other members available to invite'}
                      </div>
                    )}
                  </div>

                  {/* Selected Members Summary */}
                  {newTeam.selectedMembers.length > 0 && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-orange-900/20 to-pink-900/20 border border-orange-500/30 rounded-lg">
                      <div className="text-sm text-orange-300 font-medium">
                        Selected: {newTeam.selectedMembers.length} member(s)
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-800/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105"
                    style={{
                      background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                    }}
                  >
                    Create Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {showDetailsModal && selectedTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedTeam.name}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-orange-400 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Team Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Team Information</h3>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-300 mb-3"><strong className="text-orange-400">Description:</strong> {selectedTeam.description || 'No description provided'}</p>
                  <p className="text-gray-300 mb-3"><strong className="text-orange-400">Created:</strong> {new Date(selectedTeam.createdAt).toLocaleDateString()}</p>
                  <p className="text-gray-300"><strong className="text-orange-400">Total Members:</strong> {selectedTeam.members.length + 1}</p>
                </div>
              </div>

              {/* Team Lead */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Team Lead</h3>
                <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{selectedTeam.teamLead.name}</h4>
                      <p className="text-gray-300 text-sm">{selectedTeam.teamLead.email}</p>
                    </div>
                    <span 
                      className="text-white text-xs px-4 py-2 rounded-full font-medium"
                      style={{
                        background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.secondary})`,
                      }}
                    >
                      Team Lead
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Team Members ({selectedTeam.members.length})</h3>
                {selectedTeam.members.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTeam.members.map((member) => (
                      <div key={member.user._id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">{member.user.name}</h4>
                            <p className="text-gray-300 text-sm">{member.user.email}</p>
                            <p className="text-gray-400 text-xs">
                              Joined: {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="bg-gray-700 text-gray-200 text-xs px-3 py-1 rounded-full">
                            Member
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No team members yet. Invitations may still be pending.</p>
                  </div>
                )}
              </div>

              {/* Pending Invites */}
              {selectedTeam.invites && selectedTeam.invites.filter(invite => invite.status === 'pending').length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Pending Invitations ({selectedTeam.invites.filter(invite => invite.status === 'pending').length})
                  </h3>
                  <div className="space-y-3">
                    {selectedTeam.invites
                      .filter(invite => invite.status === 'pending')
                      .map((invite) => (
                        <div key={invite._id} className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-yellow-300">Invitation sent</p>
                              <p className="text-yellow-400 text-sm">
                                Invited on: {new Date(invite.invitedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="bg-yellow-600 text-white text-xs px-3 py-1 rounded-full">
                              Pending
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={() => handleTeamChat(selectedTeam)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-xl hover:shadow-glow transition-all duration-300"
                >
                  Open Team Chat
                </button>
                {selectedTeam.teamLead._id === session.user.id && (
                  <button
                    onClick={() => handleDeleteTeam(selectedTeam._id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition-all duration-300"
                  >
                    Delete Team
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
