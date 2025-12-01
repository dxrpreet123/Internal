

import React, { useState, useEffect } from 'react';
import { TimeTableDay, ClassSession } from '../types';
import { saveTimetableDay, getTimetable } from '../services/storage';

interface TimetableViewProps {
  onBack: () => void;
  onUpdate: () => void;
}

const DAYS: Array<TimeTableDay['day']> = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableView: React.FC<TimetableViewProps> = ({ onBack, onUpdate }) => {
  const [timetable, setTimetable] = useState<TimeTableDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<TimeTableDay['day']>('Monday');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Class Form State
  const [newClass, setNewClass] = useState<Partial<ClassSession>>({
      startTime: '09:00',
      endTime: '10:00',
      subjectName: '',
      room: ''
  });

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    const data = await getTimetable();
    setTimetable(data);
  };

  const handleDaySelect = (day: TimeTableDay['day']) => setSelectedDay(day);

  const handleAddClass = async () => {
      if (!newClass.subjectName || !newClass.startTime || !newClass.endTime) return;

      const currentDaySchedule = timetable.find(d => d.day === selectedDay) || { day: selectedDay, classes: [] };
      const updatedClasses = [...currentDaySchedule.classes, {
          id: `class-${Date.now()}`,
          subjectName: newClass.subjectName,
          startTime: newClass.startTime,
          endTime: newClass.endTime,
          room: newClass.room,
          color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
      } as ClassSession].sort((a, b) => a.startTime.localeCompare(b.startTime));

      const updatedDay = { ...currentDaySchedule, classes: updatedClasses };
      
      // Optimistic update
      const newTimetable = timetable.filter(d => d.day !== selectedDay);
      newTimetable.push(updatedDay);
      setTimetable(newTimetable);

      await saveTimetableDay(updatedDay);
      setIsAdding(false);
      setNewClass({ startTime: '09:00', endTime: '10:00', subjectName: '', room: '' });
      onUpdate();
  };

  const handleDeleteClass = async (id: string) => {
      const currentDaySchedule = timetable.find(d => d.day === selectedDay);
      if (!currentDaySchedule) return;

      const updatedClasses = currentDaySchedule.classes.filter(c => c.id !== id);
      const updatedDay = { ...currentDaySchedule, classes: updatedClasses };

      const newTimetable = timetable.filter(d => d.day !== selectedDay);
      newTimetable.push(updatedDay);
      setTimetable(newTimetable);

      await saveTimetableDay(updatedDay);
      onUpdate();
  };

  const currentClasses = timetable.find(d => d.day === selectedDay)?.classes || [];

  return (
    <div className="fixed inset-0 bg-[#fafaf9] dark:bg-[#0c0a09] z-50 flex flex-col font-sans transition-colors duration-500">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-stone-900 dark:text-white font-display">Time Table</h1>
            </div>
            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined text-sm">add</span>
                <span className="hidden md:inline">Add Class</span>
            </button>
        </div>

        {/* Days Bar */}
        <div className="flex overflow-x-auto border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shrink-0 no-scrollbar">
            {DAYS.map(day => (
                <button
                    key={day}
                    onClick={() => handleDaySelect(day)}
                    className={`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                        selectedDay === day 
                        ? 'border-orange-600 text-orange-600 bg-white dark:bg-stone-900' 
                        : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-300'
                    }`}
                >
                    {day}
                </button>
            ))}
        </div>

        {/* Schedule List */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-4">
                {currentClasses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                        <span className="material-symbols-rounded text-6xl mb-4 opacity-20">calendar_today</span>
                        <p className="text-sm">No classes scheduled for {selectedDay}.</p>
                    </div>
                ) : (
                    currentClasses.map((cls) => (
                        <div key={cls.id} className="flex gap-4 group">
                            <div className="flex flex-col items-end w-16 pt-1">
                                <span className="text-sm font-bold text-stone-900 dark:text-white">{cls.startTime}</span>
                                <span className="text-xs text-stone-500">{cls.endTime}</span>
                            </div>
                            
                            <div className="relative flex-1 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm transition-all hover:border-orange-300 dark:hover:border-stone-700">
                                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ backgroundColor: cls.color || '#ea580c' }}></div>
                                <div className="pl-3">
                                    <h3 className="font-bold text-stone-900 dark:text-white text-lg">{cls.subjectName}</h3>
                                    {cls.room && (
                                        <div className="flex items-center gap-1 mt-1 text-stone-500">
                                            <span className="material-symbols-outlined text-[10px]">location_on</span>
                                            <span className="text-xs font-medium">{cls.room}</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleDeleteClass(cls.id)}
                                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Add Modal */}
        {isAdding && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                    <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-6 font-display">Add Class to {selectedDay}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Subject</label>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="e.g. Mathematics" 
                                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                value={newClass.subjectName}
                                onChange={e => setNewClass({...newClass, subjectName: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Start</label>
                                <input 
                                    type="time" 
                                    className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                    value={newClass.startTime}
                                    onChange={e => setNewClass({...newClass, startTime: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">End</label>
                                <input 
                                    type="time" 
                                    className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                    value={newClass.endTime}
                                    onChange={e => setNewClass({...newClass, endTime: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Room (Optional)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. 101-B" 
                                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                value={newClass.room}
                                onChange={e => setNewClass({...newClass, room: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="flex-1 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddClass}
                                disabled={!newClass.subjectName}
                                className="flex-1 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-orange-600 dark:hover:bg-orange-500 disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TimetableView;
