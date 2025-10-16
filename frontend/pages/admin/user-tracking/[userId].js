// pages/admin/user-tracking/[userId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import {
  Users,
  BookOpen,
  Activity,
  CheckCircle,
  Clock,
  LogOut,
  ClipboardList,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Award,
  Target,
  Server
} from 'lucide-react';

export default function UserTrackingDetail() {
  const router = useRouter();
  const { userId } = router.query;
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

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

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch user summary and detailed breakdown
      const [summaryResponse, detailsResponse] = await Promise.all([
        axios.get('/api/admin/user-course-tracking', { headers }),
        axios.get(`/api/admin/user-course-tracking/${userId}`, { headers })
      ]);

      if (summaryResponse.data.success) {
        const userSummary = summaryResponse.data.data.find(u => u.user_id === parseInt(userId));
        setUserInfo(userSummary);
      }

      if (detailsResponse.data.success) {
        setUserDetails(detailsResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!userInfo || !userDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">User not found</p>
          <Link href="/admin/dashboard" className="btn btn-primary btn-sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalAssignments = parseInt(userInfo.total_courses_assigned) + parseInt(userInfo.total_modules_assigned);
  const completionRate = parseFloat(userInfo.completion_rate_percentage) || 0;
  const avgTime = userInfo.avg_completion_time_hours ? parseFloat(userInfo.avg_completion_time_hours).toFixed(1) : 'N/A';

  return (
    <>
      <Head>
        <title>User Tracking - {userInfo.user_name} - ParkarLabs</title>
        <meta name="description" content="User course tracking details" />
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
                  <p className="text-sm text-gray-500">User Tracking Details</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
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
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/admin/dashboard" className="btn btn-ghost btn-sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </div>

          {/* User Header Card */}
          <div className="card mb-8">
            <div className="card-content">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {userInfo.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{userInfo.user_name}</h2>
                    <p className="text-gray-600">{userInfo.user_email}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Joined: {new Date(userInfo.user_joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {userInfo.user_role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalAssignments}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {userInfo.total_courses_assigned} courses, {userInfo.total_modules_assigned} modules
                  </p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{userInfo.total_tasks_completed}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    of {userInfo.total_tasks_assigned} total tasks
                  </p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{completionRate.toFixed(1)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        completionRate >= 75 ? 'bg-green-500' :
                        completionRate >= 50 ? 'bg-blue-500' :
                        completionRate >= 25 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(completionRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {avgTime !== 'N/A' ? `${avgTime}h` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">per task</p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Status Overview */}
          <div className="card mb-8">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Task Status Overview</h3>
              <p className="text-sm text-gray-600">Current task distribution</p>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-10 w-10 text-green-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold text-green-900">{userInfo.total_tasks_completed}</p>
                    <p className="text-sm text-green-700">Completed Tasks</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-10 w-10 text-blue-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{userInfo.total_tasks_in_progress}</p>
                    <p className="text-sm text-blue-700">In Progress</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-amber-50 rounded-lg">
                  <Activity className="h-10 w-10 text-amber-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold text-amber-900">{userInfo.total_tasks_pending}</p>
                    <p className="text-sm text-amber-700">Pending Tasks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Courses */}
          {userDetails.courses && userDetails.courses.length > 0 && (
            <div className="card mb-8">
              <div className="card-header">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Assigned Courses</h3>
                </div>
                <p className="text-sm text-gray-600">Detailed course progress and breakdown</p>
              </div>
              <div className="card-content">
                <div className="space-y-6">
                  {userDetails.courses.map((course) => (
                    <div key={course.course_id} className="border border-gray-200 rounded-lg p-6 bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{course.course_title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Assigned: {new Date(course.assigned_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {course.total_tasks > 0 ? ((course.completed_tasks / course.total_tasks) * 100).toFixed(0) : 0}% Complete
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                          <Activity className="h-8 w-8 text-purple-600 mr-3" />
                          <div>
                            <p className="text-lg font-bold text-purple-900">{course.completed_modules}/{course.total_modules}</p>
                            <p className="text-xs text-purple-700">Modules Completed</p>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-lg font-bold text-green-900">{course.completed_tasks}</p>
                            <p className="text-xs text-green-700">Tasks Completed</p>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <Clock className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-lg font-bold text-blue-900">{course.in_progress_tasks}</p>
                            <p className="text-xs text-blue-700">In Progress</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Overall Progress</span>
                          <span className="font-medium text-gray-900">
                            {course.completed_tasks}/{course.total_tasks} tasks
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
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
            </div>
          )}

          {/* Module Progress */}
          {userDetails.modules && userDetails.modules.length > 0 && (
            <div className="card mb-8">
              <div className="card-header">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Module Progress</h3>
                </div>
                <p className="text-sm text-gray-600">Task completion status for each module</p>
              </div>
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userDetails.modules.map((module) => (
                    <div key={module.module_id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <h5 className="text-base font-semibold text-gray-900">{module.module_title}</h5>
                        <p className="text-sm text-gray-500">{module.course_title}</p>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-1.5" />
                            <span className="text-gray-600">Completed</span>
                          </div>
                          <span className="font-semibold text-green-700">{module.completed_tasks}/{module.total_tasks}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-blue-600 mr-1.5" />
                            <span className="text-gray-600">In Progress</span>
                          </div>
                          <span className="font-semibold text-blue-700">{module.in_progress_tasks}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 text-amber-600 mr-1.5" />
                            <span className="text-gray-600">Pending</span>
                          </div>
                          <span className="font-semibold text-amber-700">
                            {module.total_tasks - module.completed_tasks - module.in_progress_tasks}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              module.total_tasks > 0 && (module.completed_tasks / module.total_tasks) * 100 >= 75 ? 'bg-green-500' :
                              module.total_tasks > 0 && (module.completed_tasks / module.total_tasks) * 100 >= 50 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${module.total_tasks > 0 ? (module.completed_tasks / module.total_tasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                        {module.first_task_started && (
                          <p className="text-xs text-gray-500">
                            Started: {new Date(module.first_task_started).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* All Tasks Table */}
          {userDetails.tasks && userDetails.tasks.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center">
                  <ClipboardList className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">All Tasks</h3>
                </div>
                <p className="text-sm text-gray-600">Complete task history and status</p>
              </div>
              <div className="card-content">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Taken
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userDetails.tasks.map((task) => (
                        <tr key={task.task_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{task.task_title}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{task.module_title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{task.course_title}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                              task.task_status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.task_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.task_status === 'assigned' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.task_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.assigned_at ? new Date(task.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.started_at ? new Date(task.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.completion_time_hours ? `${parseFloat(task.completion_time_hours).toFixed(1)}h` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
