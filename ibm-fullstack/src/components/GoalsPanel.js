'use client';

import { useState, useEffect } from 'react';

export default function GoalsPanel({ chatId, isOpen, onClose }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && chatId) {
      fetchGoals();
    }
  }, [isOpen, chatId]);

  const fetchGoals = async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/goals`);
      const data = await res.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/chats/${chatId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newGoal })
      });

      if (res.ok) {
        const goal = await res.json();
        setGoals(prev => [...prev, goal]);
        setNewGoal('');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProgress = async (goalId, progress) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      });

      if (res.ok) {
        const updatedGoal = await res.json();
        setGoals(prev => 
          prev.map(goal => 
            goal._id === goalId ? updatedGoal : goal
          )
        );
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/goals/${goalId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setGoals(prev => prev.filter(goal => goal._id !== goalId));
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-[#2B2B2B] rounded-lg w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#404040]">
          <h2 className="text-lg font-semibold text-white">Chat Goals</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#404040] rounded"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* New Goal Form */}
        <div className="p-4 border-b border-[#404040]">
          <form onSubmit={handleCreateGoal}>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a new goal..."
                className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#404040] rounded focus:outline-none focus:ring-1 focus:ring-[#404040]"
              />
              <button
                type="submit"
                disabled={!newGoal.trim() || isLoading}
                className="px-4 py-2 bg-[#404040] hover:bg-[#505050] rounded disabled:opacity-50"
              >
                {isLoading ? '...' : 'Add'}
              </button>
            </div>
          </form>
        </div>

        {/* Goals List */}
        <div className="flex-1 overflow-y-auto p-4">
          {goals.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No goals yet. Add one above!
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal._id} className="bg-[#1a1a1a] rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white">{goal.title}</h3>
                    <button
                      onClick={() => handleDeleteGoal(goal._id)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete Goal"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-[#404040] rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-1">
                    {[0, 25, 50, 75, 100].map((progress) => (
                      <button
                        key={progress}
                        onClick={() => handleUpdateProgress(goal._id, progress)}
                        className={`flex-1 py-1 px-2 text-xs rounded ${
                          goal.progress === progress
                            ? 'bg-green-600 text-white'
                            : 'bg-[#404040] hover:bg-[#505050] text-gray-300'
                        }`}
                      >
                        {progress}%
                      </button>
                    ))}
                  </div>

                  {goal.status === 'completed' && (
                    <div className="mt-2 text-green-400 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      Completed!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
