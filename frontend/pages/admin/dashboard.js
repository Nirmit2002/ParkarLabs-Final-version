// pages/admin/dashboard.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import {
  Users,
  BookOpen,
  Container,
  Activity,
  Plus,
  Server,
  CheckCircle,
  Clock,
  LogOut,
  ClipboardList,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  UserX
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Professional color palette
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalContainers: 0,
    runningContainers: 0,
    assignedTasks: 0,
    completedTasks: 0
  });
  const [liveUsers, setLiveUsers] = useState([]);
  const [userCourseTracking, setUserCourseTracking] = useState([]);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // Chart data state
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [employeeNames, setEmployeeNames] = useState([]); // Track employee names for line chart
  const [containerStatusData, setContainerStatusData] = useState([]);
  const [assignmentStatsData, setAssignmentStatsData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [roleDistributionData, setRoleDistributionData] = useState([]);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
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
      console.log('Stored user data:', userData);

      // Check if user is admin or manager
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

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data in parallel
      const [
        statsResponse,
        liveUsersResponse,
        userGrowthResponse,
        containerStatusResponse,
        assignmentStatsResponse,
        activityResponse,
        roleDistributionResponse,
        userTrackingResponse
      ] = await Promise.all([
        axios.get('/api/admin/test', { headers }),
        axios.get('/api/admin/analytics/live-users', { headers }),
        axios.get('/api/admin/analytics/user-growth', { headers }),
        axios.get('/api/admin/analytics/container-status', { headers }),
        axios.get('/api/admin/analytics/assignment-stats', { headers }),
        axios.get('/api/admin/analytics/activity', { headers }),
        axios.get('/api/admin/analytics/role-distribution', { headers }),
        axios.get('/api/admin/user-course-tracking', { headers })
      ]);

      if (statsResponse.data.success) {
        setStats({
          totalUsers: parseInt(statsResponse.data.stats.total_users) || 0,
          totalCourses: parseInt(statsResponse.data.stats.total_courses) || 0,
          totalContainers: parseInt(statsResponse.data.stats.total_containers) || 0,
          runningContainers: parseInt(statsResponse.data.stats.running_containers) || 0,
          assignedTasks: parseInt(statsResponse.data.stats.pending_assignments) || 0,
          completedTasks: parseInt(statsResponse.data.stats.completed_assignments) || 0
        });
      }

      if (liveUsersResponse.data.success) {
        setLiveUsers(liveUsersResponse.data.data);
      }

      // Format chart data - Employee Performance (transform to date-based structure with user columns)
      if (userGrowthResponse.data.success) {
        const rawData = userGrowthResponse.data.data;

        // Get unique employee names
        const uniqueEmployees = [...new Set(rawData.map(item => item.user_name))];
        setEmployeeNames(uniqueEmployees);

        // Group by date and create an object with each user as a property
        const dateMap = {};
        rawData.forEach(item => {
          const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!dateMap[date]) {
            dateMap[date] = { date };
          }
          dateMap[date][item.user_name] = parseInt(item.completed);
        });

        setUserGrowthData(Object.values(dateMap));
      }

      if (containerStatusResponse.data.success) {
        setContainerStatusData(containerStatusResponse.data.data.map(item => ({
          name: item.status,
          value: parseInt(item.count)
        })));
      }

      if (assignmentStatsResponse.data.success) {
        setAssignmentStatsData(assignmentStatsResponse.data.data.map(item => ({
          status: item.status.replace('_', ' '),
          count: parseInt(item.count)
        })));
      }

      // Format Activity data - Multiple engagement metrics
      if (activityResponse.data.success) {
        setActivityData(activityResponse.data.data.map(item => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          activeUsers: parseInt(item.active_users),
          tasksCompleted: parseInt(item.tasks_completed),
          tasksAssigned: parseInt(item.tasks_assigned),
          totalActions: parseInt(item.total_actions)
        })));
      }

      if (roleDistributionResponse.data.success) {
        setRoleDistributionData(roleDistributionResponse.data.data.map(item => ({
          name: item.role,
          value: parseInt(item.count)
        })));
      }

      if (userTrackingResponse.data.success) {
        setUserCourseTracking(userTrackingResponse.data.data);
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  // Helper function to format time duration
  const formatTimeDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'N/A';

    const mins = parseFloat(minutes);

    if (mins < 1) {
      // Less than 1 minute - show in seconds
      const seconds = Math.round(mins * 60);
      return `${seconds}s`;
    } else if (mins < 60) {
      // Less than 1 hour - show in minutes
      return `${mins.toFixed(0)}m`;
    } else {
      // 1 hour or more - show in hours
      const hours = mins / 60;
      if (hours < 10) {
        return `${hours.toFixed(1)}h`;
      } else {
        return `${Math.round(hours)}h`;
      }
    }
  };

  const fetchUserDetails = async (userId) => {
    if (userDetails[userId]) {
      // Already fetched
      setExpandedUserId(expandedUserId === userId ? null : userId);
      return;
    }

    setLoadingDetails({ ...loadingDetails, [userId]: true });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/user-course-tracking/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUserDetails({ ...userDetails, [userId]: response.data.data });
        setExpandedUserId(userId);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingDetails({ ...loadingDetails, [userId]: false });
    }
  };

  const handleUnassignCourse = async (userId, courseId, courseTitle) => {
    if (!confirm(`Are you sure you want to unassign the course "${courseTitle}" from this user?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/admin/unassign-course', {
        headers: { Authorization: `Bearer ${token}` },
        data: { userId, courseId }
      });

      // Refresh dashboard data
      await fetchDashboardData();

      // Clear cached user details so they refresh
      const newUserDetails = { ...userDetails };
      delete newUserDetails[userId];
      setUserDetails(newUserDetails);
      setExpandedUserId(null);

      alert('Course unassigned successfully');
    } catch (error) {
      console.error('Error unassigning course:', error);
      alert(error.response?.data?.message || 'Failed to unassign course');
    }
  };

  const handleUnassignModule = async (userId, moduleId, moduleTitle) => {
    if (!confirm(`Are you sure you want to unassign the module "${moduleTitle}" from this user?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/admin/unassign-module', {
        headers: { Authorization: `Bearer ${token}` },
        data: { userId, moduleId }
      });

      // Refresh dashboard data
      await fetchDashboardData();

      // Clear cached user details so they refresh
      const newUserDetails = { ...userDetails };
      delete newUserDetails[userId];
      setUserDetails(newUserDetails);
      setExpandedUserId(null);

      alert('Module unassigned successfully');
    } catch (error) {
      console.error('Error unassigning module:', error);
      alert(error.response?.data?.message || 'Failed to unassign module');
    }
  };

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
        <title>Admin Dashboard - ParkarLabs</title>
        <meta name="description" content="ParkarLabs Admin Dashboard" />
      </Head>

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
                  <p className="text-sm text-gray-500">Management Dashboard</p>
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
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-gray-600">
              Here's what's happening in your lab today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div
              className="stat-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push('/admin/users')}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div
              className="stat-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push('/admin/courses')}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Courses</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalCourses}</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Container className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Containers</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalContainers}</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Now</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.runningContainers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
              </div>
              <p className="text-gray-600 mb-4">Add, edit, and manage user accounts and permissions.</p>
              <button
                onClick={() => router.push('/admin/users')}
                className="btn btn-primary btn-md w-full flex items-center justify-center"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </button>
            </div>

            <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/courses')}>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Course Management</h3>
              </div>
              <p className="text-gray-600 mb-4">Create courses, modules, and assign to users.</p>
              <Link href="/admin/courses" className="btn btn-primary btn-md w-full flex items-center justify-center">
                <Plus className="w-4 h-4 mr-1" />
                Manage Courses
              </Link>
            </div>

            <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <Container className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">LAB Monitor</h3>
              </div>
              <p className="text-gray-600 mb-4">Monitor and manage all running LABs.</p>
              <button
                onClick={() => router.push('/admin/labs')}
                className="btn btn-primary btn-md w-full flex items-center justify-center"
              >
                <Container className="w-4 h-4 mr-1" />
                Manage LAB
              </button>
            </div>
          </div>

          {/* User Course Tracking Panel */}
          <div className="card mb-8">
            <div className="card-header">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">User Course Tracking</h3>
                <p className="text-sm text-gray-600">Comprehensive progress tracking for all users with course assignments</p>
              </div>
            </div>
            <div className="card-content">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignments
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tasks Progress
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Started
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userCourseTracking.length > 0 ? (
                      userCourseTracking.map((user) => {
                        const totalAssignments = parseInt(user.total_courses_assigned) + parseInt(user.total_modules_assigned);
                        const completionRate = parseFloat(user.completion_rate_percentage) || 0;
                        const avgTime = formatTimeDuration(user.avg_completion_time_minutes);

                        return (
                          <>
                            <tr
                              key={user.user_id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <button
                                    onClick={() => fetchUserDetails(user.user_id)}
                                    className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    {expandedUserId === user.user_id ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                  </button>
                                  <div
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/admin/user-tracking/${user.user_id}`)}
                                  >
                                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">{user.user_name}</div>
                                    <div className="text-xs text-gray-500">{user.user_email}</div>
                                  </div>
                                </div>
                              </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2 max-w-md">
                                {/* Full Course Assignments */}
                                {user.total_courses_assigned > 0 && (
                                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <BookOpen className="h-4 w-4 text-blue-600 mr-1.5" />
                                        <span className="text-xs font-semibold text-blue-800">Full Courses</span>
                                      </div>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                        {user.total_courses_assigned}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {(user.assigned_courses_list || []).map((courseName, idx) => (
                                        <div key={idx} className="flex items-start text-xs text-blue-900 bg-white rounded px-2 py-1">
                                          <span className="text-blue-400 mr-1.5">•</span>
                                          <span className="flex-1 font-medium">{courseName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Module Assignments */}
                                {user.total_modules_assigned > 0 && (
                                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <Activity className="h-4 w-4 text-purple-600 mr-1.5" />
                                        <span className="text-xs font-semibold text-purple-800">Modules</span>
                                      </div>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                                        {user.total_modules_assigned}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {(user.assigned_modules_list || []).map((mod, idx) => (
                                        <div key={idx} className="flex items-start text-xs text-purple-900 bg-white rounded px-2 py-1">
                                          <span className="text-purple-400 mr-1.5">•</span>
                                          <span className="flex-1">
                                            <span className="font-medium">{mod.course}</span>
                                            <span className="text-purple-600 mx-1">→</span>
                                            <span className="text-purple-700">Module {mod.position}</span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Individual Task Assignments */}
                                {user.total_individual_tasks_assigned > 0 && (
                                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <ClipboardList className="h-4 w-4 text-amber-600 mr-1.5" />
                                        <span className="text-xs font-semibold text-amber-800">Individual Tasks</span>
                                      </div>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-800">
                                        {user.total_individual_tasks_assigned}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {(user.assigned_tasks_list || []).slice(0, 3).map((task, idx) => (
                                        <div key={idx} className="flex items-start text-xs text-amber-900 bg-white rounded px-2 py-1">
                                          <span className="text-amber-400 mr-1.5">•</span>
                                          <span className="flex-1">
                                            <span className="font-medium">{task.course}</span>
                                            <span className="text-amber-600 mx-1">→</span>
                                            <span className="text-amber-700">M{task.module_position}</span>
                                            <span className="text-amber-600 mx-1">→</span>
                                            <span className="text-gray-700">{task.task}</span>
                                          </span>
                                        </div>
                                      ))}
                                      {(user.assigned_tasks_list || []).length > 3 && (
                                        <div className="text-xs text-amber-600 text-center py-1 bg-white rounded font-medium">
                                          +{(user.assigned_tasks_list || []).length - 3} more tasks...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {user.total_courses_assigned === 0 && user.total_modules_assigned === 0 && user.total_individual_tasks_assigned === 0 && (
                                  <div className="flex items-center justify-center py-4 text-gray-400">
                                    <ClipboardList className="h-5 w-5 mr-2" />
                                    <span className="text-xs font-medium">No assignments</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="flex items-center text-xs">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5" />
                                  <span className="font-medium text-green-700">{user.total_tasks_completed}</span>
                                  <span className="text-gray-500 ml-1">completed</span>
                                </div>
                                <div className="flex items-center text-xs">
                                  <Clock className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
                                  <span className="font-medium text-blue-700">{user.total_tasks_in_progress}</span>
                                  <span className="text-gray-500 ml-1">in progress</span>
                                </div>
                                <div className="flex items-center text-xs">
                                  <Activity className="h-3.5 w-3.5 text-amber-600 mr-1.5" />
                                  <span className="font-medium text-amber-700">{user.total_tasks_pending}</span>
                                  <span className="text-gray-500 ml-1">pending</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                    <div
                                      className={`h-2 rounded-full ${
                                        completionRate >= 75 ? 'bg-green-500' :
                                        completionRate >= 50 ? 'bg-blue-500' :
                                        completionRate >= 25 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(completionRate, 100)}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs font-medium text-gray-700">
                                    {user.total_tasks_completed}/{user.total_tasks_assigned} tasks ({completionRate.toFixed(1)}%)
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {avgTime}
                              </div>
                              <div className="text-xs text-gray-500">per task</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.first_task_started_at ? (
                                <div>
                                  <div>{new Date(user.first_task_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                  <div className="text-xs text-gray-400">{new Date(user.first_task_started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not started</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.last_task_completed_at ? (
                                <div>
                                  <div>{new Date(user.last_task_completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                  <div className="text-xs text-gray-400">{new Date(user.last_task_completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No activity</span>
                              )}
                            </td>
                          </tr>

                          {/* Expandable Detail Row */}
                          {expandedUserId === user.user_id && (
                            <tr>
                              <td colSpan="7" className="px-4 py-4 bg-gray-50">
                                {loadingDetails[user.user_id] ? (
                                  <div className="text-center py-8">
                                    <div className="spinner h-6 w-6 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-500">Loading details...</p>
                                  </div>
                                ) : userDetails[user.user_id] ? (
                                  <div className="space-y-6">
                                    {/* Courses Section */}
                                    {userDetails[user.user_id].courses && userDetails[user.user_id].courses.length > 0 && (
                                      <div>
                                        <div className="flex items-center mb-3">
                                          <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                                          <h4 className="text-sm font-semibold text-gray-900">Assigned Courses</h4>
                                        </div>
                                        <div className="space-y-3">
                                          {userDetails[user.user_id].courses.map((course) => (
                                            <div key={course.course_id} className="bg-white rounded-lg border border-gray-200 p-4">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <h5 className="text-sm font-medium text-gray-900">{course.course_title}</h5>
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    Assigned: {new Date(course.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                  </p>
                                                </div>
                                                <button
                                                  onClick={() => handleUnassignCourse(user.user_id, course.course_id, course.course_title)}
                                                  className="ml-2 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                  title="Unassign Course"
                                                >
                                                  <UserX className="h-4 w-4" />
                                                </button>
                                              </div>
                                              <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div className="flex items-center text-xs">
                                                  <Activity className="h-4 w-4 text-purple-600 mr-1.5" />
                                                  <span className="font-medium">{course.completed_modules}/{course.total_modules}</span>
                                                  <span className="text-gray-500 ml-1">modules completed</span>
                                                </div>
                                                <div className="flex items-center text-xs">
                                                  <ClipboardList className="h-4 w-4 text-blue-600 mr-1.5" />
                                                  <span className="font-medium">{course.completed_tasks}/{course.total_tasks}</span>
                                                  <span className="text-gray-500 ml-1">tasks completed</span>
                                                </div>
                                              </div>
                                              <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                  <span className="text-gray-600">Progress</span>
                                                  <span className="font-medium text-gray-900">
                                                    {course.total_tasks > 0 ? ((course.completed_tasks / course.total_tasks) * 100).toFixed(1) : 0}%
                                                  </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                  <div
                                                    className={`h-2 rounded-full ${
                                                      course.total_tasks > 0 && (course.completed_tasks / course.total_tasks) * 100 >= 75 ? 'bg-green-500' :
                                                      course.total_tasks > 0 && (course.completed_tasks / course.total_tasks) * 100 >= 50 ? 'bg-blue-500' :
                                                      course.total_tasks > 0 && (course.completed_tasks / course.total_tasks) * 100 >= 25 ? 'bg-yellow-500' :
                                                      'bg-red-500'
                                                    }`}
                                                    style={{ width: `${course.total_tasks > 0 ? (course.completed_tasks / course.total_tasks) * 100 : 0}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Modules Section */}
                                    {userDetails[user.user_id].modules && userDetails[user.user_id].modules.length > 0 && (
                                      <div>
                                        <div className="flex items-center mb-3">
                                          <Activity className="h-5 w-5 text-purple-600 mr-2" />
                                          <h4 className="text-sm font-semibold text-gray-900">Module Progress</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {userDetails[user.user_id].modules.map((module) => (
                                            <div key={module.module_id} className="bg-white rounded-lg border border-gray-200 p-3">
                                              <div className="mb-2 flex items-start justify-between">
                                                <div className="flex-1">
                                                  <h5 className="text-sm font-medium text-gray-900">{module.module_title}</h5>
                                                  <p className="text-xs text-gray-500">{module.course_title}</p>
                                                </div>
                                                <button
                                                  onClick={() => handleUnassignModule(user.user_id, module.module_id, module.module_title)}
                                                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                  title="Unassign Module"
                                                >
                                                  <UserX className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                              <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                  <div className="flex items-center">
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1" />
                                                    <span className="text-gray-600">Completed</span>
                                                  </div>
                                                  <span className="font-medium text-green-700">{module.completed_tasks}/{module.total_tasks}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                  <div className="flex items-center">
                                                    <Clock className="h-3.5 w-3.5 text-blue-600 mr-1" />
                                                    <span className="text-gray-600">In Progress</span>
                                                  </div>
                                                  <span className="font-medium text-blue-700">{module.in_progress_tasks}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                  <div className="flex items-center">
                                                    <Activity className="h-3.5 w-3.5 text-amber-600 mr-1" />
                                                    <span className="text-gray-600">Pending</span>
                                                  </div>
                                                  <span className="font-medium text-amber-700">{module.total_tasks - module.completed_tasks - module.in_progress_tasks}</span>
                                                </div>
                                              </div>
                                              {module.first_task_started && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                  <p className="text-xs text-gray-500">
                                                    Started: {new Date(module.first_task_started).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Recent Tasks Section */}
                                    {userDetails[user.user_id].tasks && userDetails[user.user_id].tasks.length > 0 && (
                                      <div>
                                        <div className="flex items-center mb-3">
                                          <ClipboardList className="h-5 w-5 text-indigo-600 mr-2" />
                                          <h4 className="text-sm font-semibold text-gray-900">Recent Tasks</h4>
                                        </div>
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                          <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50">
                                                <tr>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time Taken</th>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-200">
                                                {userDetails[user.user_id].tasks.slice(0, 10).map((task) => (
                                                  <tr key={task.task_id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2">
                                                      <div className="text-xs font-medium text-gray-900">{task.task_title}</div>
                                                      <div className="text-xs text-gray-500">{task.course_title}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-gray-600">{task.module_title}</td>
                                                    <td className="px-3 py-2">
                                                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        task.task_status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        task.task_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        task.task_status === 'assigned' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-gray-100 text-gray-800'
                                                      }`}>
                                                        {task.task_status.replace('_', ' ')}
                                                      </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-gray-600">
                                                      {task.completion_time_hours ? `${parseFloat(task.completion_time_hours).toFixed(1)}h` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-gray-600">
                                                      {task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )}
                        </>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="text-center">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-900 font-medium mb-1">No User Tracking Data</p>
                            <p className="text-sm text-gray-500">Users with course assignments will appear here</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Employee Performance Chart - Line graph showing each employee */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Employee Performance</h3>
                  <p className="text-sm text-gray-500">Daily Task Completions - Last 7 Days</p>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  {employeeNames.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Chart - Enhanced with multiple metrics */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
                  <p className="text-sm text-gray-500">Last 7 days - Engagement Metrics</p>
                </div>
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value, name) => {
                      if (name === 'activeUsers') return [value, 'Active Users'];
                      if (name === 'tasksCompleted') return [value, 'Tasks Completed'];
                      if (name === 'tasksAssigned') return [value, 'Tasks Assigned'];
                      return [value, name];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => {
                      if (value === 'activeUsers') return 'Active Users';
                      if (value === 'tasksCompleted') return 'Tasks Completed';
                      if (value === 'tasksAssigned') return 'Tasks Assigned';
                      return value;
                    }}
                  />
                  <Bar dataKey="activeUsers" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Active Users" />
                  <Bar dataKey="tasksCompleted" fill={COLORS.success} radius={[4, 4, 0, 0]} name="Tasks Completed" />
                  <Bar dataKey="tasksAssigned" fill={COLORS.warning} radius={[4, 4, 0, 0]} name="Tasks Assigned" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Assignment Stats */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assignment Status</h3>
                  <p className="text-sm text-gray-500">Current distribution</p>
                </div>
                <ClipboardList className="h-5 w-5 text-purple-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={assignmentStatsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis type="category" dataKey="status" stroke="#6b7280" style={{ fontSize: '12px' }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill={COLORS.purple} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Container Status Pie Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Container Status</h3>
                  <p className="text-sm text-gray-500">Current state</p>
                </div>
                <Container className="h-5 w-5 text-orange-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={containerStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {containerStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => `${value}: ${entry.payload.value}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Users Table */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Users</h3>
                  <p className="text-sm text-gray-600">Users currently online (active in last 10 minutes)</p>
                </div>
                <div className="flex items-center">
                  <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-medium text-gray-700">{liveUsers.length} online</span>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="overflow-x-auto">
                {liveUsers.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {liveUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              user.role_name === 'admin' ? 'bg-red-100 text-red-800' :
                              user.role_name === 'manager' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 rounded-full mr-1 bg-green-400 animate-pulse"></span>
                              Online
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_activity ? (
                              <div>
                                <div>{new Date(user.last_activity).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-xs text-gray-400">{new Date(user.last_activity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Just now</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No Live Users</p>
                    <p className="text-sm text-gray-500">No users are currently online</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
