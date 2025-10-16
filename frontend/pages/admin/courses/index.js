// pages/admin/courses/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Toast from '../../../components/Toast';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Upload,
  FileSpreadsheet,
  X,
  ChevronRight,
  Layers,
  UserPlus,
  Users
} from 'lucide-react';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    visibility: 'private'
  });
  const [editCourse, setEditCourse] = useState({
    id: null,
    title: '',
    description: '',
    visibility: 'private'
  });
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [assignCourse, setAssignCourse] = useState({ id: null, title: '' });
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState(null);
  const [courseAssignedUsers, setCourseAssignedUsers] = useState({});
  const [selectedUnassignUsers, setSelectedUnassignUsers] = useState([]);

  useEffect(() => {
    checkAuth();
    fetchCourses();
    fetchUsers();
  }, []);

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

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
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

  const handleAssignCourseClick = async (course) => {
    setAssignCourse({ id: course.id, title: course.title });
    setSelectedUsers([]);
    setSelectedUnassignUsers([]);
    setDueDate('');
    setShowAssignCourseModal(true);

    // Fetch assigned users for this course
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${course.id}/assigned-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourseAssignedUsers({ ...courseAssignedUsers, [course.id]: response.data.data });
      }
    } catch (error) {
      console.error('Failed to fetch assigned users:', error);
    }
  };

  const handleAssignCourse = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      setToast({ message: 'Please select at least one user', type: 'error' });
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/courses/${assignCourse.id}/assign`,
        {
          userIds: selectedUsers,
          dueDate: dueDate || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setToast({
          message: `Course assigned to ${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'} successfully`,
          type: 'success'
        });
        setShowAssignCourseModal(false);
        fetchCourses(); // Refresh to show updated assignments
      }
    } catch (error) {
      console.error('Failed to assign course:', error);
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

  const handleUnassignCourse = async () => {
    if (selectedUnassignUsers.length === 0) {
      setToast({ message: 'Please select at least one user to unassign', type: 'error' });
      return;
    }

    if (!confirm(`Are you sure you want to unassign this course from ${selectedUnassignUsers.length} user(s)?`)) {
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/courses/${assignCourse.id}/unassign`,
        { userIds: selectedUnassignUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setToast({
          message: `Course unassigned from ${selectedUnassignUsers.length} ${selectedUnassignUsers.length === 1 ? 'user' : 'users'} successfully`,
          type: 'success'
        });
        setSelectedUnassignUsers([]);

        // Refresh assigned users list
        const refreshResponse = await axios.get(`/api/courses/${assignCourse.id}/assigned-users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (refreshResponse.data.success) {
          setCourseAssignedUsers({ ...courseAssignedUsers, [assignCourse.id]: refreshResponse.data.data });
        }

        fetchCourses(); // Refresh courses list
      }
    } catch (error) {
      console.error('Failed to unassign course:', error);
      setToast({
        message: 'Failed to unassign course: ' + (error.response?.data?.message || error.message),
        type: 'error'
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/courses', newCourse, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setNewCourse({ title: '', description: '', visibility: 'private' });
        fetchCourses();
      }
    } catch (error) {
      console.error('Failed to create course:', error);
      alert('Failed to create course: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const handleEditCourse = (course) => {
    setEditCourse({
      id: course.id,
      title: course.title,
      description: course.description,
      visibility: course.visibility
    });
    setShowEditModal(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/courses/${editCourse.id}`, {
        title: editCourse.title,
        description: editCourse.description,
        visibility: editCourse.visibility
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowEditModal(false);
        fetchCourses();
      }
    } catch (error) {
      console.error('Failed to update course:', error);
      alert('Failed to update course: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This will delete all modules and tasks.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      alert('Please select an Excel file first');
      return;
    }

    setImporting(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await axios.post('/api/courses/import/excel', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert(response.data.message);
        setShowImportModal(false);
        setImportFile(null);
        fetchCourses();
      }
    } catch (error) {
      console.error('Failed to import Excel:', error);
      alert('Failed to import Excel: ' + (error.response?.data?.message || error.message));
    } finally {
      setImporting(false);
    }
  };

  const downloadExcelTemplate = () => {
    const template = [
      ['Course Title', 'Course Description', 'Visibility'],
      ['Python Programming', 'Complete Python course for beginners', 'private'],
      ['', 'Module 1', 'Introduction to Python'],
      ['', '', 'Task: Install Python and setup environment'],
      ['', '', 'Task: Learn Python syntax and variables'],
      ['', 'Module 2', 'Data Structures'],
      ['', '', 'Task: Master lists and tuples'],
      ['', '', 'Task: Work with dictionaries'],
      [''],
      ['Data Science Fundamentals', 'Learn data science with Python', 'public'],
      ['', 'Module 1', 'NumPy Basics'],
      ['', '', 'Task: Array operations'],
      ['', '', 'Task: Mathematical functions']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Courses');
    XLSX.writeFile(wb, 'course_import_template.xlsx');
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Courses - ParkarLabs</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
                  <p className="text-sm text-gray-600 mt-0.5">Manage training courses</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Course
                </button>
              </div>
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
                placeholder="Search courses..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
                  onClick={() => router.push(`/admin/courses/${course.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <BookOpen className="w-7 h-7 text-purple-600" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCourseClick(course);
                          }}
                          className="text-gray-400 hover:text-green-600 transition-colors p-1 hover:bg-green-50 rounded"
                          title="Assign course"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCourse(course);
                          }}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.id, course.title);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors leading-tight">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Layers className="h-4 w-4" />
                        <span className="font-medium">{course.module_count} modules</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        course.visibility === 'public'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.visibility}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        By {course.created_by_name}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No courses found' : 'No courses yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Get started by creating a course or importing from Excel'}
              </p>
              {!searchTerm && (
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="btn btn-secondary"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Course</h3>

            <form onSubmit={handleCreateCourse}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter course title"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    placeholder="Enter course description"
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    className="input"
                    value={newCourse.visibility}
                    onChange={(e) => setNewCourse({...newCourse, visibility: e.target.value})}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
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
                  {creating ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Course</h3>

            <form onSubmit={handleUpdateCourse}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={editCourse.title}
                    onChange={(e) => setEditCourse({...editCourse, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    value={editCourse.description}
                    onChange={(e) => setEditCourse({...editCourse, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    className="input"
                    value={editCourse.visibility}
                    onChange={(e) => setEditCourse({...editCourse, visibility: e.target.value})}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
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
                  {updating ? 'Updating...' : 'Update Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import from Excel</h3>

            <div className="space-y-4">
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Format</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Row 1: Course Title | Description | Visibility</li>
                  <li>• Row 2+: Empty | Module Title | Module Description</li>
                  <li>• Row 3+: Empty | Empty | Task: Task Title</li>
                </ul>
                <button
                  onClick={downloadExcelTemplate}
                  className="mt-3 text-sm btn btn-secondary btn-sm w-full"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-medium
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportExcel}
                  disabled={!importFile || importing}
                  className="btn btn-primary"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assign Course</h3>
              <p className="text-sm text-gray-600">Course: {assignCourse.title}</p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="px-6 py-4 overflow-y-auto flex-grow">

            {/* Already Assigned Users Section */}
            {courseAssignedUsers[assignCourse.id] && courseAssignedUsers[assignCourse.id].length > 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">
                      Already Assigned to {courseAssignedUsers[assignCourse.id].length} users
                    </span>
                  </div>
                  {selectedUnassignUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUnassignCourse}
                      disabled={assigning}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Unassign ({selectedUnassignUsers.length})
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {courseAssignedUsers[assignCourse.id].map((user) => (
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

            <form onSubmit={handleAssignCourse} className="flex flex-col flex-grow">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Users to Assign
                  </label>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {users.filter(user => {
                      // Filter out already assigned users
                      const assignedUserIds = courseAssignedUsers[assignCourse.id]?.map(u => u.id) || [];
                      return !assignedUserIds.includes(user.id);
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
                  onClick={() => setShowAssignCourseModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleAssignCourse}
                  disabled={assigning || selectedUsers.length === 0}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigning ? 'Assigning...' : 'Assign Course'}
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
