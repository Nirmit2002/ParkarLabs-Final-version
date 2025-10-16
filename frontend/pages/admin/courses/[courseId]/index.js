// pages/admin/courses/[courseId]/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Toast from '../../../../components/Toast';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  ChevronRight,
  FileText,
  CheckSquare,
  UserPlus,
  Users
} from 'lucide-react';

export default function CourseModulesPage() {
  const router = useRouter();
  const { courseId } = router.query;
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newModule, setNewModule] = useState({
    title: '',
    content: '',
    position: 0
  });
  const [editModule, setEditModule] = useState({
    id: null,
    title: '',
    content: '',
    position: 0
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showAssignModuleModal, setShowAssignModuleModal] = useState(false);
  const [assignModule, setAssignModule] = useState({ id: null, title: '' });
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState(null);
  const [moduleAssignedUsers, setModuleAssignedUsers] = useState({});
  const [selectedUnassignUsers, setSelectedUnassignUsers] = useState([]);
  const [courseAssignedUsers, setCourseAssignedUsers] = useState([]);

  useEffect(() => {
    if (courseId) {
      checkAuth();
      fetchCourseAndModules();
      fetchUsers();
    }
  }, [courseId]);

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

  const fetchCourseAndModules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCourse(response.data.data);
        setModules(response.data.data.modules || []);
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
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

  const handleAssignModuleClick = async (module) => {
    setAssignModule({ id: module.id, title: module.title });
    setSelectedUsers([]);
    setSelectedUnassignUsers([]);
    setDueDate('');
    setShowAssignModuleModal(true);

    // Fetch course-assigned users and module-assigned users
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
      const moduleResponse = await axios.get(`/api/courses/${courseId}/modules/${module.id}/assigned-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (moduleResponse.data.success) {
        setModuleAssignedUsers({ ...moduleAssignedUsers, [module.id]: moduleResponse.data.data });
      }
    } catch (error) {
      console.error('Failed to fetch assigned users:', error);
    }
  };

  const handleAssignModule = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      setToast({ message: 'Please select at least one user', type: 'error' });
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/courses/${courseId}/modules/${assignModule.id}/assign`,
        {
          userIds: selectedUsers,
          dueDate: dueDate || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setToast({
          message: `Module assigned to ${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'} successfully`,
          type: 'success'
        });
        setShowAssignModuleModal(false);
        fetchCourseAndModules(); // Refresh to show updated assignments
      }
    } catch (error) {
      console.error('Failed to assign module:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorHint = error.response?.data?.hint;
      setToast({
        message: errorHint ? `${errorMessage}\n\n${errorHint}` : errorMessage,
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

  const handleUnassignModule = async () => {
    if (selectedUnassignUsers.length === 0) {
      setToast({ message: 'Please select at least one user to unassign', type: 'error' });
      return;
    }

    if (!confirm(`Are you sure you want to unassign this module from ${selectedUnassignUsers.length} user(s)?`)) {
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/courses/${courseId}/modules/${assignModule.id}/unassign`,
        { userIds: selectedUnassignUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setToast({
          message: `Module unassigned from ${selectedUnassignUsers.length} ${selectedUnassignUsers.length === 1 ? 'user' : 'users'} successfully`,
          type: 'success'
        });
        setSelectedUnassignUsers([]);

        // Refresh assigned users list
        const refreshResponse = await axios.get(`/api/courses/${courseId}/modules/${assignModule.id}/assigned-users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (refreshResponse.data.success) {
          setModuleAssignedUsers({ ...moduleAssignedUsers, [assignModule.id]: refreshResponse.data.data });
        }

        fetchCourseAndModules(); // Refresh modules list
      }
    } catch (error) {
      console.error('Failed to unassign module:', error);
      setToast({
        message: 'Failed to unassign module: ' + (error.response?.data?.message || error.message),
        type: 'error'
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/courses/${courseId}/modules`, newModule, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setNewModule({ title: '', content: '', position: modules.length });
        fetchCourseAndModules();
      }
    } catch (error) {
      console.error('Failed to create module:', error);
      alert('Failed to create module: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const handleEditModule = (module) => {
    setEditModule({
      id: module.id,
      title: module.title,
      content: module.content,
      position: module.position
    });
    setShowEditModal(true);
  };

  const handleUpdateModule = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/courses/${courseId}/modules/${editModule.id}`,
        {
          title: editModule.title,
          content: editModule.content,
          position: editModule.position
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShowEditModal(false);
        fetchCourseAndModules();
      }
    } catch (error) {
      console.error('Failed to update module:', error);
      alert('Failed to update module: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteModule = async (moduleId, moduleTitle) => {
    if (!confirm(`Are you sure you want to delete "${moduleTitle}"? This will delete all tasks in this module.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${courseId}/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchCourseAndModules();
    } catch (error) {
      console.error('Failed to delete module:', error);
      alert('Failed to delete module: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Course not found</p>
          <Link href="/admin/courses" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{course.title} - Modules - ParkarLabs</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/admin/courses" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{course.title}</h1>
                  <p className="text-sm text-gray-600 mt-0.5">{modules.length} modules</p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Module
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
                placeholder="Search modules..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Modules Grid */}
          {filteredModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((module, index) => (
                <div
                  key={module.id}
                  className="bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
                  onClick={() => router.push(`/admin/courses/${courseId}/modules/${module.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <FileText className="w-7 h-7 text-blue-600" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignModuleClick(module);
                          }}
                          className="text-gray-400 hover:text-green-600 transition-colors p-1 hover:bg-green-50 rounded"
                          title="Assign module"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditModule(module);
                          }}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModule(module.id, module.title);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Module {index + 1}</span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                      {module.content}
                    </p>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <CheckSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {module.task_count || 0} tasks
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No modules found' : 'No modules yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Get started by creating your first module'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Module
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Module</h3>

            <form onSubmit={handleCreateModule}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module Title
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter module title"
                    value={newModule.title}
                    onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    placeholder="Enter module description"
                    value={newModule.content}
                    onChange={(e) => setNewModule({...newModule, content: e.target.value})}
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
                  {creating ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Module</h3>

            <form onSubmit={handleUpdateModule}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module Title
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={editModule.title}
                    onChange={(e) => setEditModule({...editModule, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    value={editModule.content}
                    onChange={(e) => setEditModule({...editModule, content: e.target.value})}
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
                  {updating ? 'Updating...' : 'Update Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Module Modal */}
      {showAssignModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assign Module</h3>
              <p className="text-sm text-gray-600">Module: {assignModule.title}</p>
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
                  These users have access to all modules (including this one) and cannot be assigned at module level
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

            {/* Already Assigned Users Section */}
            {moduleAssignedUsers[assignModule.id] && moduleAssignedUsers[assignModule.id].length > 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">
                      Already Assigned to {moduleAssignedUsers[assignModule.id].length} users
                    </span>
                  </div>
                  {selectedUnassignUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUnassignModule}
                      disabled={assigning}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Unassign ({selectedUnassignUsers.length})
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {moduleAssignedUsers[assignModule.id].map((user) => (
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

            <form onSubmit={handleAssignModule} className="flex flex-col flex-grow">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Users to Assign
                  </label>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {users.filter(user => {
                      // Filter out users who have full course access
                      const courseUserIds = courseAssignedUsers.map(u => u.id);
                      // Filter out users already assigned to this module
                      const moduleUserIds = moduleAssignedUsers[assignModule.id]?.map(u => u.id) || [];
                      return !courseUserIds.includes(user.id) && !moduleUserIds.includes(user.id);
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
                  onClick={() => setShowAssignModuleModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleAssignModule}
                  disabled={assigning || selectedUsers.length === 0}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigning ? 'Assigning...' : 'Assign Module'}
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
