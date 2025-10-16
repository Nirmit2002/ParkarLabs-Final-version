// pages/admin/labs.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import {
  Container,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  Save,
  LogOut,
  ArrowLeft,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Play,
  Square,
  RotateCw
} from 'lucide-react';
import Toast from '../../components/Toast';

export default function LabManagement() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [labs, setLabs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedLab, setSelectedLab] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form state
  const [formData, setFormData] = useState({
    lxc_name: '',
    owner_user_id: '',
    image: 'ubuntu:22.04',
    cpu: 1,
    memory_mb: 1024,
    disk_mb: 10240
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    checkAuth();
    fetchLabs();
    fetchUsers();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProfilePic(response.data.data.profilePic);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      if (userData.role !== 'admin' && userData.role !== 'manager') {
        router.push('/user/dashboard');
        return;
      }
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login');
    }
  };

  const fetchLabs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/labs', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          limit: 100,
          search: searchTerm,
          status: statusFilter
        }
      });

      if (response.data.success) {
        setLabs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching labs:', error);
      showToast('Failed to fetch LABs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/labs/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      lxc_name: '',
      owner_user_id: '',
      image: 'ubuntu:22.04',
      cpu: 1,
      memory_mb: 1024,
      disk_mb: 10240
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (lab) => {
    setModalMode('edit');
    setSelectedLab(lab);
    setFormData({
      lxc_name: lab.lxc_name,
      owner_user_id: lab.owner_user_id,
      image: lab.image,
      cpu: lab.cpu,
      memory_mb: lab.memory_mb,
      disk_mb: lab.disk_mb
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLab(null);
    setFormData({
      lxc_name: '',
      owner_user_id: '',
      image: 'ubuntu:22.04',
      cpu: 1,
      memory_mb: 1024,
      disk_mb: 10240
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.lxc_name.trim()) {
      errors.lxc_name = 'LAB name is required';
    }

    if (!formData.owner_user_id) {
      errors.owner_user_id = 'Owner is required';
    }

    if (!formData.image.trim()) {
      errors.image = 'Image is required';
    }

    if (formData.cpu < 1 || formData.cpu > 16) {
      errors.cpu = 'CPU must be between 1 and 16';
    }

    if (formData.memory_mb < 512 || formData.memory_mb > 32768) {
      errors.memory_mb = 'Memory must be between 512 MB and 32 GB';
    }

    if (formData.disk_mb < 5120 || formData.disk_mb > 102400) {
      errors.disk_mb = 'Disk must be between 5 GB and 100 GB';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (modalMode === 'create') {
        const response = await axios.post('/api/labs', formData, config);
        if (response.data.success) {
          showToast('LAB created successfully', 'success');
          fetchLabs();
          closeModal();
        }
      } else {
        const response = await axios.put(`/api/labs/${selectedLab.id}`, formData, config);
        if (response.data.success) {
          showToast('LAB updated successfully', 'success');
          fetchLabs();
          closeModal();
        }
      }
    } catch (error) {
      console.error('Error saving lab:', error);
      showToast(error.response?.data?.message || 'Failed to save LAB', 'error');
    }
  };

  const handleDelete = async (labId, labName) => {
    if (!confirm(`Are you sure you want to delete LAB "${labName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/labs/${labId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        showToast('LAB deleted successfully', 'success');
        fetchLabs();
      }
    } catch (error) {
      console.error('Error deleting lab:', error);
      showToast(error.response?.data?.message || 'Failed to delete LAB', 'error');
    }
  };

  const handleStartLab = async (labId, labName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/labs/${labId}`,
        { status_id: 2 }, // 2 = running
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast(`LAB "${labName}" started successfully`, 'success');
        fetchLabs();
      }
    } catch (error) {
      console.error('Error starting lab:', error);
      showToast(error.response?.data?.message || 'Failed to start LAB', 'error');
    }
  };

  const handleStopLab = async (labId, labName) => {
    if (!confirm(`Are you sure you want to stop LAB "${labName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/labs/${labId}`,
        { status_id: 3 }, // 3 = stopped
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast(`LAB "${labName}" stopped successfully`, 'success');
        fetchLabs();
      }
    } catch (error) {
      console.error('Error stopping lab:', error);
      showToast(error.response?.data?.message || 'Failed to stop LAB', 'error');
    }
  };

  const handleRestartLab = async (labId, labName) => {
    try {
      const token = localStorage.getItem('token');
      // First stop, then start
      await axios.put(
        `/api/labs/${labId}`,
        { status_id: 3 }, // Stop
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimeout(async () => {
        await axios.put(
          `/api/labs/${labId}`,
          { status_id: 2 }, // Start
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast(`LAB "${labName}" restarted successfully`, 'success');
        fetchLabs();
      }, 1000);
    } catch (error) {
      console.error('Error restarting lab:', error);
      showToast(error.response?.data?.message || 'Failed to restart LAB', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'creating': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'deleting': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredLabs = labs.filter(lab => {
    const matchesSearch =
      lab.lxc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.owner_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || lab.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
        <title>LAB Management - ParkarLabs</title>
      </Head>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-full px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <img
                  src="/images/parkarlabs-logo.png"
                  alt="ParkarLabs Logo"
                  className="h-8 w-8"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">ParkarLabs Admin</h1>
                  <p className="text-sm text-gray-500">LAB Management</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => router.push('/admin/profile-settings')}
                  title="Go to Profile Settings"
                >
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt={user?.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div
                  className="text-right cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => router.push('/admin/profile-settings')}
                  title="Go to Profile Settings"
                >
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost btn-sm"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-full px-6 lg:px-8 py-8">
          {/* Back Button and Title */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">LAB Management</h2>
                <p className="text-gray-600 mt-1">Create, view, edit, and delete LABs</p>
              </div>
              <button
                onClick={openCreateModal}
                className="btn btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New LAB
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-6">
            <div className="card-content">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by LAB name, owner name, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input pl-10 w-full"
                    />
                  </div>
                </div>
                <div className="md:w-64">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="creating">Creating</option>
                    <option value="failed">Failed</option>
                    <option value="deleting">Deleting</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* LABs Table */}
          <div className="card">
            <div className="card-content">
              <div className="overflow-x-auto">
                {filteredLabs.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          LAB Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resources
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLabs.map((lab) => (
                        <tr key={lab.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Container className="h-5 w-5 text-blue-600 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{lab.lxc_name}</div>
                                {lab.ip_address && (
                                  <div className="text-xs text-gray-500">{lab.ip_address}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lab.owner_name}</div>
                            <div className="text-xs text-gray-500">{lab.owner_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Server className="h-4 w-4 text-gray-400 mr-1" />
                              {lab.image}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs space-y-1">
                              <div className="flex items-center text-gray-600">
                                <Cpu className="h-3.5 w-3.5 mr-1" />
                                {lab.cpu} CPU
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Activity className="h-3.5 w-3.5 mr-1" />
                                {lab.memory_mb} MB RAM
                              </div>
                              <div className="flex items-center text-gray-600">
                                <HardDrive className="h-3.5 w-3.5 mr-1" />
                                {(lab.disk_mb / 1024).toFixed(1)} GB Disk
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(lab.status)}`}>
                              {lab.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(lab.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {/* Start Button - Show if stopped or failed */}
                              {(lab.status === 'stopped' || lab.status === 'failed') && (
                                <button
                                  onClick={() => handleStartLab(lab.id, lab.lxc_name)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Start LAB"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}

                              {/* Stop Button - Show if running */}
                              {lab.status === 'running' && (
                                <button
                                  onClick={() => handleStopLab(lab.id, lab.lxc_name)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Stop LAB"
                                >
                                  <Square className="h-4 w-4" />
                                </button>
                              )}

                              {/* Restart Button - Show if running */}
                              {lab.status === 'running' && (
                                <button
                                  onClick={() => handleRestartLab(lab.id, lab.lxc_name)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Restart LAB"
                                >
                                  <RotateCw className="h-4 w-4" />
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                onClick={() => openEditModal(lab)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit LAB"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(lab.id, lab.lxc_name)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete LAB"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <Container className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No LABs Found</p>
                    <p className="text-sm text-gray-500">
                      {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Create your first LAB to get started'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {modalMode === 'create' ? 'Create New LAB' : 'Edit LAB'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* LAB Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LAB Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lxc_name}
                      onChange={(e) => setFormData({ ...formData, lxc_name: e.target.value })}
                      className={`input w-full ${formErrors.lxc_name ? 'border-red-500' : ''}`}
                      placeholder="my-lab-01"
                    />
                    {formErrors.lxc_name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.lxc_name}</p>
                    )}
                  </div>

                  {/* Owner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner *
                    </label>
                    <select
                      value={formData.owner_user_id}
                      onChange={(e) => setFormData({ ...formData, owner_user_id: e.target.value })}
                      className={`input w-full ${formErrors.owner_user_id ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Owner</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                    {formErrors.owner_user_id && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.owner_user_id}</p>
                    )}
                  </div>

                  {/* Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image *
                    </label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className={`input w-full ${formErrors.image ? 'border-red-500' : ''}`}
                      placeholder="ubuntu:22.04"
                    />
                    {formErrors.image && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.image}</p>
                    )}
                  </div>

                  {/* CPU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPU Cores (1-16) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={formData.cpu}
                      onChange={(e) => setFormData({ ...formData, cpu: parseInt(e.target.value) })}
                      className={`input w-full ${formErrors.cpu ? 'border-red-500' : ''}`}
                    />
                    {formErrors.cpu && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.cpu}</p>
                    )}
                  </div>

                  {/* Memory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Memory (MB) (512-32768) *
                    </label>
                    <input
                      type="number"
                      min="512"
                      max="32768"
                      step="512"
                      value={formData.memory_mb}
                      onChange={(e) => setFormData({ ...formData, memory_mb: parseInt(e.target.value) })}
                      className={`input w-full ${formErrors.memory_mb ? 'border-red-500' : ''}`}
                    />
                    {formErrors.memory_mb && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.memory_mb}</p>
                    )}
                  </div>

                  {/* Disk */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Disk (MB) (5120-102400) *
                    </label>
                    <input
                      type="number"
                      min="5120"
                      max="102400"
                      step="1024"
                      value={formData.disk_mb}
                      onChange={(e) => setFormData({ ...formData, disk_mb: parseInt(e.target.value) })}
                      className={`input w-full ${formErrors.disk_mb ? 'border-red-500' : ''}`}
                    />
                    {formErrors.disk_mb && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.disk_mb}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {(formData.disk_mb / 1024).toFixed(1)} GB
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {modalMode === 'create' ? 'Create LAB' : 'Update LAB'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
