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
  Server,
  Activity,
  FileText,
  Terminal,
  Container,
  Settings,
  LogOut,
  Bell,
  TrendingUp
} from 'lucide-react';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    my_assignments: 0,
    pending_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
    fetchUserStats();
    fetchRecentTasks();
  }, []);

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

  const fetchRecentTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/tasks/my-tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setRecentTasks(response.data.data.slice(0, 5)); // Get latest 5 tasks
      }
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'blocked': return <Activity className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
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
        {/* Header */}
        <div className="bg-white shadow">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-xl font-bold text-blue-600">
                  ParkarLabs
                </Link>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">Employee Dashboard</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600">
              Here's your personal workspace for managing tasks and accessing lab environments.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">My Assignments</p>
                  <p className="stat-value">{stats.my_assignments}</p>
                  <p className="text-xs text-gray-500 mt-1">Total assigned</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Pending Tasks</p>
                  <p className="stat-value">{stats.pending_tasks}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">In Progress</p>
                  <p className="stat-value">{stats.in_progress_tasks}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently working</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Play className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Completed</p>
                  <p className="stat-value">{stats.completed_tasks}</p>
                  <p className="text-xs text-gray-500 mt-1">Finished tasks</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push('/user/tasks')}
                    className="w-full btn btn-primary btn-md flex items-center justify-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View My Tasks
                  </button>
                  
                  <button 
                    onClick={() => router.push('/user/courses')}
                    className="w-full btn btn-outline btn-md flex items-center justify-center"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    My Courses
                  </button>
                  
                  <button 
                    onClick={() => router.push('/user/containers')}
                    className="w-full btn btn-outline btn-md flex items-center justify-center"
                  >
                    <Container className="h-4 w-4 mr-2" />
                    My Containers
                  </button>
                  
                  <button 
                    onClick={() => router.push('/user/profile')}
                    className="w-full btn btn-ghost btn-md flex items-center justify-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </button>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="card p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="text-sm font-medium">
                      {stats.my_assignments > 0 
                        ? Math.round((stats.completed_tasks / stats.my_assignments) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{
                        width: `${stats.my_assignments > 0 
                          ? (stats.completed_tasks / stats.my_assignments) * 100 
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-600">Active Tasks</span>
                    <span className="text-sm font-medium">{stats.in_progress_tasks}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="lg:col-span-2">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
                  <Link 
                    href="/user/tasks"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all tasks →
                  </Link>
                </div>

                {recentTasks.length > 0 ? (
                  <div className="space-y-4">
                    {recentTasks.map((task) => (
                      <div key={task.assignment_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {task.assigned_by_name}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.assigned_at).toLocaleDateString()}
                            </span>
                            {task.course_title && (
                              <span className="flex items-center">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {task.course_title}
                              </span>
                            )}
                          </div>
                          
                          {task.status === 'assigned' && (
                            <button 
                              onClick={() => router.push('/user/tasks')}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Start Task →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No tasks assigned yet</p>
                    <p className="text-sm text-gray-500">Check back later for new assignments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
