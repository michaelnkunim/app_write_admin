'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { useAdminApp } from '@/context/AdminAppContext';
import { useAlarm } from '@/context/AlarmContext';
import { 
  Calendar, 
  CheckCircle, 
  X, 
  Edit, 
  Trash, 
  User, 
  Clock, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  ChevronLeft, 
  MoveRight, 
  Loader2, 
  RefreshCw,
  ClipboardList,
  Plus,
  AlertTriangle
} from 'lucide-react';

// Add Comment interface
interface Comment {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  createdByPhotoURL?: string;
  likes?: string[]; // Array of user IDs who liked the comment
}

// Update SubTask interface to include comments and dueDate
interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // Optional due date for subtasks
  comments?: Comment[];
  sprintId?: string; // Optional sprint association
}

// Update Task interface to include comments
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'backlog' | 'open' | 'closed' | 'completed' | 'in-progress' | 'paused';
  dueDate: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToPhotoURL?: string;
  appId?: string;
  appName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  subtasks?: SubTask[];
  comments?: Comment[];
  sprintId?: string; // Optional sprint association
}

// Sprint interface
interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  createdAt: string;
  createdBy: string;
  createdByName: string;
  description?: string;
  goal?: string;
}

// User interface
interface UserOption {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export default function TaskTracker() {
  const { user } = useAuth();
  const router = useRouter();
  const { apps } = useAdminApp();
  
  // State variables
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Calendar view state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<boolean>(false);
  const [calendarTasks, setCalendarTasks] = useState<{ [key: string]: Task[] }>({});
  
  // Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: new Date(new Date().setHours(new Date().getHours() + 6)).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    assignedTo: '',
    appId: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Add state for tooltip display and subtasks
  const [tooltipInfo, setTooltipInfo] = useState<{ text: string, x: number, y: number } | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskTime, setNewSubtaskTime] = useState(() => {
    // Set default time to 2 hours from now
    const date = new Date();
    date.setHours(date.getHours() + 2);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const [newSubtaskDate, setNewSubtaskDate] = useState(() => {
    // Set default date to today
    return new Date().toISOString().split('T')[0];
  });
  const [activeTaskForSubtask, setActiveTaskForSubtask] = useState<string | null>(null);
  
  // Add state for comment inputs
  const [newTaskComment, setNewTaskComment] = useState('');
  const [newSubtaskComment, setNewSubtaskComment] = useState('');
  const [activeCommentTask, setActiveCommentTask] = useState<string | null>(null);
  const [activeCommentSubtask, setActiveCommentSubtask] = useState<{taskId: string, subtaskId: string} | null>(null);
  const [collapsedCommentSections, setCollapsedCommentSections] = useState<{[key: string]: boolean}>({});
  
  // Board view state
  const [boardView, setBoardView] = useState<boolean>(false);
  
  // Sprint state
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [activeSprint, setActiveSprint] = useState<string | null>(null);
  const [showSprintAssignModal, setShowSprintAssignModal] = useState(false);
  const [taskForSprintAssign, setTaskForSprintAssign] = useState<string | null>(null);
  const [subtaskForSprintAssign, setSubtaskForSprintAssign] = useState<{taskId: string, subtaskId: string} | null>(null);
  
  // Sprint form state
  const [sprintForm, setSprintForm] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0], // Default 2 weeks
    description: '',
    goal: '',
    status: 'planning'
  });
  
  // User and app options for dropdown
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  
  // Audio for completing tasks
  const [completeSound] = useState(() => {
    if (typeof window === 'undefined') return null;
    
    // Try to use the shorter sound first, fall back to the original if needed
    const sound = new Audio('/sounds/complete.mp3');
    
    // Set volume slightly lower to prevent it from being too loud
    sound.volume = 0.5;
    
    return sound;
  });
  
  // Redirect non-admin users
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
    }
  }, [user, router]);
  
  // Use the AlarmContext instead of local alarm state
  const { 
    activeAlarms, 
    alarmsMuted, 
    alarmPlaying, 
    toggleMute, 
    stopAlarm, 
    checkDueTasks 
  } = useAlarm();
  
  // Helper function to toggle comment section collapse state
  const toggleCommentSectionCollapse = (sectionId: string) => {
    setCollapsedCommentSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Initial data load
  useEffect(() => {
    if (user?.isAdmin) {
      fetchTasks();
      fetchUsers();
      fetchSprints();
    }
  }, [user]);
  
  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, priorityFilter, tasks]);
  
  // Calculate pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  
  // Get days in current month for calendar
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get first day of month for calendar
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Generate calendar data
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    
    // Add empty cells for days before start of month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: 0, date: null });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      calendarDays.push({
        day,
        date,
        dateString,
        tasks: calendarTasks[dateString] || []
      });
    }
    
    return calendarDays;
  };
  
  // Month names for calendar
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Handle month navigation for calendar
  const handlePreviousMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() - 1);
    setSelectedDate(date);
  };
  
  const handleNextMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + 1);
    setSelectedDate(date);
  };
  
  // Add a function to edit subtask due date/time
  const handleEditSubtaskDateTime = async (taskId: string, subtaskId: string, newDateTime: string) => {
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.subtasks) return;
      
      // Create updated subtasks array with the new due date
      const updatedSubtasks = taskToUpdate.subtasks.map(subtask =>
        subtask.id === subtaskId
          ? { ...subtask, dueDate: newDateTime }
          : subtask
      );
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error updating subtask due date:', error);
    }
  };
  
  // Load tasks from Firestore
  const fetchTasks = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const taskRef = collection(db, 'tasks');
      const q = query(taskRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const taskData: Task[] = [];
      for (const docSnapshot of querySnapshot.docs) {
        const task = docSnapshot.data() as Omit<Task, 'id'>;
        
        // Fetch assigned user's name if there's an assignedTo
        let assignedToName = '';
        let assignedToPhotoURL = '';
        if (task.assignedTo) {
          const userDocRef = doc(db, 'users', task.assignedTo);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            assignedToName = userData.displayName || userData.email || '';
            assignedToPhotoURL = userData.photoURL || '';
          }
        }
        
        // Fetch app name if there's an appId
        let appName = '';
        if (task.appId) {
          const appDocRef = doc(db, 'apps', task.appId);
          const appDocSnap = await getDoc(appDocRef);
          if (appDocSnap.exists()) {
            const appData = appDocSnap.data();
            appName = appData.name || '';
          }
        }
        
        taskData.push({
          ...task,
          id: docSnapshot.id,
          assignedToName,
          assignedToPhotoURL,
          appName
        } as Task);
      }
      
      setTasks(taskData);
      setFilteredTasks(taskData);
      updateCalendarTasks(taskData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  // Load sprints from Firestore
  const fetchSprints = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const sprintRef = collection(db, 'sprints');
      const q = query(sprintRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const sprintData: Sprint[] = [];
      for (const docSnapshot of querySnapshot.docs) {
        const sprint = docSnapshot.data() as Omit<Sprint, 'id'>;
        
        sprintData.push({
          ...sprint,
          id: docSnapshot.id
        } as Sprint);
      }
      
      setSprints(sprintData);
      
      // Find the active sprint
      const active = sprintData.find(sprint => sprint.status === 'active');
      if (active) {
        setActiveSprint(active.id);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  // Fetch users for dropdown
  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName || doc.data().email || 'Unknown',
        email: doc.data().email || '',
        photoURL: doc.data().photoURL || ''
      }));
      
      setUserOptions(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  // Apply filters
  const applyFilters = () => {
    let filtered = [...tasks];
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.appName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    // Sort tasks to place completed tasks at the bottom
    filtered = filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // For tasks with same completion status, maintain original order (most recent first)
      return 0;
    });
    
    setFilteredTasks(filtered);
    updateCalendarTasks(filtered);
  };
  
  // Update calendar tasks
  const updateCalendarTasks = (taskList: Task[]) => {
    const calendar: { [key: string]: Task[] } = {};
    
    taskList.forEach(task => {
      const dateKey = task.dueDate.split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push(task);
    });
    
    setCalendarTasks(calendar);
  };
  
  // Format due date and time for display
  const formatDueDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  // Handle task creation and updates
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskForm.title.trim()) return;
    
    try {
      // Combine date and time for the dueDate field
      const combinedDueDate = `${taskForm.dueDate}T${taskForm.dueTime}`;
      
      const taskData = {
        ...taskForm,
        dueDate: combinedDueDate,
        createdAt: selectedTask ? selectedTask.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: selectedTask ? selectedTask.createdBy : user?.uid || '',
        createdByName: selectedTask ? selectedTask.createdByName : user?.displayName || user?.email || ''
      };
      
      // Optimistically update the UI first
      if (selectedTask) {
        // Update existing task
        await updateDoc(doc(db, 'tasks', selectedTask.id), taskData);
        
        // Update local state with proper type casting
        const updatedTask: Task = {
          ...selectedTask,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority as 'low' | 'medium' | 'high',
          status: taskData.status as 'backlog' | 'open' | 'closed' | 'completed' | 'in-progress' | 'paused',
          dueDate: taskData.dueDate,
          assignedTo: taskData.assignedTo,
          appId: taskData.appId,
          updatedAt: taskData.updatedAt,
        };
        
        setTasks(prevTasks => 
          prevTasks.map(task => task.id === selectedTask.id ? updatedTask : task)
        );
        setFilteredTasks(prevTasks => 
          prevTasks.map(task => task.id === selectedTask.id ? updatedTask : task)
        );
        updateCalendarTasks(tasks.map(task => task.id === selectedTask.id ? updatedTask : task));
      } else {
        // Create new task - we can't update state here since we don't have the ID yet
        await addDoc(collection(db, 'tasks'), taskData);
      }
      
      // Reset form and close modal
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        assignedTo: '',
        appId: ''
      });
      
      setShowTaskModal(false);
      setSelectedTask(null);
      
      // Refresh tasks without showing loader
      fetchTasks(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };
  
  // Handle task status change
  const handleStatusChange = async (taskId: string, newStatus: 'backlog' | 'open' | 'closed' | 'completed' | 'in-progress' | 'paused') => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      // Play sound if marking as completed
      if (newStatus === 'completed' && completeSound) {
        completeSound.currentTime = 0;
        completeSound.play().catch(error => console.error('Error playing sound:', error));
      }
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
        )
      );
      
      // Refresh calendar tasks
      updateCalendarTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  
  // Handle task deletion
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete));
      
      // Update local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete));
      setFilteredTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete));
      
      // Update calendar tasks
      updateCalendarTasks(tasks.filter(task => task.id !== taskToDelete));
      
      // Close modal
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };
  
  // Handle edit task
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    
    // Split the dueDate into date and time components
    const dueDate = task.dueDate.split('T')[0];
    let dueTime = '00:00:00';
    
    if (task.dueDate.includes('T')) {
      const timePart = task.dueDate.split('T')[1];
      if (timePart) {
        // Extract time from the ISO string or use the full time part
        const timeMatch = timePart.match(/(\d{2}:\d{2}:\d{2})/);
        dueTime = timeMatch ? timeMatch[1] : timePart.substring(0, 8);
      }
    }
    
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: dueDate,
      dueTime: dueTime,
      assignedTo: task.assignedTo || '',
      appId: task.appId || ''
    });
    setShowTaskModal(true);
  };
  
  // Modify the subtask toggle function to work with the AlarmContext
  const handleToggleSubtaskInTask = async (taskId: string, subtaskId: string) => {
    try {
      // Find the task and update the subtask
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.subtasks) return;
      
      // Find the subtask to check if we're marking it as complete
      const subtask = taskToUpdate.subtasks.find(st => st.id === subtaskId);
      if (!subtask) return;
      
      const isMarkingComplete = !subtask.completed;
      
      const updatedSubtasks = taskToUpdate.subtasks.map(subtask =>
        subtask.id === subtaskId
          ? { ...subtask, completed: !subtask.completed }
          : subtask
      );
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Play completion sound if marking as complete
      if (isMarkingComplete && completeSound) {
        completeSound.currentTime = 0;
        completeSound.play().catch(error => console.error('Error playing sound:', error));
      }
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };
  
  // Function to add a subtask to a task
  const handleAddSubtaskToTask = async (taskId: string) => {
    if (!newSubtaskText.trim()) return;
    
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) return;
      
      // Combine date and time for the dueDate field
      const combinedDueDate = `${newSubtaskDate}T${newSubtaskTime}:00`;
      
      // Create the new subtask
      const newSubtask: SubTask = {
        id: Date.now().toString(),
        title: newSubtaskText,
        completed: false,
        dueDate: combinedDueDate,
        comments: []
      };
      
      // Create updated subtasks array
      const updatedSubtasks = taskToUpdate.subtasks ? [...taskToUpdate.subtasks, newSubtask] : [newSubtask];
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
      
      // Reset inputs
      setNewSubtaskText('');
      
      // Reset time to 2 hours from now and date to today
      const date = new Date();
      date.setHours(date.getHours() + 2);
      setNewSubtaskTime(date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      setNewSubtaskDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };
  
  // Function to add a comment to a task
  const handleAddTaskComment = async (taskId: string) => {
    if (!newTaskComment.trim() || !user) return;
    
    try {
      // Find the task
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) return;
      
      // Create new comment
      const newComment: Comment = {
        id: Date.now().toString(),
        text: newTaskComment.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown',
        createdByPhotoURL: user.photoURL || undefined
      };
      
      // Update comments array
      const updatedComments = taskToUpdate.comments ? [...taskToUpdate.comments, newComment] : [newComment];
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Reset the input
      setNewTaskComment('');
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error adding task comment:', error);
    }
  };
  
  // Function to add a comment to a subtask
  const handleAddSubtaskComment = async (taskId: string, subtaskId: string) => {
    if (!newSubtaskComment.trim() || !user) return;
    
    try {
      // Find the task and subtask
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.subtasks) return;
      
      const subtaskIndex = taskToUpdate.subtasks.findIndex(subtask => subtask.id === subtaskId);
      if (subtaskIndex === -1) return;
      
      // Create new comment
      const newComment: Comment = {
        id: Date.now().toString(),
        text: newSubtaskComment.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown',
        createdByPhotoURL: user.photoURL || undefined
      };
      
      // Create updated subtasks array
      const updatedSubtasks = [...taskToUpdate.subtasks];
      
      // Update the specific subtask with the new comment
      const targetSubtask = updatedSubtasks[subtaskIndex];
      const updatedComments = targetSubtask.comments ? [...targetSubtask.comments, newComment] : [newComment];
      updatedSubtasks[subtaskIndex] = {
        ...targetSubtask,
        comments: updatedComments
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Reset the input
      setNewSubtaskComment('');
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error adding subtask comment:', error);
    }
  };
  
  // Function to handle liking a task comment
  const handleLikeComment = async (taskId: string, commentId: string) => {
    if (!user) return;
    
    try {
      // Find the task and comment
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.comments) return;
      
      const commentIndex = taskToUpdate.comments.findIndex(comment => comment.id === commentId);
      if (commentIndex === -1) return;
      
      // Create updated comments array
      const updatedComments = [...taskToUpdate.comments];
      const targetComment = updatedComments[commentIndex];
      
      // Toggle like status
      let updatedLikes = targetComment.likes || [];
      if (updatedLikes.includes(user.uid)) {
        // Unlike if already liked
        updatedLikes = updatedLikes.filter(id => id !== user.uid);
      } else {
        // Like if not already liked
        updatedLikes = [...updatedLikes, user.uid];
      }
      
      // Update the comment with new likes array
      updatedComments[commentIndex] = {
        ...targetComment,
        likes: updatedLikes
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // Function to handle deleting a task comment
  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (!user) return;
    
    try {
      // Find the task
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.comments) return;
      
      // Find the comment to check ownership
      const commentToDelete = taskToUpdate.comments.find(comment => comment.id === commentId);
      if (!commentToDelete) return;
      
      // Only allow deletion by comment owner or admin
      if (commentToDelete.createdBy !== user.uid && !user.isAdmin) {
        console.error('Permission denied: Only the comment owner or admins can delete this comment');
        return;
      }
      
      // Filter out the comment to delete
      const updatedComments = taskToUpdate.comments.filter(comment => comment.id !== commentId);
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, comments: updatedComments, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Function to handle liking a subtask comment
  const handleLikeSubtaskComment = async (taskId: string, subtaskId: string, commentId: string) => {
    if (!user) return;
    
    try {
      // Find the task and subtask
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.subtasks) return;
      
      const subtaskIndex = taskToUpdate.subtasks.findIndex(subtask => subtask.id === subtaskId);
      if (subtaskIndex === -1) return;
      
      const subtask = taskToUpdate.subtasks[subtaskIndex];
      if (!subtask.comments) return;
      
      const commentIndex = subtask.comments.findIndex(comment => comment.id === commentId);
      if (commentIndex === -1) return;
      
      // Create updated subtasks array
      const updatedSubtasks = [...taskToUpdate.subtasks];
      
      // Get the target comment
      const targetComment = subtask.comments[commentIndex];
      
      // Toggle like status
      let updatedLikes = targetComment.likes || [];
      if (updatedLikes.includes(user.uid)) {
        // Unlike if already liked
        updatedLikes = updatedLikes.filter(id => id !== user.uid);
      } else {
        // Like if not already liked
        updatedLikes = [...updatedLikes, user.uid];
      }
      
      // Update the comment with new likes array
      const updatedComments = [...subtask.comments];
      updatedComments[commentIndex] = {
        ...targetComment,
        likes: updatedLikes
      };
      
      // Update the subtask with the modified comments
      updatedSubtasks[subtaskIndex] = {
        ...subtask,
        comments: updatedComments
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error liking subtask comment:', error);
    }
  };

  // Function to handle deleting a subtask comment
  const handleDeleteSubtaskComment = async (taskId: string, subtaskId: string, commentId: string) => {
    if (!user) return;
    
    try {
      // Find the task and subtask
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.subtasks) return;
      
      const subtaskIndex = taskToUpdate.subtasks.findIndex(subtask => subtask.id === subtaskId);
      if (subtaskIndex === -1) return;
      
      const subtask = taskToUpdate.subtasks[subtaskIndex];
      if (!subtask.comments) return;
      
      // Find the comment to check ownership
      const commentToDelete = subtask.comments.find(comment => comment.id === commentId);
      if (!commentToDelete) return;
      
      // Only allow deletion by comment owner or admin
      if (commentToDelete.createdBy !== user.uid && !user.isAdmin) {
        console.error('Permission denied: Only the comment owner or admins can delete this comment');
        return;
      }
      
      // Filter out the comment to delete
      const updatedComments = subtask.comments.filter(comment => comment.id !== commentId);
      
      // Create updated subtasks array
      const updatedSubtasks = [...taskToUpdate.subtasks];
      
      // Update the subtask with the modified comments
      updatedSubtasks[subtaskIndex] = {
        ...subtask,
        comments: updatedComments
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
      ));
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
    } catch (error) {
      console.error('Error deleting subtask comment:', error);
    }
  };

  // Add a new state to track visible datetime editors for subtasks
  const [visibleDatetimeEditors, setVisibleDatetimeEditors] = useState<{[key: string]: boolean}>({});

  // Function to toggle the visibility of a subtask's datetime editor
  const toggleSubtaskDatetimeEditor = (taskId: string, subtaskId: string) => {
    const key = `${taskId}_${subtaskId}`;
    setVisibleDatetimeEditors(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Handle sprint creation and updates
  const handleSubmitSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sprintForm.name.trim()) return;
    
    try {
      const sprintData = {
        ...sprintForm,
        status: sprintForm.status as 'planning' | 'active' | 'completed',
        createdAt: selectedSprint ? selectedSprint.createdAt : new Date().toISOString(),
        createdBy: selectedSprint ? selectedSprint.createdBy : user?.uid || '',
        createdByName: selectedSprint ? selectedSprint.createdByName : user?.displayName || user?.email || ''
      };
      
      if (selectedSprint) {
        // Update existing sprint
        await updateDoc(doc(db, 'sprints', selectedSprint.id), sprintData);
        
        // Update local state
        setSprints(prevSprints => 
          prevSprints.map(sprint => sprint.id === selectedSprint.id ? { ...sprint, ...sprintData, id: selectedSprint.id } : sprint)
        );
      } else {
        // Create new sprint
        const docRef = await addDoc(collection(db, 'sprints'), sprintData);
        
        // Add to local state with the ID
        setSprints(prevSprints => [
          { ...sprintData, id: docRef.id } as Sprint,
          ...prevSprints
        ]);
      }
      
      // Reset form and close modal
      setSprintForm({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
        description: '',
        goal: '',
        status: 'planning'
      });
      
      setShowSprintModal(false);
      setSelectedSprint(null);
      
      // Refresh sprints
      fetchSprints(false);
    } catch (error) {
      console.error('Error saving sprint:', error);
    }
  };
  
  // Handle assigning task to sprint
  const handleAssignTaskToSprint = async (taskId: string, sprintId: string | null) => {
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        sprintId: sprintId,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, sprintId: sprintId === null ? undefined : sprintId, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, sprintId: sprintId === null ? undefined : sprintId, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, sprintId: sprintId === null ? undefined : sprintId, updatedAt: new Date().toISOString() }
          : task
      ));
      
      // Close modal if open
      setShowSprintAssignModal(false);
      setTaskForSprintAssign(null);
    } catch (error) {
      console.error('Error assigning task to sprint:', error);
    }
  };
  
  // Handle assigning subtask to sprint
  const handleAssignSubtaskToSprint = async (taskId: string, subtaskId: string, sprintId: string | null) => {
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate || !taskToUpdate.subtasks) return;
      
      // Create updated subtasks array with the new sprintId
      const updatedSubtasks = taskToUpdate.subtasks.map(subtask =>
        subtask.id === subtaskId
          ? { ...subtask, sprintId: sprintId === null ? undefined : sprintId }
          : subtask
      );
      
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', taskId), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update filtered tasks
      setFilteredTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
            : task
        )
      );
      
      // Update calendar tasks
      updateCalendarTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : task
      ));
      
      // Close modal if open
      setShowSprintAssignModal(false);
      setSubtaskForSprintAssign(null);
    } catch (error) {
      console.error('Error assigning subtask to sprint:', error);
    }
  };
  
  // Handle sprint status change
  const handleSprintStatusChange = async (sprintId: string, newStatus: 'planning' | 'active' | 'completed') => {
    try {
      await updateDoc(doc(db, 'sprints', sprintId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setSprints(prevSprints =>
        prevSprints.map(sprint => {
          if (sprint.id === sprintId) {
            return { ...sprint, status: newStatus };
          } else if (newStatus === 'active' && sprint.status === 'active') {
            // Set other active sprints to completed
            return { ...sprint, status: 'completed' };
          }
          return sprint;
        })
      );
      
      // Update active sprint reference
      if (newStatus === 'active') {
        setActiveSprint(sprintId);
      } else if (newStatus === 'planning' || newStatus === 'completed') {
        if (activeSprint === sprintId) {
          setActiveSprint(null);
        }
      }
    } catch (error) {
      console.error('Error changing sprint status:', error);
    }
  };
  
  // Function to get tasks for a specific status in board view
  const getTasksByStatus = (status: string) => {
    let filteredByStatus = filteredTasks.filter(task => {
      if (status === 'backlog') return task.status === 'backlog';
      if (status === 'open') return task.status === 'open';
      if (status === 'in-progress') return task.status === 'in-progress';
      if (status === 'paused') return task.status === 'paused';
      if (status === 'completed') return task.status === 'completed';
      if (status === 'closed') return task.status === 'closed';
      return false;
    });
    
    // If board view and active sprint is selected, only show tasks for that sprint
    if (boardView && activeSprint) {
      filteredByStatus = filteredByStatus.filter(task => task.sprintId === activeSprint);
    }
    
    return filteredByStatus;
  };
  
  // Set active task for adding subtasks and reset time to 2 hours from now
  const setActiveTaskForSubtaskWithReset = (taskId: string | null) => {
    // Reset subtask time to 2 hours from now and date to today
    if (taskId !== null) {
      const date = new Date();
      date.setHours(date.getHours() + 2);
      setNewSubtaskTime(date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      setNewSubtaskDate(new Date().toISOString().split('T')[0]);
    }
    
    setActiveTaskForSubtask(taskId);
  };
  
  return (
    <div className=" mx-1 px-2 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">Task Tracker</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* <button
            onClick={() => setCalendarView(!calendarView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              calendarView 
                ? 'bg-primary text-primary-foreground' 
                : 'border border-input hover:bg-accent'
            }`}
            aria-label={calendarView ? 'Switch to list view' : 'Switch to calendar view'}
            title={calendarView ? 'Switch to list view' : 'Switch to calendar view'}
          >
            <Calendar size={18} />
            <span>Calendar</span>
          </button> */}
          {/* <button
            onClick={() => setBoardView(!boardView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              boardView 
                ? 'bg-primary text-primary-foreground' 
                : 'border border-input hover:bg-accent'
            }`}
            aria-label={boardView ? 'Switch to list view' : 'Switch to board view'}
            title={boardView ? 'Switch to list view' : 'Switch to board view'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>Board</span>
          </button> */}
          
          {/* View Toggle Buttons */}
          <div className="inline-flex rounded-md shadow-sm border" role="group">
            <button
              onClick={() => {
                setCalendarView(true);
                setBoardView(false);
              }}
              className={`p-2 ${
                calendarView 
                  ? 'bg-primary text-primary-foreground' 
                  : 'background text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Calendar View"
              aria-label="Calendar View"
            >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
            <button
              onClick={() => {
                setCalendarView(false);
                setBoardView(true);
              }}
              className={`p-2 ${
                boardView 
                  ? 'bg-primary text-primary-foreground' 
                  : 'background text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Board View"
              aria-label="Board View"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            </button>
            <button
              onClick={() => {
                setCalendarView(false);
                setBoardView(false);
              }}
              className={`p-2 ${
                !calendarView && !boardView 
                  ? 'bg-primary text-primary-foreground' 
                  : 'background text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => {
              setSelectedTask(null);
              setTaskForm({
                title: '',
                description: '',
                priority: 'medium',
                status: 'open',
                dueDate: new Date().toISOString().split('T')[0],
                dueTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                assignedTo: '',
                appId: ''
              });
              setShowTaskModal(true);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            title="Create new task"
          >
            <Plus size={18} />
            <span>New Task</span>
          </button>
        </div>
      </div>
      
      {/* Sprint Management */}
      <div className="flex justify-between items-center mb-4 bg-accent/10 p-3 rounded-md">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="m8 13 2.5 2.5L16 10"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <h2 className="text-lg font-medium">Sprint Management</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Sprint dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="activeSprint" className="text-sm whitespace-nowrap">Active Sprint:</label>
            <select
              id="activeSprint"
              value={activeSprint || ''}
              onChange={(e) => setActiveSprint(e.target.value || null)}
              className="px-2 py-1 border rounded-md text-sm min-w-[160px]"
            >
              <option value="">No Active Sprint</option>
              {sprints
                .filter(sprint => sprint.status !== 'completed')
                .map(sprint => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
            </select>
          </div>
          
          {/* Button to manage selected sprint */}
          {activeSprint && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const sprint = sprints.find(s => s.id === activeSprint);
                  if (sprint) {
                    handleSprintStatusChange(
                      sprint.id, 
                      sprint.status === 'planning' ? 'active' : 'completed'
                    );
                  }
                }}
                className="px-2 py-1 text-sm border rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                title={`${sprints.find(s => s.id === activeSprint)?.status === 'planning' ? 'Start' : 'Complete'} this sprint`}
              >
                {sprints.find(s => s.id === activeSprint)?.status === 'planning' ? 'Start Sprint' : 'Complete Sprint'}
              </button>
            </div>
          )}
          
          {/* New Sprint button */}
          <button
            onClick={() => {
              setSelectedSprint(null);
              setSprintForm({
                name: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
                description: '',
                goal: '',
                status: 'planning'
              });
              setShowSprintModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded-md hover:bg-green-100"
            title="Create new sprint"
          >
            <Plus size={16} />
            <span>New Sprint</span>
          </button>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm p- mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 p-4">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" title="Search">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
              title="Toggle filter options"
            >
              <Filter size={18} />
              <span>Filters</span>
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => fetchTasks(true)}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
              aria-label="Refresh tasks"
              title="Refresh tasks"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={checkDueTasks}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors dark:border-gray-700"
              aria-label="Check for due tasks"
              title="Check for due tasks/subtasks and sound alarms if needed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </button>
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors dark:border-gray-700 ${
                alarmsMuted ? 'bg-red-100 dark:bg-red-900 dark:text-white' : ''
              }`}
              aria-label={alarmsMuted ? "Unmute alarms" : "Mute alarms"}
              title={alarmsMuted ? "Unmute task alarms" : "Mute task alarms"}
            >
              {alarmsMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              )}
              {activeAlarms.size > 0 && (
                <span className={`ml-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs ${!alarmsMuted ? 'animate-pulse' : ''}`}>
                  {activeAlarms.size}
                </span>
              )}
            </button>
            {alarmPlaying && (
              <button
                onClick={stopAlarm}
                className="flex items-center gap-2 px-4 py-2 border rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors animate-pulse dark:border-red-700"
                aria-label="Stop alarm"
                title="Stop the currently playing alarm sound"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                </svg>
                <span>Stop Alarm</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-md bg-accent/10">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="backlog">Backlog</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priorityFilter" className="block text-sm font-medium mb-1">
                Priority
              </label>
              <select
                id="priorityFilter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {calendarView ? (
              <div>
                {/* Calendar view */}
                <div className="mb-4 flex justify-between items-center">
                  <button
                    onClick={handlePreviousMonth}
                    className="flex items-center gap-1 px-3 py-1 border rounded-md hover:bg-accent transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                  <h2 className="text-xl font-semibold">
                    {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </h2>
                  <button
                    onClick={handleNextMonth}
                    className="flex items-center gap-1 px-3 py-1 border rounded-md hover:bg-accent transition-colors"
                    title="Next month"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <div key={index} className="text-center font-medium py-2 text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`border rounded-md min-h-[100px] p-2 ${
                        !day.day ? 'bg-muted/30' : 
                        day.dateString === new Date().toISOString().split('T')[0] ? 'bg-green-100' : ''
                      }`}
                    >
                      {day.day > 0 && (
                        <>
                          <div className="text-right text-sm font-medium mb-1">
                            {day.day}
                          </div>
                          <div className="space-y-1 overflow-y-auto max-h-[80px]">
                            {day.tasks && day.tasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleEditTask(task)}
                                className={`text-xs p-1 rounded cursor-pointer truncate ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                } ${
                                  task.status === 'completed' ? 'line-through opacity-70' :
                                  task.status === 'closed' ? 'opacity-70' : ''
                                }`}
                                title={task.title}
                              >
                                <div className="flex items-start gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(
                                        task.id, 
                                        task.status === 'completed' ? 'open' : 'completed'
                                      );
                                    }}
                                    className={`mt-0.5 shrink-0 ${task.status === 'completed' ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}
                                    title={task.status === 'completed' ? "Mark as open" : "Mark as completed"}
                                  >
                                    {task.status === 'completed' ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                      </svg>
                                    )}
                                  </button>
                                  <div>
                                    <div className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                                      {task.title}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {/* Task status indicators */}
                                      {task.status === 'in-progress' && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 flex items-center animate-pulse">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                                          In Progress
                                        </span>
                                      )}
                                      {task.status === 'paused' && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                            <rect x="6" y="4" width="4" height="16"></rect>
                                            <rect x="14" y="4" width="4" height="16"></rect>
                                          </svg>
                                          Paused
                                        </span>
                                      )}
                                      
                                      {/* Badge indicators */}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full h-3.5 w-3.5 text-[7px] font-medium" title={`${task.subtasks.length} subtask${task.subtasks.length > 1 ? 's' : ''}`}>
                                          {task.subtasks.length}
                                        </span>
                                      )}
                                      {task.comments && task.comments.length > 0 && (
                                        <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 rounded-full h-3.5 w-3.5 text-[7px] font-medium" title={`${task.comments.length} comment${task.comments.length > 1 ? 's' : ''}`}>
                                          {task.comments.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div 
                            className="mt-1 text-center"
                            onClick={() => {
                              // Only allow clicking for current and future dates
                              if (day.dateString && new Date(day.dateString) >= new Date(new Date().setHours(0, 0, 0, 0))) {
                                setSelectedTask(null);
                                setTaskForm({
                                  title: '',
                                  description: '',
                                  priority: 'medium',
                                  status: 'open',
                                  dueDate: day.dateString || new Date().toISOString().split('T')[0],
                                  dueTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                  assignedTo: '',
                                  appId: ''
                                });
                                setShowTaskModal(true);
                              }
                            }}
                          >
                            <button 
                              className={`text-xs inline-flex items-center justify-center w-full h-5 ${
                                day.dateString && new Date(day.dateString) >= new Date(new Date().setHours(0, 0, 0, 0))
                                ? "text-primary hover:text-primary/80 transition-colors"
                                : "text-gray-300 cursor-not-allowed"
                              }`}
                              title={
                                day.dateString && new Date(day.dateString) >= new Date(new Date().setHours(0, 0, 0, 0))
                                ? `Create task for ${day.dateString}`
                                : "Cannot create tasks for past dates"
                              }
                              disabled={!day.dateString || new Date(day.dateString) < new Date(new Date().setHours(0, 0, 0, 0))}
                            >
                              <Plus size={12} />
                              <span className="ml-1">Add</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : boardView ? (
              <div>
                {/* Board view */}
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">
                    {activeSprint ? 
                      `Sprint Board: ${sprints.find(s => s.id === activeSprint)?.name}` : 
                      'Task Board'
                    }
                  </h2>
                  {activeSprint && (
                    <div className="text-sm text-muted-foreground">
                      {sprints.find(s => s.id === activeSprint)?.startDate} - {sprints.find(s => s.id === activeSprint)?.endDate}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
                  {/* Backlog column */}
                  <div 
                    className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-all h-full"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-muted/50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-muted/50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-muted/50');
                      const taskId = e.dataTransfer.getData('taskId');
                      const currentStatus = e.dataTransfer.getData('status');
                      if (currentStatus !== 'backlog') {
                        handleStatusChange(taskId, 'backlog');
                      }
                    }}
                  >
                    <div className="p-3 border-b bg-muted/30 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Backlog</h3>
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">
                          {getTasksByStatus('backlog').length}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                      {getTasksByStatus('backlog').length > 0 ? getTasksByStatus('backlog').map(task => (
                        <div 
                          key={task.id}
                          className="bg-background p-3 rounded border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                          onClick={() => handleEditTask(task)}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', task.id);
                            e.dataTransfer.setData('status', 'backlog');
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate mr-2">{task.title}</h4>
                            <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="whitespace-nowrap">{new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.assignedToName && (
                              <span className="flex items-center">
                                {task.assignedToPhotoURL ? (
                                  <img src={task.assignedToPhotoURL} alt={task.assignedToName} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                    {task.assignedToName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task.id, 'open');
                              }}
                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                              title="Move to Open"
                            >
                              Move to Open
                            </button>
                            {task.sprintId ? (
                              <div className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 max-w-[45%] truncate flex items-center ml-2">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-1 flex-shrink-0"></span>
                                <span className="truncate">{sprints.find(s => s.id === task.sprintId)?.name || 'Unknown'}</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskForSprintAssign(task.id);
                                  setShowSprintAssignModal(true);
                                }}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 ml-2"
                                title="Assign to sprint"
                              >
                                Add to Sprint
                              </button>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No tasks in backlog
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Open column */}
                  <div 
                    className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-all h-full"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-muted/50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-muted/50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-muted/50');
                      const taskId = e.dataTransfer.getData('taskId');
                      const currentStatus = e.dataTransfer.getData('status');
                      if (currentStatus !== 'open') {
                        handleStatusChange(taskId, 'open');
                      }
                    }}
                  >
                    <div className="p-3 border-b bg-muted/30 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Open</h3>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                          {getTasksByStatus('open').length}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                      {getTasksByStatus('open').length > 0 ? getTasksByStatus('open').map(task => (
                        <div 
                          key={task.id}
                          className="bg-background p-3 rounded border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                          onClick={() => handleEditTask(task)}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', task.id);
                            e.dataTransfer.setData('status', 'open');
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate mr-2">{task.title}</h4>
                            <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="whitespace-nowrap">{new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.assignedToName && (
                              <span className="flex items-center">
                                {task.assignedToPhotoURL ? (
                                  <img src={task.assignedToPhotoURL} alt={task.assignedToName} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                    {task.assignedToName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task.id, 'in-progress');
                              }}
                              className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              title="Start working on this task"
                            >
                              Start
                            </button>
                            {task.sprintId ? (
                              <div className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                                Sprint: {sprints.find(s => s.id === task.sprintId)?.name || 'Unknown'}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskForSprintAssign(task.id);
                                  setShowSprintAssignModal(true);
                                }}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                                title="Assign to sprint"
                              >
                                Add to Sprint
                              </button>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No open tasks
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* In Progress column */}
                  <div 
                    className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-all h-full"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-muted/50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-muted/50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-muted/50');
                      const taskId = e.dataTransfer.getData('taskId');
                      const currentStatus = e.dataTransfer.getData('status');
                      if (currentStatus !== 'in-progress') {
                        handleStatusChange(taskId, 'in-progress');
                      }
                    }}
                  >
                    <div className="p-3 border-b bg-muted/30 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">In Progress</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded">
                          {getTasksByStatus('in-progress').length}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                      {getTasksByStatus('in-progress').length > 0 ? getTasksByStatus('in-progress').map(task => (
                        <div 
                          key={task.id}
                          className="bg-background p-3 rounded border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                          onClick={() => handleEditTask(task)}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', task.id);
                            e.dataTransfer.setData('status', 'in-progress');
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate mr-2">{task.title}</h4>
                            <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="whitespace-nowrap">{new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.assignedToName && (
                              <span className="flex items-center">
                                {task.assignedToPhotoURL ? (
                                  <img src={task.assignedToPhotoURL} alt={task.assignedToName} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                    {task.assignedToName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <div className="space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, 'paused');
                                }}
                                className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
                                title="Pause this task"
                              >
                                Pause
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, 'completed');
                                }}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200"
                                title="Mark task as completed"
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No tasks in progress
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Paused column */}
                  <div 
                    className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-all h-full"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-muted/50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-muted/50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-muted/50');
                      const taskId = e.dataTransfer.getData('taskId');
                      const currentStatus = e.dataTransfer.getData('status');
                      if (currentStatus !== 'paused') {
                        handleStatusChange(taskId, 'paused');
                      }
                    }}
                  >
                    <div className="p-3 border-b bg-muted/30 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Paused</h3>
                        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded">
                          {getTasksByStatus('paused').length}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                      {getTasksByStatus('paused').length > 0 ? getTasksByStatus('paused').map(task => (
                        <div 
                          key={task.id}
                          className="bg-background p-3 rounded border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                          onClick={() => handleEditTask(task)}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', task.id);
                            e.dataTransfer.setData('status', 'paused');
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate mr-2">{task.title}</h4>
                            <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="whitespace-nowrap">{new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.assignedToName && (
                              <span className="flex items-center">
                                {task.assignedToPhotoURL ? (
                                  <img src={task.assignedToPhotoURL} alt={task.assignedToName} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                    {task.assignedToName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task.id, 'in-progress');
                              }}
                              className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              title="Resume working on this task"
                            >
                              Resume
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No paused tasks
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Completed column */}
                  <div 
                    className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-all h-full"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-muted/50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-muted/50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-muted/50');
                      const taskId = e.dataTransfer.getData('taskId');
                      const currentStatus = e.dataTransfer.getData('status');
                      if (currentStatus !== 'completed') {
                        handleStatusChange(taskId, 'completed');
                      }
                    }}
                  >
                    <div className="p-3 border-b bg-muted/30 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Completed</h3>
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                          {getTasksByStatus('completed').length}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                      {getTasksByStatus('completed').length > 0 ? getTasksByStatus('completed').map(task => (
                        <div 
                          key={task.id}
                          className="bg-background p-3 rounded border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing opacity-70"
                          onClick={() => handleEditTask(task)}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', task.id);
                            e.dataTransfer.setData('status', 'completed');
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm line-through truncate mr-2">{task.title}</h4>
                            <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600`}>
                              Completed
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="whitespace-nowrap">{new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.assignedToName && (
                              <span className="flex items-center">
                                {task.assignedToPhotoURL ? (
                                  <img src={task.assignedToPhotoURL} alt={task.assignedToName} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                    {task.assignedToName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task.id, 'open');
                              }}
                              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                              title="Reopen this task"
                            >
                              Reopen
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No completed tasks
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* List view */}
                <div className="overflow-x-auto">
                  {filteredTasks.length > 0 ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left w-6/12">Task</th>
                          <th className="px-0 py-3 text-center w-1/24" title="Subtasks">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                              <line x1="8" y1="6" x2="21" y2="6"></line>
                              <line x1="8" y1="12" x2="21" y2="12"></line>
                              <line x1="8" y1="18" x2="21" y2="18"></line>
                              <line x1="3" y1="6" x2="3.01" y2="6"></line>
                              <line x1="3" y1="12" x2="3.01" y2="12"></line>
                              <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                          </th>
                          <th className="px-2 py-3 text-center w-1/24" title="Comments">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </th>
                          <th className="px-3 py-3 text-left w-1/12">Due Date</th>
                          <th className="px-3 py-3 text-left w-1/12">Priority</th>
                          <th className="px-3 py-3 text-left w-1/12 hidden">Status</th>
                          <th className="px-2 py-3 text-center w-10" title="Assigned To">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          </th>
                          <th className="px-3 py-3 text-left w-1/12">App</th>
                          <th className="px-3 py-3 text-left w-1/12">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTasks.map((task) => {
                          // Determine if task is almost due or overdue
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          const dueDate = new Date(task.dueDate);
                          dueDate.setHours(0, 0, 0, 0);
                          
                          const timeDiff = dueDate.getTime() - today.getTime();
                          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                          
                          let rowClasses = "hover:bg-accent/10";
                          
                          // Only apply warning borders to open tasks
                          if (task.status === 'open') {
                            if (daysDiff < 0) {
                              // Overdue - red border
                              rowClasses = "border-l-4 border-red-500 hover:bg-accent/10";
                            } else if (daysDiff <= 2) {
                              // Almost due (2 days or less) - yellow border
                              rowClasses = "border-l-4 border-yellow-300 hover:bg-accent/10";
                            } else {
                              // On track - green border
                              rowClasses = "border-l-4 border-green-500 hover:bg-accent/10";
                            }
                          }
                          
                          return (
                            <tr key={task.id} className={`${rowClasses} border-b ${task.status === 'completed' ? 'opacity-70' : ''}`}>
                              <td className="px-3 py-2 align-top">
                                <div className="flex flex-col">
                                  <div className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                                    {task.title}
                                  </div>

                                  <div className="flex items-center gap-1 mt-0.5">
                                    {/* Task status indicators */}
                                    {task.status === 'in-progress' && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 flex items-center animate-pulse">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                                        In Progress
                                      </span>
                                    )}
                                    {task.status === 'paused' && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                          <rect x="6" y="4" width="4" height="16"></rect>
                                          <rect x="14" y="4" width="4" height="16"></rect>
                                        </svg>
                                        Paused
                                      </span>
                                    )}
                                    
                                    {task.comments && task.comments.length > 0 && (
                                      <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 rounded-full h-3.5 w-3.5 text-[7px] font-medium" title={`${task.comments.length} comment${task.comments.length > 1 ? 's' : ''}`}>
                                        {task.comments.length}
                                      </span>
                                    )}
                                  </div>

                                  {/* Status change action buttons */}
                                  <div className="flex flex-wrap gap-1 mt-1 w-full">
                                    {task.status === 'open' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(task.id, 'in-progress');
                                        }}
                                        className="text-xs px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:border-emerald-800 w-[25%]"
                                        title="Start working on this task"
                                      >
                                        Start Task
                                      </button>
                                    )}
                                    {task.status === 'in-progress' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(task.id, 'paused');
                                        }}
                                        className="text-xs px-1.5 py-0.5 rounded border border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 dark:border-amber-800 w-[25%]"
                                        title="Pause this task"
                                      >
                                        Pause
                                      </button>
                                    )}
                                    {task.status === 'paused' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(task.id, 'in-progress');
                                        }}
                                        className="text-xs px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:border-emerald-800 w-[25%]"
                                        title="Resume working on this task"
                                      >
                                        Resume
                                      </button>
                                    )}
                                    {(task.status === 'in-progress' || task.status === 'paused') && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(task.id, 'completed');
                                        }}
                                        className="text-xs px-1.5 py-0.5 rounded border border-green-300 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950 dark:border-green-800 w-[25%]"
                                        title="Mark task as completed"
                                      >
                                        Complete
                                      </button>
                                    )}
                                    
                                    {/* Mark done/reopen button with fixed width */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(
                                          task.id, 
                                          task.status === 'completed' ? 'open' : 'completed'
                                        );
                                      }}
                                      className={`flex items-center justify-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                                        task.status === 'completed' 
                                          ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' 
                                          : 'border border-green-300 text-green-700 hover:bg-green-50'
                                      } w-[25%]`}
                                      title={task.status === 'completed' ? "Mark as open" : "Mark as completed"}
                                    >
                                      {task.status === 'completed' ? (
                                        <>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                          </svg>
                                          <span>Reopen</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                          </svg>
                                          <span>Mark Done</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  
                                  {/* Comments section for main task */}
                                  {activeCommentTask === task.id && (
                                    <div className="mt-2 pl-2 border-l-2 border-blue-200">
                                      <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-sm font-medium">Comments</h3>
                                        <button
                                          onClick={() => toggleCommentSectionCollapse(`task_${task.id}`)}
                                          className="text-gray-500 hover:text-primary p-1"
                                          title={collapsedCommentSections[`task_${task.id}`] ? "Expand comments" : "Collapse comments"}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            {collapsedCommentSections[`task_${task.id}`] ? (
                                              <>
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                              </>
                                            ) : (
                                              <>
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                              </>
                                            )}
                                          </svg>
                                        </button>
                                      </div>
                                      
                                      {!collapsedCommentSections[`task_${task.id}`] && (
                                        <>
                                          {/* Show existing comments */}
                                          {task.comments && task.comments.length > 0 && (
                                            <div className="mb-2 space-y-2">
                                              {task.comments.map(comment => (
                                                <div key={comment.id} className="bg-gray-50 p-2 rounded-md">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    {comment.createdByPhotoURL ? (
                                                      <img src={comment.createdByPhotoURL} alt={comment.createdByName} className="w-5 h-5 rounded-full" />
                                                    ) : (
                                                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                                        {comment.createdByName.charAt(0).toUpperCase()}
                                                      </div>
                                                    )}
                                                    <span className="text-xs font-medium">{comment.createdByName}</span>
                                                    <span className="text-xs text-gray-500">
                                                      {new Date(comment.createdAt).toLocaleString()}
                                                    </span>
                                                  </div>
                                                  <p className="text-sm">{comment.text}</p>
                                                  
                                                  {/* Comment actions */}
                                                  <div className="flex items-center gap-2 mt-1">
                                                    <button
                                                      onClick={() => handleLikeComment(task.id, comment.id)}
                                                      className={`flex items-center gap-1 text-xs ${
                                                        comment.likes?.includes(user?.uid || '') 
                                                          ? 'text-blue-600' 
                                                          : 'text-gray-500 hover:text-blue-600'
                                                      }`}
                                                      title={comment.likes?.includes(user?.uid || '') ? "Unlike" : "Like"}
                                                    >
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={comment.likes?.includes(user?.uid || '') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                                      </svg>
                                                      {comment.likes && comment.likes.length > 0 && (
                                                        <span>{comment.likes.length}</span>
                                                      )}
                                                    </button>
                                                    
                                                    {/* Delete button - only visible to comment owner or admin */}
                                                    {(comment.createdBy === user?.uid || user?.isAdmin) && (
                                                      <button
                                                        onClick={() => handleDeleteComment(task.id, comment.id)}
                                                        className="text-xs text-gray-500 hover:text-red-600"
                                                        title="Delete comment"
                                                      >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                          <polyline points="3 6 5 6 21 6"></polyline>
                                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                          <line x1="10" y1="11" x2="10" y2="17"></line>
                                                          <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Add new comment */}
                                          <div className="flex items-center gap-2 my-2">
                                            <input
                                              type="text"
                                              value={newTaskComment}
                                              onChange={(e) => setNewTaskComment(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  handleAddTaskComment(task.id);
                                                }
                                              }}
                                              placeholder="Add comment..."
                                              className="text-sm px-2 py-1 border rounded flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                            <button
                                              onClick={() => handleAddTaskComment(task.id)}
                                              disabled={!newTaskComment.trim()}
                                              className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                                            >
                                              Add
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Subtasks section - only show for active task */}
                                  {activeTaskForSubtask === task.id && (
                                    <div className="mt-2 pl-2 border-l-2 border-gray-200">
                                      {/* Show existing subtasks */}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <div className="mb-2">
                                          {task.subtasks.map((subtask: SubTask) => (
                                            <div key={subtask.id}>
                                              <div className="flex items-center text-sm py-1">
                                                {/* Subtask toggle button */}
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleSubtaskInTask(task.id, subtask.id);
                                                  }}
                                                  className={`mr-2 ${subtask.completed ? 'text-green-500' : 'text-gray-400'}`}
                                                  title={subtask.completed ? "Mark incomplete" : "Mark complete"}
                                                >
                                                  {subtask.completed ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                    </svg>
                                                  ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                      <circle cx="12" cy="12" r="10"></circle>
                                                    </svg>
                                                  )}
                                                </button>
                                                <span className={`flex-grow ${subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                                                  {subtask.title}
                                                  {activeAlarms.has(`${task.id}_${subtask.id}`) && (
                                                    <span className="ml-2 inline-flex items-center animate-pulse">
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                      </svg>
                                                    </span>
                                                  )}
                                                </span>
                                       
                                                <span 
                                                  className={`text-xs cursor-pointer hover:underline ${
                                                    activeAlarms.has(`${task.id}_${subtask.id}`) 
                                                      ? 'text-red-500 dark:text-red-400 font-bold' 
                                                      : visibleDatetimeEditors[`${task.id}_${subtask.id}`]
                                                        ? 'text-blue-500 dark:text-blue-400 font-medium'
                                                        : 'text-gray-500 dark:text-gray-400'
                                                  } mr-2`} 
                                                  title="Click to edit due date and time"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSubtaskDatetimeEditor(task.id, subtask.id);
                                                  }}
                                                >
                                                  {subtask.dueDate ? formatDueDateTime(subtask.dueDate) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" 
                                                      stroke={visibleDatetimeEditors[`${task.id}_${subtask.id}`] ? "currentColor" : "currentColor"} 
                                                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                                      className={`inline-block ${visibleDatetimeEditors[`${task.id}_${subtask.id}`] ? "text-blue-500" : ""}`}
                                                    >
                                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                      <line x1="16" y1="2" x2="16" y2="6"></line>
                                                      <line x1="8" y1="2" x2="8" y2="6"></line>
                                                      <line x1="3" y1="10" x2="21" y2="10"></line>
                                                    </svg>
                                                  )}
                                                </span>
                                              </div>
                                              
                                              {/* Add subtask date/time editor - only shown when toggled */}
                                              {visibleDatetimeEditors[`${task.id}_${subtask.id}`] && (
                                                <div className="ml-8 mb-2 flex items-center gap-2">
                                                  <input
                                                    type="datetime-local"
                                                    value={subtask.dueDate ? subtask.dueDate.substring(0, 16) : ''}
                                                    onChange={(e) => handleEditSubtaskDateTime(task.id, subtask.id, `${e.target.value}:00Z`)}
                                                    className="text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                                    title="Set due date and time for this subtask"
                                                  />
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleSubtaskDatetimeEditor(task.id, subtask.id);
                                                    }}
                                                    className="text-xs border border-gray-300 dark:border-gray-600 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                                                  >
                                                    Done
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Add new subtask inline */}
                                      <div className="flex items-center gap-2 mb-2">
                                        <input
                                          type="text"
                                          value={newSubtaskText}
                                          onChange={(e) => setNewSubtaskText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newSubtaskText.trim()) {
                                              e.preventDefault();
                                              handleAddSubtaskToTask(task.id);
                                            }
                                          }}
                                          placeholder="Add subtask..."
                                          className="text-sm px-2 py-1 border rounded flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <input
                                          type="date"
                                          value={newSubtaskDate}
                                          onChange={(e) => setNewSubtaskDate(e.target.value)}
                                          className="text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <input
                                          type="time"
                                          value={newSubtaskTime}
                                          onChange={(e) => setNewSubtaskTime(e.target.value)}
                                          className="text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <button
                                          onClick={() => handleAddSubtaskToTask(task.id)}
                                          disabled={!newSubtaskText.trim()}
                                          className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-3 align-top text-center">
                                <button 
                                  onClick={() => setActiveTaskForSubtask(activeTaskForSubtask === task.id ? null : task.id)}
                                  className="text-gray-500 hover:text-primary p-1 relative inline-flex"
                                  title={activeTaskForSubtask === task.id ? "Hide subtasks" : "Show subtasks"}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="8" y1="6" x2="21" y2="6"></line>
                                    <line x1="8" y1="12" x2="21" y2="12"></line>
                                    <line x1="8" y1="18" x2="21" y2="18"></line>
                                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                  </svg>
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                      {task.subtasks.length}
                                    </span>
                                  )}
                                </button>
                              </td>
                              <td className="px-2 py-3 align-top text-center">
                                <button 
                                  onClick={() => setActiveCommentTask(activeCommentTask === task.id ? null : task.id)}
                                  className="text-gray-500 hover:text-primary p-1 relative inline-flex"
                                  title={activeCommentTask === task.id ? "Hide comments" : "Show comments"}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                  </svg>
                                  {task.comments && task.comments.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                      {task.comments.length}
                                    </span>
                                  )}
                                </button>
                              </td>
                              <td className="px-3 py-3 align-top">
                                {task.status === 'completed' ? (
                                  <span className="text-gray-500 dark:text-gray-400">{formatDueDateTime(task.dueDate)}</span>
                                ) : (
                                  <span className={daysDiff < 0 ? 'text-red-500 font-medium' : daysDiff <= 2 ? 'text-yellow-600 font-medium' : ''}>{formatDueDateTime(task.dueDate)}</span>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  task.status === 'completed' 
                                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' 
                                    : task.priority === 'high' 
                                      ? 'bg-red-100 text-red-800' 
                                      : task.priority === 'medium' 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top hidden">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  task.status === 'open' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : task.status === 'completed' 
                                      ? 'bg-green-100 text-green-800 opacity-70' 
                                      : task.status === 'in-progress'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : task.status === 'paused'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.status === 'in-progress' 
                                    ? 'In Progress' 
                                    : task.status === 'paused'
                                      ? 'Paused'
                                      : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-2 py-3 relative align-top">
                                {task.assignedTo ? (
                                  <div 
                                    className={`flex items-center justify-center ${task.status === 'completed' ? 'opacity-70' : ''}`}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltipInfo({
                                        text: task.assignedToName || 'Unknown User',
                                        x: rect.left + window.scrollX,
                                        y: rect.bottom + window.scrollY
                                      });
                                    }}
                                    onMouseLeave={() => setTooltipInfo(null)}
                                  >
                                    {task.assignedToPhotoURL ? (
                                      <img 
                                        src={task.assignedToPhotoURL} 
                                        alt={task.assignedToName} 
                                        className={`w-8 h-8 rounded-full object-cover border ${task.status === 'completed' ? 'border-gray-300 dark:border-gray-700' : 'border-primary/20'}`}
                                      />
                                    ) : (
                                      <div 
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                          task.status === 'completed' 
                                            ? 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' 
                                            : 'bg-primary/10 text-primary border-primary/20'
                                        }`}
                                      >
                                        {task.assignedToName?.charAt(0).toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`${task.status === 'completed' ? 'text-gray-400 dark:text-gray-500' : 'text-muted-foreground'}`}>Unassigned</span>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span className={task.status === 'completed' ? 'text-gray-500 dark:text-gray-400' : ''}>
                                  {task.appName || 'General'}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex gap-1">
                                  {task.status === 'open' && (
                                    <>
                                      <button
                                        onClick={() => handleStatusChange(task.id, 'completed')}
                                        className="text-green-500 hover:text-green-700 p-1"
                                        title="Mark as Completed"
                                      >
                                        <CheckCircle size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(task.id, 'closed')}
                                        className="text-gray-500 hover:text-gray-700 p-1"
                                        title="Close Task"
                                      >
                                        <X size={16} />
                                      </button>
                                    </>
                                  )}
                                  {task.status !== 'open' && (
                                    <button
                                      onClick={() => handleStatusChange(task.id, 'open')}
                                      className="text-blue-500 hover:text-blue-700 p-1"
                                      title="Reopen Task"
                                    >
                                      <RefreshCw size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEditTask(task)}
                                    className="text-blue-500 hover:text-blue-700 p-1"
                                    title="Edit Task"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTaskToDelete(task.id);
                                      setShowDeleteModal(true);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Delete Task"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No tasks found. Create your first task by clicking the &quot;New Task&quot; button.
                    </div>
                  )}
                </div>
                
                {filteredTasks.length > 0 && (
                  <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-muted-foreground">
                      Showing {currentTasks.length} of {filteredTasks.length} tasks
                    </p>
                    <div className="flex gap-2">
                      <button
                        className={`flex items-center gap-1 px-3 py-1 border rounded-md transition-colors ${
                          currentPage <= 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage <= 1}
                        title="Previous page"
                      >
                        <ChevronLeft size={16} />
                        <span>Previous</span>
                      </button>
                      <button
                        className={`flex items-center gap-1 px-3 py-1 border rounded-md transition-colors ${
                          currentPage >= totalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage >= totalPages}
                        title="Next page"
                      >
                        <span>Next</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="background rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">
                {selectedTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitTask}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-1">
                    Title*
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    autoFocus
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as 'backlog' | 'open' | 'closed' | 'completed' | 'in-progress' | 'paused' })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
                      Due Date
                    </label>
                    <input
                      id="dueDate"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="dueTime" className="block text-sm font-medium mb-1">
                      Due Time
                    </label>
                    <input
                      id="dueTime"
                      type="time"
                      step="1"
                      value={taskForm.dueTime}
                      onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-medium mb-1">
                    Assigned To
                  </label>
                  <select
                    id="assignedTo"
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Unassigned</option>
                    {userOptions.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="appId" className="block text-sm font-medium mb-1">
                    Related App
                  </label>
                  <select
                    id="appId"
                    value={taskForm.appId}
                    onChange={(e) => setTaskForm({ ...taskForm, appId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">General (No app)</option>
                    {apps.map((app: { id: string, name: string }) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  disabled={!taskForm.title.trim()}
                >
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Delete Task</h3>
            <p className="mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sprint Form Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-card background rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              {selectedSprint ? 'Edit Sprint' : 'Create New Sprint'}
            </h3>
            
            <form onSubmit={handleSubmitSprint}>
              <div className="mb-4">
                <label htmlFor="sprintName" className="block text-sm font-medium mb-1">
                  Sprint Name
                </label>
                <input
                  type="text"
                  id="sprintName"
                  value={sprintForm.name}
                  onChange={(e) => setSprintForm({...sprintForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Sprint 1"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={sprintForm.startDate}
                    onChange={(e) => setSprintForm({...sprintForm, startDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={sprintForm.endDate}
                    min={sprintForm.startDate}
                    onChange={(e) => setSprintForm({...sprintForm, endDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="sprintDescription" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="sprintDescription"
                  value={sprintForm.description}
                  onChange={(e) => setSprintForm({...sprintForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="Sprint description (optional)"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="sprintGoal" className="block text-sm font-medium mb-1">
                  Sprint Goal
                </label>
                <input
                  type="text"
                  id="sprintGoal"
                  value={sprintForm.goal}
                  onChange={(e) => setSprintForm({...sprintForm, goal: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Sprint goal (optional)"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="sprintStatus" className="block text-sm font-medium mb-1">
                  Status
                </label>
                <select
                  id="sprintStatus"
                  value={sprintForm.status}
                  onChange={(e) => setSprintForm({...sprintForm, status: e.target.value as 'planning' | 'active' | 'completed'})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSprintModal(false);
                    setSelectedSprint(null);
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {selectedSprint ? 'Update Sprint' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Sprint Assignment Modal */}
      {showSprintAssignModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              Assign to Sprint
            </h3>
            
            <div className="mb-6">
              <label htmlFor="assignSprint" className="block text-sm font-medium mb-1">
                Select Sprint
              </label>
              <select
                id="assignSprint"
                value={activeSprint || ''}
                onChange={(e) => setActiveSprint(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None (Remove from Sprint)</option>
                {sprints
                  .filter(sprint => sprint.status !== 'completed')
                  .map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSprintAssignModal(false);
                  setTaskForSprintAssign(null);
                  setSubtaskForSprintAssign(null);
                }}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (taskForSprintAssign) {
                    handleAssignTaskToSprint(taskForSprintAssign, activeSprint);
                  } else if (subtaskForSprintAssign) {
                    handleAssignSubtaskToSprint(
                      subtaskForSprintAssign.taskId,
                      subtaskForSprintAssign.subtaskId,
                      activeSprint
                    );
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tooltip */}
      {tooltipInfo && (
        <div
          className="fixed bg-gray-800 text-white text-xs rounded py-1 px-2 z-50 pointer-events-none"
          style={{
            left: `${tooltipInfo.x}px`,
            top: `${tooltipInfo.y + 10}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltipInfo.text}
        </div>
      )}
    </div>
  );
} 
