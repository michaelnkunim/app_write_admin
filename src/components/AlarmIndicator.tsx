'use client';

import React from 'react';
import { useAlarm } from '@/context/AlarmContext';
import { useTheme } from 'next-themes';

export function AlarmIndicator() {
  const { 
    activeAlarms, 
    alarmsMuted, 
    alarmPlaying, 
    toggleMute, 
    stopAlarm, 
    checkDueTasks 
  } = useAlarm();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  if (activeAlarms.size === 0 && !alarmPlaying) {
    return null; // Don't show anything if no alarms
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {alarmPlaying && (
        <button
          onClick={stopAlarm}
          className="flex items-center gap-2 px-4 py-2 border rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors animate-pulse shadow-lg"
          aria-label="Stop alarm"
          title="Stop the currently playing alarm sound"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
          </svg>
          <span>Stop Alarm</span>
        </button>
      )}
      
      <button
        onClick={toggleMute}
        className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors shadow-lg ${
          alarmsMuted 
            ? 'bg-red-100 dark:bg-red-900 dark:text-white' 
            : isDarkTheme
              ? 'background'
              : 'background'
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
        <span className={`ml-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs ${!alarmsMuted ? 'animate-pulse' : ''}`}>
          {activeAlarms.size}
        </span>
      </button>
      
      <button
        onClick={checkDueTasks}
        className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors shadow-lg ${
          isDarkTheme
            ? 'bg-gray-800 text-white border-gray-700'
            : 'bg-white text-gray-800 border-gray-200'
        }`}
        aria-label="Check for due tasks"
        title="Check for due tasks/subtasks and sound alarms if needed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>Check Tasks</span>
      </button>
    </div>
  );
} 