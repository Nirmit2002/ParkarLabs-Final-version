// pages/user/dashboard.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  User,
  Calendar,
  Activity,
  FileText,
  Container,
  Settings,
  LogOut,
  ArrowRight,
  Target,
  Award,
  X,
  Bell
} from 'lucide-react';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    my_assignments: 0,
    pending_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    course_assignments: 0,
    module_assignments: 0,
    task_assignments: 0
  });
  const [recentCourses, setRecentCourses] = useState([]);
  const [moduleProgress, setModuleProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role === 'admin' || parsedUser.role === 'manager') {
      router.push('/admin/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchUserProfile();
    fetchUserStats();
    fetchRecentCourses();
    fetchModuleProgress();
    checkForNewAssignments();
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

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/test', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchRecentCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/my-courses', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setRecentCourses(response.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching recent courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/module-progress', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setModuleProgress(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching module progress:', error);
    }
  };

  const checkForNewAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const notificationShown = sessionStorage.getItem('notificationShown');

      // Only check if notification hasn't been shown in this session
      if (notificationShown === 'true') {
        return;
      }

      const now = new Date().getTime();

      // Check for recent task assignments
      const tasksResponse = await axios.get('/api/tasks/my-tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (tasksResponse.data.success && tasksResponse.data.data.length > 0) {
        const latestTask = tasksResponse.data.data[0];
        const taskAssignedTime = new Date(latestTask.assigned_at).getTime();

        // Show notification if task was assigned in the last 1 hour
        if (now - taskAssignedTime < 3600000) {
          setNotificationData({
            type: 'task',
            title: latestTask.title,
            description: latestTask.description,
            assignedBy: latestTask.assigned_by_name,
            courseTitle: latestTask.course_title
          });
          setShowNotification(true);
          sessionStorage.setItem('notificationShown', 'true');
          return;
        }
      }

      // Check for recent course assignments
      const coursesResponse = await axios.get('/api/my-courses', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (coursesResponse.data.success && coursesResponse.data.data.length > 0) {
        const latestCourse = coursesResponse.data.data[0];
        const courseCreatedTime = new Date(latestCourse.created_at).getTime();

        // Show notification if course was assigned in the last 1 hour
        if (now - courseCreatedTime < 3600000) {
          setNotificationData({
            type: 'course',
            title: latestCourse.title,
            description: latestCourse.description
          });
          setShowNotification(true);
          sessionStorage.setItem('notificationShown', 'true');
        }
      }
    } catch (error) {
      console.error('Error checking for new assignments:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastAssignmentCheck');
    sessionStorage.clear();
    router.push('/auth/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'in_progress': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-700 bg-green-50 border-green-200';
      case 'blocked': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return <Clock className="h-3.5 w-3.5" />;
      case 'in_progress': return <Play className="h-3.5 w-3.5" />;
      case 'completed': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'blocked': return <Activity className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  // Calculate total tasks (completed + pending + in progress)
  const totalTasks = stats.completed_tasks + stats.pending_tasks + stats.in_progress_tasks;
  const completionRate = totalTasks > 0
    ? Math.round((stats.completed_tasks / totalTasks) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-10 w-10 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - ParkarLabs</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Notification Popup */}
        {showNotification && notificationData && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className="bg-white rounded-lg shadow-xl border-l-4 border-blue-600 p-5 max-w-md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      New {notificationData.type === 'task' ? 'Task' : 'Course'} Assignment!
                    </h4>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="ml-13">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium text-gray-900">{notificationData.title}</span>
                </p>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {notificationData.description}
                </p>
                {notificationData.assignedBy && (
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    <span>Assigned by {notificationData.assignedBy}</span>
                  </div>
                )}
                {notificationData.courseTitle && (
                  <div className="flex items-center text-xs text-blue-600 mb-3">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    <span>{notificationData.courseTitle}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowNotification(false);
                    router.push(notificationData.type === 'task' ? '/user/tasks' : '/user/courses');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center group"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <img
                  src="/images/parkarlabs-logo.png"
                  alt="ParkarLabs Logo"
                  className="h-8 w-8"
                  style={{ imageRendering: 'pixelated' }}
                />
                <Link href="/" className="text-xl font-bold text-blue-600">
                  ParkarLabs
                </Link>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600 font-medium">Dashboard</span>
              </div>

              <div className="flex items-center space-x-4">
                <div
                  className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => router.push('/user/profile-settings')}
                  title="Go to Profile Settings"
                >
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-gray-600">
              Track your progress and manage your learning journey
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Total Assignments Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.my_assignments}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">Total Assignments</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <Target className="h-3 w-3 mr-1" />
                <span>All time</span>
              </div>
            </div>

            {/* Pending Tasks Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_tasks}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Waiting</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">Pending Tasks</p>
              <div className="mt-2 flex items-center text-xs text-amber-600">
                <Activity className="h-3 w-3 mr-1" />
                <span>Requires action</span>
              </div>
            </div>

            {/* In Progress Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.in_progress_tasks}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Active</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">In Progress</p>
              <div className="mt-2 flex items-center text-xs text-blue-600">
                <Activity className="h-3 w-3 mr-1" />
                <span>Keep going</span>
              </div>
            </div>

            {/* Completed Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.completed_tasks}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Done</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">Completed</p>
              <div className="mt-2 text-xs text-green-600">
                {moduleProgress.length > 0 ? (
                  <div className="space-y-1">
                    {moduleProgress.slice(0, 2).map((module) => (
                      <div key={module.module_id} className="flex items-start">
                        <Award className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">
                          {module.module_title}: {module.completed_tasks} of {module.total_tasks} done
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Award className="h-3 w-3 mr-1" />
                    <span>{stats.completed_tasks} of {totalTasks} tasks done</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 text-blue-600 mr-2" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/user/tasks')}
                  className="w-full group flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="font-medium">View My Tasks</span>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/user/courses')}
                  className="w-full group flex items-center justify-between px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span className="font-medium">My Courses</span>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/user/containers')}
                  className="w-full group flex items-center justify-between px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Container className="h-4 w-4 mr-2" />
                    <span className="font-medium">My Containers</span>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/user/profile-settings')}
                  className="w-full group flex items-center justify-between px-4 py-3 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="font-medium">Profile Settings</span>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Recent Course Assignments */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BookOpen className="h-5 w-5 text-gray-600 mr-2" />
                    Recent Course Assignments
                  </h3>
                  <Link
                    href="/user/courses"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center group"
                  >
                    View all
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {recentCourses.length > 0 ? (
                  <div className="space-y-3">
                    {recentCourses.map((course) => (
                      <div
                        key={course.id}
                        className="group border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => router.push(`/user/courses/${course.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                              {course.title}
                            </h4>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <BookOpen className="h-3.5 w-3.5 mr-1" />
                              Course
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1.5" />
                              Assigned {new Date(course.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {course.module_count > 0 && (
                              <span className="flex items-center text-blue-600">
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                {course.module_count} {course.module_count === 1 ? 'Module' : 'Modules'}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/user/courses/${course.id}`);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center group"
                          >
                            View Course
                            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No courses assigned yet</p>
                    <p className="text-sm text-gray-500">Check back later for new course assignments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
