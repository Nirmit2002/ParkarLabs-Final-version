// pages/admin/courses/[courseId]/modules/[moduleId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Toast from '../../../../../components/Toast';
import {
  CheckSquare,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Users,
  UserPlus
} from 'lucide-react';

export default function ModuleTasksPage() {
  const router = useRouter();
  const { courseId, moduleId } = router.query;
  const [module, setModule] = useState(null);
  const [courseTit, setCourseTitle] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: ''
  });
  const [editTask, setEditTask] = useState({
    id: null,
    title: '',
    description: ''
  });
  const [assignTask, setAssignTask] = useState({
    id: null,
    title: ''
  });
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState(null);
  const [taskAssignedUsers, setTaskAssignedUsers] = useState({});
  const [selectedUnassignUsers, setSelectedUnassignUsers] = useState([]);
  const [courseAssignedUsers, setCourseAssignedUsers] = useState([]);
  const [moduleAssignedUsers, setModuleAssignedUsers] = useState([]);

  useEffect(() => {
    if (courseId && moduleId) {
      checkAuth();
      fetchModuleAndTasks();
      fetchUsers();
    }
  }, [courseId, moduleId]);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      router.push('/auth/login');
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== 'admin' && userData.role !== 'manager') {
      router.push('/user/dashboard');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUsers(response.data.data.filter(u => u.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchModuleAndTasks = async () => {
    try {
      const token = localStorage.getItem('token');

      // Get module info
      const courseResponse = await axios.get(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (courseResponse.data.success) {
        setCourseTitle(courseResponse.data.data.title);
        const mod = courseResponse.data.data.modules.find(m => m.id == moduleId);
        if (mod) {
          setModule(mod);
        }
      }

      // Get tasks for this module
      const tasksResponse = await axios.get(`/api/tasks/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (tasksResponse.data.success) {
        setTasks(tasksResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch module:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/tasks/modules/${moduleId}`, newTask, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setNewTask({ title: '', description: '' });
        fetchModuleAndTasks();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const handleEditTask = (task) => {
    setEditTask({
      id: task.id,
      title: task.title,
      description: task.description
    });
    setShowEditModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/tasks/${editTask.id}`,
        {
          title: editTask.title,
          description: editTask.description
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShowEditModal(false);
        fetchModuleAndTasks();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!confirm(`Are you sure you want to delete "${taskTitle}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchModuleAndTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAssignClick = async (task) => {
    setAssignTask({ id: task.id, title: task.title });
    setSelectedUsers([]);
    setSelectedUnassignUsers([]);
    setDueDate('');
    setShowAssignModal(true);

    // Fetch course, module, and task assigned users
    try {
      const token = localStorage.getItem('token');

      // Fetch course-level assignments
      const courseResponse = await axios.get(`/api/courses/${courseId}/assigned-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (courseResponse.data.success) {
        setCourseAssignedUsers(courseResponse.data.data);
      }

      // Fetch module-level assignments
      const moduleResponse = await axios.get(`/api/courses/${courseId}/modules/${moduleId}/assigned-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (moduleResponse.data.success) {
        setModuleAssignedUsers(moduleResponse.data.data);
      }

      // Fetch task-level assignments
      const taskResponse = await axios.get(`/api/tasks/${task.id}/assigned-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (taskResponse.data.success) {
        setTaskAssignedUsers({ ...taskAssignedUsers, [task.id]: taskResponse.data.data });
      }
    } catch (error) {
      console.error('Failed to fetch assigned users:', error);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      setToast({ message: 'Please select at least one user', type: 'error' });
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        userIds: selectedUsers
      };

      // Only add dueDate if it's not empty
      if (dueDate) {
        payload.dueDate = dueDate;
      }

      const response = await axios.post(
        `/api/tasks/${assignTask.id}/assign`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setToast({
          message: `Task assigned to ${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'} successfully`,
          type: 'success'
        });
        setShowAssignModal(false);
        fetchModuleAndTasks(); // Refresh to show updated assignments
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
      setToast({
        message: 'Failed to assign task: ' + (error.response?.data?.message || error.message),
        type: 'error'
      });
    } finally {
      setAssigning(false);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const toggleUnassignUserSelection = (userId) => {
    if (selectedUnassignUsers.includes(userId)) {
      setSelectedUnassignUsers(selectedUnassignUsers.filter(id => id !== userId));
    } else {
      setSelectedUnassignUsers([...selectedUnassignUsers, userId]);
    }
  };

  const handleUnassignTask = async () => {
    if (selectedUnassignUsers.length === 0) {
      setToast({ message: 'Please select at least one user to unassign', type: 'error' });
      return;
    }

    if (!confirm(`Are you sure you want to unassign this task from ${selectedUnassignUsers.length} user(s)?`)) {
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/tasks/${assignTask.id}/unassign`,
        { userIds: selectedUnassignUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setToast({
          message: `Task unassigned from ${selectedUnassignUsers.length} ${selectedUnassignUsers.length === 1 ? 'user' : 'users'} successfully`,
          type: 'success'
        });
        setSelectedUnassignUsers([]);

        // Refresh assigned users list
        const refreshResponse = await axios.get(`/api/tasks/${assignTask.id}/assigned-users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (refreshResponse.data.success) {
          setTaskAssignedUsers({ ...taskAssignedUsers, [assignTask.id]: refreshResponse.data.data });
        }

        fetchModuleAndTasks(); // Refresh tasks list
      }
    } catch (error) {
      console.error('Failed to unassign task:', error);
      setToast({
        message: 'Failed to unassign task: ' + (error.response?.data?.message || error.message),
        type: 'error'
      });
    } finally {
      setAssigning(false);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Module not found</p>
          <Link href={`/admin/courses/${courseId}`} className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Modules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{module.title} - Tasks - ParkarLabs</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href={`/admin/courses/${courseId}`} className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <div className="text-sm text-gray-500">{courseTit}</div>
                  <h1 className="text-2xl font-semibold text-gray-900">{module.title}</h1>
                  <p className="text-sm text-gray-600 mt-0.5">{tasks.length} tasks</p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tasks Grid */}
          {filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 leading-snug">
                          {task.title}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-0.5 ml-2">
                        <button
                          onClick={() => handleAssignClick(task)}
                          className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded"
                          title="Assign task"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-md p-3.5 mb-4 border border-gray-100">
                      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line space-y-1.5">
                        {task.description?.split('\n\n').map((line, index) => (
                          <div key={index} className="flex items-start">
                            {line.trim() && (
                              <>
                                <span className="text-gray-400 mr-2 mt-0.5 flex-shrink-0">•</span>
                                <span className="flex-1">{line.trim()}</span>
                              </>
                            )}
                          </div>
                        )) || <span className="text-gray-400 italic">No description</span>}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-gray-500">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">
                          {task.assignment_count || 0} assigned
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {task.created_by_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No tasks found' : 'No tasks yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Get started by creating your first task'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h3>

            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    placeholder="Enter task description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Task</h3>

            <form onSubmit={handleUpdateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={editTask.title}
                    onChange={(e) => setEditTask({...editTask, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    value={editTask.description}
                    onChange={(e) => setEditTask({...editTask, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary"
                >
                  {updating ? 'Updating...' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assign Task</h3>
              <p className="text-sm text-gray-600">Task: {assignTask.title}</p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="px-6 py-4 overflow-y-auto flex-grow">

            {/* Users with Full Course Access Section */}
            {courseAssignedUsers.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    Users with Full Course Access ({courseAssignedUsers.length})
                  </span>
                </div>
                <p className="text-xs text-blue-700 mb-2">
                  These users have access to all modules and tasks (including this one) and cannot be assigned at task level
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {courseAssignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="text-sm bg-white p-2 rounded border border-blue-100"
                    >
                      <span className="font-medium text-gray-900">{user.name}</span>
                      <span className="text-gray-500 ml-2">({user.email})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users with Full Module Access Section */}
            {moduleAssignedUsers.length > 0 && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">
                    Users with Full Module Access ({moduleAssignedUsers.length})
                  </span>
                </div>
                <p className="text-xs text-purple-700 mb-2">
                  These users have access to all tasks in this module and cannot be assigned at task level
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {moduleAssignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="text-sm bg-white p-2 rounded border border-purple-100"
                    >
                      <span className="font-medium text-gray-900">{user.name}</span>
                      <span className="text-gray-500 ml-2">({user.email})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Already Assigned Users Section */}
            {taskAssignedUsers[assignTask.id] && taskAssignedUsers[assignTask.id].length > 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">
                      Already Assigned to {taskAssignedUsers[assignTask.id].length} users
                    </span>
                  </div>
                  {selectedUnassignUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUnassignTask}
                      disabled={assigning}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Unassign ({selectedUnassignUsers.length})
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {taskAssignedUsers[assignTask.id].map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between text-sm bg-white p-2 rounded border border-green-100 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleUnassignUserSelection(user.id)}
                    >
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={selectedUnassignUsers.includes(user.id)}
                          onChange={() => {}}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                          <span className="text-gray-500 ml-2">({user.email})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAssignTask} className="flex flex-col flex-grow">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Users
                  </label>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {users.filter(user => {
                      // Filter out users with course access
                      const courseUserIds = courseAssignedUsers.map(u => u.id);
                      // Filter out users with module access
                      const moduleUserIds = moduleAssignedUsers.map(u => u.id);
                      // Filter out users already assigned to this task
                      const taskUserIds = taskAssignedUsers[assignTask.id]?.map(u => u.id) || [];
                      return !courseUserIds.includes(user.id) && !moduleUserIds.includes(user.id) && !taskUserIds.includes(user.id);
                    }).map(user => (
                      <div
                        key={user.id}
                        className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => {}}
                          className="mr-3 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 flex-shrink-0 ml-2">
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedUsers.length} user(s) selected
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </form>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="px-6 py-4 border-t flex-shrink-0 bg-gray-50">
              <div className="flex justify-end items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleAssignTask}
                  disabled={assigning || selectedUsers.length === 0}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigning ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
