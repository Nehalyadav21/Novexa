'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import DashboardNavbar from '@/components/DashboardNavbar';
import { COLORS } from '@/lib/theme';
import { Particles, Field } from '@/components/ui/ThemeComponents';
import { 
  FiPlus, 
  FiCalendar, 
  FiUser, 
  FiClock,
  FiCheckCircle,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiFilter,
  FiSearch
} from 'react-icons/fi';

const inter = Inter({ subsets: ['latin'] });

const TasksPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    deadline: ''
  });

  const [proofForm, setProofForm] = useState({
    description: '',
    file: null
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchTasks();
      fetchEmployees();
    }
  }, [session, status, filter]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      
      const response = await fetch(`/api/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/company/members');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskForm)
      });

      if (response.ok) {
        const data = await response.json();
        setTasks([data.task, ...tasks]);
        setShowCreateModal(false);
        setTaskForm({
          title: '',
          description: '',
          assignedTo: '',
          deadline: ''
        });
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleCompleteTask = async (e) => {
    e.preventDefault();
    
    try {
      const formData = {
        status: 'completed',
        proofDescription: proofForm.description,
        proofFileUrl: '', // Would need file upload implementation
        proofFileName: proofForm.file?.name || '',
        proofFileType: proofForm.file?.type || ''
      };

      const response = await fetch(`/api/tasks/${selectedTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(tasks.map(task => 
          task._id === selectedTask._id ? data.task : task
        ));
        setShowCompleteModal(false);
        setSelectedTask(null);
        setProofForm({ description: '', file: null });
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task._id !== taskId));
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-900/30 text-green-300 border-green-500/30';
      case 'in_progress': return 'bg-blue-900/30 text-blue-300 border-blue-500/30';
      case 'overdue': return 'bg-red-900/30 text-red-300 border-red-500/30';
      default: return 'bg-gray-800/50 text-gray-300 border-gray-600/50';
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#0d0d0f] ${inter.className}`}>
        <Particles />
        <DashboardNavbar user={session?.user} />
        <div className="pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{ borderColor: COLORS.accent }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0d0d0f] ${inter.className}`}>
      <Particles />
      <DashboardNavbar user={session?.user} />
      <div className="pt-20 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Tasks</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105 flex items-center"
            style={{
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
            }}
          >
            <FiPlus className="mr-2" />
            Create Task
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="h-5 w-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <FiSearch className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div key={task._id} className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-6 backdrop-blur-sm hover:border-orange-500/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                  {task.title}
                </h3>
                <div className="flex space-x-2">
                  {task.status === 'pending' && task.assignedTo._id === session?.user?.id && (
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowCompleteModal(true);
                      }}
                      className="text-green-400 hover:text-green-300 transition-colors"
                      title="Mark as completed"
                    >
                      <FiCheckCircle className="h-5 w-5" />
                    </button>
                  )}
                  {task.assignedBy._id === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete task"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-300 mb-4 line-clamp-3">{task.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-400">
                  <FiUser className="h-4 w-4 mr-2 text-orange-400" />
                  <span>Assigned to: <span className="text-gray-300">{task.assignedTo.name}</span></span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <FiCalendar className="h-4 w-4 mr-2 text-orange-400" />
                  <span>Deadline: <span className="text-gray-300">{new Date(task.deadline).toLocaleDateString()}</span></span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <FiClock className="h-4 w-4 mr-2 text-orange-400" />
                  <span>Created: <span className="text-gray-300">{new Date(task.createdAt).toLocaleDateString()}</span></span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 border rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {task.proof && (
                <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <h4 className="text-sm font-medium text-orange-400 mb-2">Proof of Work</h4>
                  <p className="text-sm text-gray-300">{task.proof.description}</p>
                  {task.proof.fileName && (
                    <div className="flex items-center mt-2 text-sm text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
                      <FiDownload className="h-4 w-4 mr-1" />
                      {task.proof.fileName}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No tasks found</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-6">
                <Field label="Title" htmlFor="title">
                  <input
                    type="text"
                    id="title"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter task title"
                  />
                </Field>

                <Field label="Description" htmlFor="description">
                  <textarea
                    id="description"
                    required
                    rows={3}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    placeholder="Describe the task"
                  />
                </Field>

                <Field label="Assign to" htmlFor="assignedTo">
                  <select
                    id="assignedTo"
                    required
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.user._id} value={employee.user._id}>
                        {employee.user.name} ({employee.role})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Deadline" htmlFor="deadline">
                  <input
                    type="datetime-local"
                    id="deadline"
                    required
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({...taskForm, deadline: e.target.value})}
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </Field>
              </div>

              <div className="flex space-x-4 mt-8">
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1d] border border-gray-700 rounded-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">Complete Task</h2>
            <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
              <p className="text-gray-300"><span className="text-orange-400 font-medium">Task:</span> {selectedTask.title}</p>
            </div>
            
            <form onSubmit={handleCompleteTask}>
              <div className="space-y-6">
                <Field label="Proof of Work Description *" htmlFor="proofDescription">
                  <textarea
                    id="proofDescription"
                    required
                    rows={4}
                    value={proofForm.description}
                    onChange={(e) => setProofForm({...proofForm, description: e.target.value})}
                    placeholder="Describe what you accomplished and how you completed the task..."
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                </Field>

                <Field label="Upload File (optional)" htmlFor="proofFile">
                  <input
                    type="file"
                    id="proofFile"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    onChange={(e) => setProofForm({...proofForm, file: e.target.files[0]})}
                    className="w-full rounded-xl bg-gray-800/50 px-4 py-3 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-500 file:text-white hover:file:bg-orange-600"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT
                  </p>
                </Field>
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedTask(null);
                    setProofForm({ description: '', file: null });
                  }}
                  className="flex-1 px-6 py-3 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-800/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105"
                  style={{
                    background: `linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.teal})`,
                  }}
                >
                  Mark as Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TasksPage;
