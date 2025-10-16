// pages/user/courses/[courseId]/modules/[moduleId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import {
  CheckSquare,
  ArrowLeft,
  Search,
  Users,
  User,
  LogOut,
  Clock,
  CheckCircle,
  Play,
  Calendar,
  Lock
} from 'lucide-react';

export default function UserModuleTasksPage() {
  const router = useRouter();
  const { courseId, moduleId } = router.query;
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [module, setModule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [taskStepProgress, setTaskStepProgress] = useState({}); // Track checkbox state for each task

  useEffect(() => {
    if (courseId && moduleId) {
      checkAuth();
      fetchModuleAndTasks();
    }
  }, [courseId, moduleId]);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role === 'admin' || parsedUser.role === 'manager') {
      router.push(`/admin/courses/${courseId}/modules/${moduleId}`);
      return;
    }

    setUser(parsedUser);
  };

  const fetchModuleAndTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/my-courses/${courseId}/modules/${moduleId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCourse(response.data.data.course);
        setModule(response.data.data.module);
        const tasksData = response.data.data.tasks;

        // Sort tasks by title (assuming format: "Week X Day Y")
        const sortedTasks = [...tasksData].sort((a, b) => {
          const extractWeekDay = (title) => {
            const weekMatch = title.match(/Week\s+(\d+)/i);
            const dayMatch = title.match(/Day\s+(\d+)/i);
            return {
              week: weekMatch ? parseInt(weekMatch[1]) : 999,
              day: dayMatch ? parseInt(dayMatch[1]) : 999
            };
          };

          const aData = extractWeekDay(a.title);
          const bData = extractWeekDay(b.title);

          if (aData.week !== bData.week) {
            return aData.week - bData.week;
          }
          return aData.day - bData.day;
        });

        setTasks(sortedTasks);

        // Initialize checkbox state for each task
        const progressState = {};
        sortedTasks.forEach(task => {
          const steps = task.description?.split('\n\n').filter(line => line.trim()) || [];
          progressState[task.id] = steps.map(() => false); // All unchecked initially
        });
        setTaskStepProgress(progressState);
      }
    } catch (error) {
      console.error('Failed to fetch module tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepToggle = (taskId, stepIndex) => {
    setTaskStepProgress(prev => ({
      ...prev,
      [taskId]: prev[taskId].map((checked, idx) =>
        idx === stepIndex ? !checked : checked
      )
    }));
  };

  const areAllStepsComplete = (taskId) => {
    const steps = taskStepProgress[taskId] || [];
    return steps.length > 0 && steps.every(step => step === true);
  };

  // Check if a task is locked (previous task not completed)
  const isTaskLocked = (taskIndex) => {
    if (taskIndex === 0) return false; // First task is never locked

    // Check if all previous tasks are completed
    for (let i = 0; i < taskIndex; i++) {
      if (tasks[i].assignment_status !== 'completed') {
        return true;
      }
    }
    return false;
  };

  const handleStartTask = async (task, taskIndex) => {
    // Check if task is locked
    if (isTaskLocked(taskIndex)) {
      alert('Please complete the previous task first');
      return;
    }

    const taskKey = task.assignment_id || task.id;
    setUpdatingStatus(prev => ({ ...prev, [taskKey]: true }));
    try {
      const token = localStorage.getItem('token');

      // If no assignment_id, we need to create an assignment first
      if (!task.assignment_id) {
        // Create assignment for this task
        const createResponse = await axios.post(
          `/api/my-courses/${courseId}/modules/${moduleId}/tasks/${task.id}/start`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (createResponse.data.success) {
          // Update local state with new assignment data
          setTasks(tasks.map(t =>
            t.id === task.id
              ? { ...t, assignment_id: createResponse.data.data.assignment_id, assignment_status: 'in_progress' }
              : t
          ));
        }
      } else {
        // Update existing assignment
        await axios.patch(
          `/api/my-courses/assignments/${task.assignment_id}/status`,
          { status: 'in_progress' },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local state
        setTasks(tasks.map(t =>
          t.assignment_id === task.assignment_id
            ? { ...t, assignment_status: 'in_progress' }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      alert('Failed to start task: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [taskKey]: false }));
    }
  };

  const handleSubmitTask = async (task) => {
    if (!areAllStepsComplete(task.id)) {
      alert('Please check all boxes before submitting');
      return;
    }

    setUpdatingStatus(prev => ({ ...prev, [task.assignment_id]: true }));
    try {
      const token = localStorage.getItem('token');

      // If task is still 'assigned', first set to 'in_progress', then to 'completed'
      if (task.assignment_status === 'assigned') {
        await axios.patch(
          `/api/my-courses/assignments/${task.assignment_id}/status`,
          { status: 'in_progress' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Now set to completed
      await axios.patch(
        `/api/my-courses/assignments/${task.assignment_id}/status`,
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setTasks(tasks.map(t =>
        t.assignment_id === task.assignment_id
          ? { ...t, assignment_status: 'completed' }
          : t
      ));
    } catch (error) {
      console.error('Failed to submit task:', error);
      alert('Failed to submit task');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [task.assignment_id]: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'blocked': return <Clock className="h-4 w-4" />;
      default: return null; // No icon for assigned status
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
          <Link href={`/user/courses/${courseId}`} className="text-blue-600 hover:underline mt-2 inline-block">
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
        <div className="bg-white shadow">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href={`/user/courses/${courseId}`} className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <div className="text-sm text-gray-500">{course?.title}</div>
                  <div className="font-semibold text-gray-900">{module.title}</div>
                </div>
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

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map((task, taskIndex) => {
                const locked = isTaskLocked(taskIndex);
                return (
                  <div
                    key={task.id}
                    className={`bg-white border rounded-lg transition-all duration-200 flex flex-col ${
                      locked
                        ? 'border-gray-200 opacity-60'
                        : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                    }`}
                  >
                    <div className="p-6 flex flex-col flex-1">
                      {/* Task Title and Status Badge */}
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-3">
                          {task.title}
                        </h3>
                        {!locked && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${getStatusColor(task.assignment_status)}`}>
                            {getStatusIcon(task.assignment_status)}
                            <span className="capitalize">{task.assignment_status?.replace('_', ' ') || 'Not Started'}</span>
                          </span>
                        )}
                        {locked && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>

                      {/* Task Description with Checkboxes */}
                      <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-100 flex-1">
                        <div className="text-xs text-gray-700 leading-relaxed space-y-2">
                          {task.description?.split('\n\n').filter(line => line.trim()).map((line, index) => {
                            const isInProgress = task.assignment_status === 'in_progress';
                            const isCompleted = task.assignment_status === 'completed';
                            const isChecked = taskStepProgress[task.id]?.[index] || false;

                            return (
                              <div key={index} className="flex items-start gap-2">
                                {isInProgress && (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleStepToggle(task.id, index)}
                                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                  />
                                )}
                                {isCompleted && (
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                )}
                                {!isInProgress && !isCompleted && (
                                  <span className="text-gray-400 mt-0.5 flex-shrink-0 text-base leading-none">•</span>
                                )}
                                <span className={`flex-1 ${isChecked ? 'line-through text-gray-400' : ''}`}>
                                  {line.trim()}
                                </span>
                              </div>
                            );
                          }) || <span className="text-gray-400 italic">No description</span>}
                        </div>
                      </div>

                      {/* Due Date */}
                      {task.due_date && (
                        <div className="flex items-center text-xs text-gray-500 mb-4">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}

                      {/* Action Buttons - Fixed height container for alignment */}
                      <div className="mt-auto">
                        <div className="h-[100px] flex flex-col justify-end space-y-3">
                        {/* Locked State */}
                        {locked && (
                          <div className="text-center py-2.5 text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            <Lock className="h-4 w-4 inline mr-1.5" />
                            Complete previous task first
                          </div>
                        )}

                        {/* Start Task Button - Only show for assigned/null status and not locked */}
                        {!locked && (task.assignment_status === 'assigned' || !task.assignment_status) && (
                          <button
                            onClick={() => handleStartTask(task, taskIndex)}
                            disabled={updatingStatus[task.assignment_id || task.id]}
                            className="w-full btn btn-primary btn-sm flex items-center justify-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            {updatingStatus[task.assignment_id || task.id] ? 'Starting...' : 'Start Task'}
                          </button>
                        )}

                        {/* In Progress State */}
                        {!locked && task.assignment_status === 'in_progress' && (
                          <>
                            {/* Progress Indicator */}
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">Progress</span>
                                <span className="text-xs font-semibold text-blue-600">
                                  {taskStepProgress[task.id]?.filter(s => s).length || 0} / {taskStepProgress[task.id]?.length || 0}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${taskStepProgress[task.id]?.length > 0
                                      ? (taskStepProgress[task.id].filter(s => s).length / taskStepProgress[task.id].length) * 100
                                      : 0}%`
                                  }}
                                ></div>
                              </div>
                            </div>

                            {/* Submit Button */}
                            <button
                              onClick={() => handleSubmitTask(task)}
                              disabled={!areAllStepsComplete(task.id) || updatingStatus[task.assignment_id]}
                              className={`w-full btn btn-sm transition-all ${
                                areAllStepsComplete(task.id)
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {updatingStatus[task.assignment_id] ? 'Submitting...' :
                               areAllStepsComplete(task.id) ? 'Submit Task' : 'Check all boxes to submit'}
                            </button>
                          </>
                        )}

                        {/* Completed State */}
                        {task.assignment_status === 'completed' && (
                          <div className="text-center py-2.5 text-sm text-green-600 font-medium bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="h-4 w-4 inline mr-1.5" />
                            Task Completed
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No tasks found' : 'No tasks assigned yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'No tasks have been assigned to you in this module'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
