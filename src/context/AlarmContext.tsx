/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

// Interface for task type
interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'open' | 'closed' | 'completed';
  subtasks?: SubTask[];
}

// Interface for subtask type
interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

// Define the shape of our alarm context
interface AlarmContextType {
  activeAlarms: Set<string>;
  alarmsMuted: boolean;
  alarmPlaying: boolean;
  toggleMute: () => void;
  stopAlarm: () => void;
  isDueSoon: (dueDate: string) => boolean;
  checkDueTasks: () => void;
}

// Create the context with default values
const AlarmContext = createContext<AlarmContextType>({
  activeAlarms: new Set(),
  alarmsMuted: false,
  alarmPlaying: false,
  toggleMute: () => {},
  stopAlarm: () => {},
  isDueSoon: () => false,
  checkDueTasks: () => {},
});

// Custom hook to use the alarm context
export const useAlarm = () => useContext(AlarmContext);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeAlarms, setActiveAlarms] = useState<Set<string>>(new Set());
  const [lastAlarmCheck, setLastAlarmCheck] = useState<Date>(new Date());
  const [alarmsMuted, setAlarmsMuted] = useState<boolean>(false);
  const [alarmPlaying, setAlarmPlaying] = useState<boolean>(false);
  const [alarmSound, setAlarmSound] = useState<HTMLAudioElement | null>(null);

  // Initialize the alarm sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sound = new Audio('/sounds/alarm.mp3');
      sound.volume = 0.7;
      sound.loop = true;
      setAlarmSound(sound);
    }

    return () => {
      if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
      }
    };
  }, []);

  // Load tasks from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('status', '==', 'open')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        const taskData = doc.data();
        taskList.push({
          id: doc.id,
          title: taskData.title,
          dueDate: taskData.dueDate,
          status: taskData.status,
          subtasks: taskData.subtasks || [],
        });
      });
      setTasks(taskList);
    });

    return () => unsubscribe();
  }, [user]);

  // Function to check if a date is due soon (within 1 minute or already overdue but less than 5 minutes)
  const isDueSoon = (dueDate: string): boolean => {
    try {
      const now = new Date();
      const due = new Date(dueDate);
      const timeDiff = due.getTime() - now.getTime();
      return timeDiff <= 60000 && timeDiff > -300000;
    } catch (error) {
      console.error('Error checking due date:', error);
      return false;
    }
  };

  // Stop the alarm sound
  const stopAlarm = () => {
    if (alarmSound && alarmPlaying) {
      alarmSound.pause();
      alarmSound.currentTime = 0;
      setAlarmPlaying(false);
    }
  };

  // Toggle alarm mute state
  const toggleMute = () => {
    setAlarmsMuted(!alarmsMuted);
  };

  // Function to check for due tasks
  const checkDueTasks = () => {
    if (!tasks.length) return;
    
    const now = new Date();
    const newActiveAlarms = new Set<string>();
    
    // Only check if at least 10 seconds have passed since last check
    if (now.getTime() - lastAlarmCheck.getTime() < 10000) return;
    
    // Update last check time
    setLastAlarmCheck(now);
    
    // Keep track of whether we found any new alarms to trigger
    let shouldPlayAlarm = false;
    
    // Check all tasks and their subtasks
    tasks.forEach(task => {
      // Only check open tasks
      if (task.status !== 'open') return;
      
      // Check task due date
      if (isDueSoon(task.dueDate)) {
        const taskKey = `task_${task.id}`;
        if (!activeAlarms.has(taskKey)) {
          shouldPlayAlarm = true;
          
          // Show notification if browser supports it
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Due Soon!', {
              body: `Task "${task.title}" is due now!`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              silent: false
            });
          }
        }
        newActiveAlarms.add(taskKey);
      }
      
      // Check subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          // Only check uncompleted subtasks with due dates
          if (!subtask.completed && subtask.dueDate && isDueSoon(subtask.dueDate)) {
            const subtaskKey = `${task.id}_${subtask.id}`;
            
            // Only trigger for new alarms not already active
            if (!activeAlarms.has(subtaskKey)) {
              shouldPlayAlarm = true;
              
              // Show notification if browser supports it
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Subtask Due Soon!', {
                  body: `Subtask "${subtask.title}" from task "${task.title}" is due now!`,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  silent: false
                });
              }
            }
            
            newActiveAlarms.add(subtaskKey);
          }
        });
      }
    });
    
    // Play alarm if we found new due tasks and alarms are not muted
    if (shouldPlayAlarm && alarmSound && !alarmsMuted && !alarmPlaying) {
      alarmSound.currentTime = 0;
      alarmSound.play().catch(error => console.error('Error playing alarm sound:', error));
      setAlarmPlaying(true);
    } else if (newActiveAlarms.size === 0 && alarmPlaying) {
      // If there are no more active alarms, stop any playing alarm
      stopAlarm();
    }
    
    // Update active alarms
    setActiveAlarms(newActiveAlarms);
  };

  // Effect to handle alarm sound when mute status changes
  useEffect(() => {
    if (alarmsMuted && alarmPlaying) {
      stopAlarm();
    } else if (!alarmsMuted && activeAlarms.size > 0 && !alarmPlaying && alarmSound) {
      alarmSound.currentTime = 0;
      alarmSound.play().catch(error => console.error('Error playing alarm sound:', error));
      setAlarmPlaying(true);
    }
  }, [alarmsMuted]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Set up interval to check for due tasks
  useEffect(() => {
    const timer = setInterval(checkDueTasks, 30000); // Check every 30 seconds
    return () => clearInterval(timer);
  }, [tasks, activeAlarms]);

  // Check for due tasks whenever tasks change
  useEffect(() => {
    if (tasks.length) {
      checkDueTasks();
    }
  }, [tasks]);

  return (
    <AlarmContext.Provider 
      value={{ 
        activeAlarms, 
        alarmsMuted,
        alarmPlaying,
        toggleMute,
        stopAlarm,
        isDueSoon,
        checkDueTasks
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
} 