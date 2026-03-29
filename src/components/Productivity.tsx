import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Circle, Bell, Clock, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface Reminder {
  id: string;
  text: string;
  time: string; // ISO string
  triggered: boolean;
}

interface ProductivityProps {
  onTaskAdded?: () => void;
  onTaskCompleted?: () => void;
  onReminderSet?: () => void;
  onReminderTriggered?: (text: string, soundUrl: string | null) => void;
}

const NOTIFICATION_SOUNDS = [
  { id: 'bell', name: 'Classic Bell', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'chime', name: 'Soft Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  { id: 'digital', name: 'Digital Alert', url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
];

export const Productivity: React.FC<ProductivityProps> = ({
  onTaskAdded,
  onTaskCompleted,
  onReminderSet,
  onReminderTriggered,
}) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('kuro_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('kuro_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('kuro_reminder_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [selectedSound, setSelectedSound] = useState(() => {
    const saved = localStorage.getItem('kuro_reminder_sound_url');
    return saved || NOTIFICATION_SOUNDS[0].url;
  });

  const [taskInput, setTaskInput] = useState('');
  const [reminderText, setReminderText] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'reminders' | 'settings'>('tasks');

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('kuro_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('kuro_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('kuro_reminder_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('kuro_reminder_sound_url', selectedSound);
  }, [selectedSound]);

  // Reminder check interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setReminders(prev => {
        let changed = false;
        const next = prev.map(r => {
          if (!r.triggered && isAfter(now, parseISO(r.time))) {
            changed = true;
            onReminderTriggered?.(r.text, soundEnabled ? selectedSound : null);
            return { ...r, triggered: true };
          }
          return r;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onReminderTriggered, soundEnabled, selectedSound]);

  const addTask = () => {
    if (!taskInput.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: taskInput.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    setTasks([newTask, ...tasks]);
    setTaskInput('');
    onTaskAdded?.();
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (!t.completed) onTaskCompleted?.();
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addReminder = () => {
    if (!reminderText.trim() || !reminderTime) return;
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      text: reminderText.trim(),
      time: new Date(reminderTime).toISOString(),
      triggered: false,
    };
    setReminders([newReminder, ...reminders]);
    setReminderText('');
    setReminderTime('');
    onReminderSet?.();
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b-2 border-black bg-white sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'tasks' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'reminders' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
          }`}
        >
          Reminders
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'settings' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
          }`}
        >
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'tasks' ? (
          <div className="space-y-4">
            {/* Task Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="New task..."
                className="flex-1 p-2 text-sm border-2 border-black rounded-lg shadow-[2px_2px_0_#000] outline-none focus:shadow-[3px_3px_0_#000] transition-all"
              />
              <button
                onClick={addTask}
                className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-lg shadow-[2px_2px_0_#333] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {tasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`group flex items-center gap-2 p-3 border-2 border-black rounded-xl shadow-[2px_2px_0_#000] transition-all ${
                      task.completed ? 'bg-gray-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <button onClick={() => toggleTask(task.id)} className="text-black flex-shrink-0">
                      {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <span className={`flex-1 text-xs font-medium leading-tight ${task.completed ? 'line-through' : ''}`}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {tasks.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-[10px] font-bold uppercase tracking-widest">No tasks yet.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'reminders' ? (
          <div className="space-y-4">
            {/* Reminder Input */}
            <div className="space-y-2 p-3 border-2 border-black rounded-xl shadow-[2px_2px_0_#000]">
              <div className="flex items-center gap-2 text-gray-400">
                <Bell size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Set Reminder</span>
              </div>
              <input
                type="text"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="Remind me to..."
                className="w-full p-1 text-xs border-b border-gray-200 outline-none focus:border-black transition-all"
              />
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="flex-1 p-1 text-[10px] border-2 border-black rounded-md outline-none"
                />
                <button
                  onClick={addReminder}
                  className="px-3 py-1 bg-black text-white rounded-md font-black uppercase text-[9px] tracking-widest shadow-[2px_2px_0_#333] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Reminder List */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {reminders.map(reminder => (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex flex-col gap-1 p-3 border-2 border-black rounded-xl shadow-[2px_2px_0_#000] ${
                      reminder.triggered ? 'bg-gray-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={12} />
                        <span className="text-[9px] font-bold">
                          {format(new Date(reminder.time), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <button onClick={() => deleteReminder(reminder.id)} className="text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {reminder.triggered ? (
                        <AlertCircle size={14} className="text-red-500" />
                      ) : (
                        <Bell size={14} className="text-black" />
                      )}
                      <span className={`text-xs font-medium leading-tight ${reminder.triggered ? 'line-through' : ''}`}>
                        {reminder.text}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {reminders.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-[10px] font-bold uppercase tracking-widest">No reminders set.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notifications</h3>
              <div className="flex items-center justify-between p-3 border-2 border-black rounded-xl shadow-[2px_2px_0_#000] bg-white">
                <div className="flex items-center gap-2">
                  <Bell size={16} />
                  <span className="text-xs font-bold">Reminder Sound</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${soundEnabled ? 'bg-black' : 'bg-gray-200'}`}
                >
                  <motion.div
                    animate={{ x: soundEnabled ? 22 : 2 }}
                    className="absolute top-1 w-3 h-3 bg-white rounded-full"
                  />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sound Choice</h3>
              <div className="space-y-2">
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => {
                      setSelectedSound(sound.url);
                      const audio = new Audio(sound.url);
                      audio.volume = 0.5;
                      audio.play();
                    }}
                    className={`w-full flex items-center justify-between p-3 border-2 border-black rounded-xl shadow-[2px_2px_0_#000] transition-all ${
                      selectedSound === sound.url ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                  >
                    <span className="text-xs font-bold">{sound.name}</span>
                    {selectedSound === sound.url && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
