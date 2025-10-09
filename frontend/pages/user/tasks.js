// pages/user/tasks.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import dynamic from 'next/dynamic';
import {
  CheckCircle,
  Clock,
  Play,
  Calendar,
  BookOpen,
  ChevronRight,
  Search,
  Server,
  User,
  AlertCircle,
  FileText,
  ExternalLink,
  Rocket,
  X
} from 'lucide-react';

// dynamic import for SSR safety
const WebSSH = dynamic(() => import('../../components/WebSSH'), { ssr: false });

export default function UserTasks() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDependencies, setSelectedDependencies] = useState([]);

  const [availableDependencies] = useState([
    { id: 'node', name: 'Node.js', version: '20.x' },
    { id: 'mongodb', name: 'MongoDB', version: '7.0' },
    { id: 'postgresql', name: 'PostgreSQL', version: '16' },
    { id: 'redis', name: 'Redis', version: '7.2' },
    { id: 'nginx', name: 'Nginx', version: 'latest' },
    { id: 'docker', name: 'Docker', version: 'latest' }
  ]);

  const [stats, setStats] = useState({ total: 0, assigned: 0, inProgress: 0, completed: 0 });

  // Launching states & results
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);
  const [sshInfo, setSshInfo] = useState(null); // { containerId, lxcName }

  // read token once per render (defensive for SSR)
  const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;

  useEffect(() => {
    const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
    if (!t) {
      router.push('/auth/login');
      return;
    }
    fetchMyTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
      const response = await axios.get('/api/tasks/my-tasks', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (response.data?.success) {
        setTasks(response.data.data || []);
        calculateStats(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tasksData) => {
    const stats = {
      total: tasksData.length,
      assigned: tasksData.filter(t => t.status === 'assigned').length,
      inProgress: tasksData.filter(t => t.status === 'in_progress').length,
      completed: tasksData.filter(t => t.status === 'completed').length
    };
    setStats(stats);
  };

  const handleLaunchLab = (task) => {
    setSelectedTask(task);
    setSelectedDependencies([]);
    setShowDependencyModal(true);
    setLaunchError(null);
  };

  const launchContainer = async () => {
    try {
      setLaunching(true);
      setLaunchError(null);

      const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
      if (!t) throw new Error('Not authenticated');

      // Generate container name from task title
      const containerName = (selectedTask?.title || 'lab').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);

      const containerData = {
        name: containerName,
        taskId: selectedTask?.task_id,
        assignmentId: selectedTask?.assignment_id,
        image: 'ubuntu:24.04',
        cpu: 2,
        memory: 2048,
        storage: 20480,
        dependencies: selectedDependencies
      };

      const response = await axios.post('/api/containers/launch', containerData, {
        headers: { Authorization: `Bearer ${t}` }
      });

      if (response.data?.success) {
        // IMPORTANT: the frontend should NOT receive sensitive SSH creds.
        // Keep only containerId + friendly name (lxcName) for UI/WS handshake.
        const container = response.data.container || {};
        const containerId = container.id || null;
        const lxcName = container.name || containerId || 'lab-container';

        if (!containerId) {
          // launched but server didn't return container id
          setLaunchError('Launched but server did not return container id.');
          alert('Launch succeeded but response missing container id; please contact admin.');
        } else {
          // set only minimal sshInfo (containerId) - the server will resolve IP and do SSH server-side
          setSshInfo({ containerId, lxcName });
          setShowDependencyModal(false);
          setSelectedTask(null);
          setSelectedDependencies([]);
          // refresh task list to pick up any container metadata
          fetchMyTasks();
        }
      } else {
        const msg = response.data?.message || 'Unknown error';
        setLaunchError(msg);
        alert('Error launching container: ' + msg);
      }
    } catch (error) {
      console.error('Error launching container:', error);
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      setLaunchError(msg);
      alert('Error launching container: ' + msg);
    } finally {
      setLaunching(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (task.title || '').toLowerCase().includes(searchLower) ||
      (task.description || '').toLowerCase().includes(searchLower);
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && task.status === statusFilter;
  });

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
      case 'blocked': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>My Tasks - ParkarLabs</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/user/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 font-medium">My Tasks</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div><p className="stat-label">Total Tasks</p><p className="stat-value">{stats.total}</p></div>
                <div className="p-3 bg-blue-100 rounded-lg"><FileText className="h-6 w-6 text-blue-600" /></div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div><p className="stat-label">Assigned</p><p className="stat-value">{stats.assigned}</p></div>
                <div className="p-3 bg-yellow-100 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div><p className="stat-label">In Progress</p><p className="stat-value">{stats.inProgress}</p></div>
                <div className="p-3 bg-blue-100 rounded-lg"><Play className="h-6 w-6 text-blue-600" /></div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div><p className="stat-label">Completed</p><p className="stat-value">{stats.completed}</p></div>
                <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="card p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Search tasks..." className="input pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-4">
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-6">
            {filteredTasks.map(task => (
              <div key={task.assignment_id} className="card hover:shadow-medium transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1 capitalize">{(task.status || '').replace('_', ' ')}</span>
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">{task.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center"><User className="h-4 w-4 mr-1" />Assigned by: {task.assigned_by_name}</span>
                        <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />Due: {formatDate(task.due_date)}</span>
                        {task.course_title && (
                          <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" />Course: {task.course_title}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">Assigned: {new Date(task.assigned_at).toLocaleDateString()}</span>
                      {task.course_slug && (
                        <Link href={`/user/courses/${task.course_slug}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                          <ExternalLink className="h-4 w-4 mr-1" /> View Course
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleLaunchLab(task)}
                        className="btn btn-primary btn-md inline-flex items-center"
                        disabled={launching}
                        aria-disabled={launching}
                      >
                        <Rocket className="h-4 w-4 mr-2" /> Launch Lab
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
              <p className="text-gray-600">You don't have any tasks assigned yet. Check back later!</p>
            </div>
          )}
        </div>

        {/* Dependency Modal */}
        {showDependencyModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Configure Lab</h3>
                <button onClick={() => { setShowDependencyModal(false); setSelectedTask(null); setSelectedDependencies([]); }} className="p-1 rounded hover:bg-gray-100"><X /></button>
              </div>

              <div className="px-6 py-6">
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Dependencies</label>
                  <div className="grid grid-cols-2 gap-4">
                    {availableDependencies.map((dep) => (
                      <label key={dep.id} className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedDependencies.includes(dep.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDependencies(prev => [...prev, dep.id]);
                            else setSelectedDependencies(prev => prev.filter(id => id !== dep.id));
                          }}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{dep.name}</span>
                          <p className="text-xs text-gray-500">{dep.version}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {launchError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
                    {launchError}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
                <button onClick={() => { setShowDependencyModal(false); setSelectedTask(null); setSelectedDependencies([]); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={launchContainer} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-flex items-center" disabled={launching}>
                  <Server className="h-4 w-4 mr-2" /> {launching ? 'Launching...' : 'Launch Lab'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WebSSH Terminal show/hide area */}
        {sshInfo && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium">Web SSH Terminal</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 mr-2">Container: {sshInfo.lxcName || sshInfo.containerId}</span>
                  <button onClick={() => setSshInfo(null)} className="px-2 py-1 text-sm rounded border">Close</button>
                </div>
              </div>

              {/* pass only containerId + token */}
              <WebSSH containerId={sshInfo.containerId} token={token} height={480} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
