import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function CreateMeetingModal({ isOpen, onClose, onMeetingCreated }) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    password: '',
    participants: [],
    settings: {
      audioEnabled: true,
      videoEnabled: true,
      transcriptionEnabled: true,
      recordingEnabled: false
    }
  });
  const [participantEmail, setParticipantEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Load users for participant selection
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      // No need to set scheduled time since meetings start immediately
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        password: '',
        participants: []
      }));
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in users property
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSettingChange = (setting) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: !prev.settings[setting]
      }
    }));
  };

  const addParticipant = (user) => {
    if (!formData.participants.find(p => p.userId === user._id)) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          userId: user._id,
          userName: user.name,
          email: user.email
        }]
      }));
    }
  };

  const removeParticipant = (userId) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.userId !== userId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      alert('Please enter a meeting title');
      return;
    }

    setLoading(true);

    try {
      // Create meeting data with immediate start time
      const meetingData = {
        ...formData,
        scheduledAt: new Date().toISOString(), // Start immediately
        status: 'started' // Set status to started immediately
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      if (response.ok) {
        const data = await response.json();
        onMeetingCreated(data.meeting);
        handleClose();
      } else {
        const error = await response.json();
        alert(`Failed to create meeting: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      scheduledAt: '',
      password: '',
      participants: [],
      settings: {
        audioEnabled: true,
        videoEnabled: true,
        transcriptionEnabled: true,
        recordingEnabled: false
      }
    });
    setParticipantEmail('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create New Meeting</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meeting Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter meeting title"
              className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Meeting description (optional)"
              rows="3"
              className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meeting Password
            </label>
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password (optional)"
              className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty for no password protection
            </p>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Participants
            </label>
            
            {/* User Selection */}
            <div className="mb-4">
              <select
                value=""
                onChange={(e) => {
                  const user = users.find(u => u._id === e.target.value);
                  if (user) addParticipant(user);
                }}
                className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a user to invite</option>
                {users
                  .filter(user => 
                    user._id !== session?.user?.id && 
                    !formData.participants.find(p => p.userId === user._id)
                  )
                  .map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected Participants */}
            {formData.participants.length > 0 && (
              <div className="space-y-2">
                {formData.participants.map(participant => (
                  <div
                    key={participant.userId}
                    className="flex items-center justify-between bg-[#2a2a2a] rounded-lg p-3"
                  >
                    <div>
                      <div className="text-white font-medium">{participant.userName}</div>
                      <div className="text-gray-400 text-sm">{participant.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant.userId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meeting Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Meeting Settings
            </label>
            <div className="space-y-3">
              {[
                { key: 'audioEnabled', label: 'Enable Audio by Default', icon: '🎤' },
                { key: 'videoEnabled', label: 'Enable Video by Default', icon: '📹' },
                { key: 'transcriptionEnabled', label: 'Enable Live Transcription', icon: '📝' },
                { key: 'recordingEnabled', label: 'Enable Meeting Recording', icon: '🎬' }
              ].map(setting => (
                <label key={setting.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings[setting.key]}
                    onChange={() => handleSettingChange(setting.key)}
                    className="w-4 h-4 text-blue-600 bg-[#2a2a2a] border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    {setting.icon} {setting.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Starting meeting...
                </div>
              ) : (
                'Start Meeting Now'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
