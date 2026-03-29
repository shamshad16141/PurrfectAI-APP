import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Sparkles, Trash2, Lock, LogOut, Settings, X, ShieldCheck, Menu, MessageSquare, Plus, Gamepad2, Briefcase, Palette, Wallet, MessageCircle, History, Bell, Timer as TimerIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Cat, CatEmotion } from './components/Cat';
import { PickTheLock } from './components/PickTheLock';
import { Productivity } from './components/Productivity';
import { Timer } from './components/Timer';
import { ExpenseTracker } from './components/ExpenseTracker';
import { Toaster, toast } from 'sonner';
import { sendMessage, ChatMessage, ChatCategory } from './lib/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
  category: ChatCategory;
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('kuro_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }
    const initialSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      lastUpdated: Date.now(),
      category: 'chat'
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  const [activeCategory, setActiveCategory] = useState<ChatCategory>('chat');

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const setMessages = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const updatedMessages = typeof newMessages === 'function' ? newMessages(session.messages) : newMessages;
        
        // Auto-naming logic
        let newTitle = session.title;
        if (session.title === 'New Chat' && updatedMessages.length > 0) {
          const firstUserMsg = updatedMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
          }
        }

        return {
          ...session,
          messages: updatedMessages,
          title: newTitle,
          lastUpdated: Date.now()
        };
      }
      return session;
    }));
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<CatEmotion>('normal');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(() => {
    return localStorage.getItem('kuro_setup_complete') === 'true';
  });
  const [storedPin, setStoredPin] = useState(() => {
    return localStorage.getItem('kuro_pin') || '';
  });
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Idle timer to make Purrfect sleep
  useEffect(() => {
    if (isLoggedIn && !isLoading && activeCategory === 'chat') {
      const resetIdleTimer = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        
        // If Purrfect was sleeping, wake him up
        if (currentEmotion === 'sleeping') {
          setCurrentEmotion('normal');
        }

        idleTimerRef.current = setTimeout(() => {
          if (messages.length > 0) {
            setCurrentEmotion('sleeping');
          }
        }, 30000); // 30 seconds
      };

      // Reset timer on input change or message send
      resetIdleTimer();

      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
    }
  }, [input, messages, isLoggedIn, isLoading, activeCategory]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('kuro_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewChat = (category: ChatCategory = 'chat') => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: category === 'chat' ? 'New Chat' : `${category.charAt(0).toUpperCase() + category.slice(1)} Session`,
      messages: [],
      lastUpdated: Date.now(),
      category: category
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveCategory(category);
    setCurrentEmotion('normal');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    if (newSessions.length === 0) {
      const initialSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        lastUpdated: Date.now(),
        category: 'chat'
      };
      setSessions([initialSession]);
      setActiveSessionId(initialSession.id);
      setActiveCategory('chat');
    } else {
      setSessions(newSessions);
      if (activeSessionId === id) {
        setActiveSessionId(newSessions[0].id);
        setActiveCategory(newSessions[0].category);
      }
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === storedPin) {
          setTimeout(() => setIsLoggedIn(true), 300);
        } else {
          setPinError(true);
          setTimeout(() => {
            setPin('');
            setPinError(false);
          }, 500);
        }
      }
    }
  };

  const handleSetupPin = () => {
    if (newPin.length === 4 && newPin === confirmPin) {
      localStorage.setItem('kuro_pin', newPin);
      localStorage.setItem('kuro_setup_complete', 'true');
      setStoredPin(newPin);
      setIsSetupComplete(true);
      setIsLoggedIn(true);
    } else if (newPin !== confirmPin) {
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
    }
  };

  const handleChangePin = () => {
    if (newPin.length === 4 && newPin === confirmPin) {
      localStorage.setItem('kuro_pin', newPin);
      setStoredPin(newPin);
      setNewPin('');
      setConfirmPin('');
      setIsSettingsOpen(false);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
    }
  };

  const removeLastDigit = () => {
    setPin(pin.slice(0, -1));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      if (input.trim().length > 0 && currentEmotion !== 'typing') {
        setCurrentEmotion('typing');
      } else if (input.trim().length === 0 && currentEmotion === 'typing') {
        setCurrentEmotion('normal');
      }
    }
  }, [input, isLoading, isLoggedIn, currentEmotion]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentEmotion('thinking');

    try {
      // Get context from localStorage
      const tasksStr = localStorage.getItem('kuro_tasks');
      const remindersStr = localStorage.getItem('kuro_reminders');
      const budgetStr = localStorage.getItem('kuro_budget');
      const expensesStr = localStorage.getItem('kuro_expenses');
      
      const context = {
        tasks: tasksStr ? JSON.parse(tasksStr) : [],
        reminders: remindersStr ? JSON.parse(remindersStr) : [],
        finance: {
          budget: budgetStr ? JSON.parse(budgetStr) : 0,
          expenses: expensesStr ? JSON.parse(expensesStr) : []
        }
      };

      const { text, emotion } = await sendMessage(newMessages, activeSession.category, context);
      setMessages(prev => [...prev, { role: 'model', text, emotion }]);
      setCurrentEmotion(emotion);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = "Meow... something went wrong. Can you try again?";
      let errorEmotion: CatEmotion = 'crying';

      // Check for 429 Quota Exceeded
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || JSON.stringify(error).includes('429')) {
        errorMessage = "Meow... I'm exhausted! (Quota Exceeded). Please wait a minute or check your Gemini API settings.";
        errorEmotion = 'bored';
        toast.error("Gemini API Quota Exceeded. Please wait a moment.");
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage, emotion: errorEmotion }]);
      setCurrentEmotion(errorEmotion);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentEmotion('normal');
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] bg-white text-gray-900 font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {!isSetupComplete ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 space-y-8 text-center"
          >
            <div className="space-y-4">
              <div className="w-24 h-24 bg-black rounded-[2rem] flex items-center justify-center mx-auto shadow-[6px_8px_0_#000] border-2 border-black rotate-3 overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/kuro-logo/200/200" 
                  alt="Purrfect Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic">Welcome to Purrfect</h1>
              <p className="text-gray-500 max-w-xs mx-auto">First, let's secure your expressive cat assistant with a 4-digit PIN.</p>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block text-left ml-1">New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-4 border-2 border-black rounded-xl shadow-[4px_4px_0_#000] outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all text-center text-2xl tracking-[1em] font-bold"
                  placeholder="••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block text-left ml-1">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className={cn(
                    "w-full p-4 border-2 border-black rounded-xl shadow-[4px_4px_0_#000] outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all text-center text-2xl tracking-[1em] font-bold",
                    pinError && "border-red-500 animate-shake"
                  )}
                  placeholder="••••"
                />
              </div>
              <button
                onClick={handleSetupPin}
                disabled={newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full py-4 bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0_#333] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50"
              >
                Set PIN & Start
              </button>
            </div>
          </motion.div>
        ) : !isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 space-y-10 sm:space-y-12"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto shadow-[4px_5px_0_#000] border-2 border-black overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/kuro-logo/200/200" 
                  alt="Purrfect Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Enter PIN</h2>
              <p className="text-gray-400 text-sm italic">Purrfect is waiting for you...</p>
            </div>

            <div className={cn(
              "flex gap-4 transition-transform",
              pinError && "animate-shake"
            )}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 border-black transition-all duration-200",
                    pin.length > i ? "bg-black scale-110" : "bg-transparent"
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-[280px] w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (btn === 'delete') removeLastDigit();
                    else if (btn !== '') handlePinInput(btn);
                  }}
                  className={cn(
                    "h-16 rounded-xl border-2 border-black font-bold text-xl transition-all active:scale-95",
                    btn === '' ? "opacity-0 pointer-events-none" : "hover:bg-gray-50",
                    btn === 'delete' ? "text-red-500" : "text-black",
                    btn !== '' && "shadow-[2px_3px_0_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                  )}
                >
                  {btn === 'delete' ? '←' : btn}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full relative"
          >
            {/* Sidebar Overlay */}
            <AnimatePresence>
              {isSidebarOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[110]"
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute top-0 left-0 bottom-0 w-[82vw] max-w-72 bg-white border-r-2 border-black z-[120] flex flex-col shadow-[8px_0_0_rgba(0,0,0,0.05)]"
                  >
                    <div className="p-6 border-b-2 border-black flex items-center justify-between bg-black text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                          <img 
                            src="https://picsum.photos/seed/kuro-logo/100/100" 
                            alt="Purrfect Logo" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="font-black uppercase tracking-tighter italic text-xl">Menu</span>
                      </div>
                      <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-3">Categories</p>
                        <div className="grid grid-cols-1 gap-1">
                          {[
                            { id: 'chat', label: 'Chat', icon: MessageCircle },
                            { id: 'game', label: 'Game', icon: Gamepad2 },
                            { id: 'productivity', label: 'Productivity', icon: Briefcase },
                            { id: 'timer', label: 'Timer', icon: TimerIcon },
                            { id: 'finance', label: 'Expenses', icon: Wallet },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setActiveCategory(cat.id as ChatCategory);
                                setIsSidebarOpen(false);
                              }}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all",
                                activeCategory === cat.id 
                                  ? "bg-black text-white border-2 border-black" 
                                  : "hover:bg-gray-50 border-2 border-transparent"
                              )}
                            >
                              <cat.icon size={18} />
                              <span className="font-bold text-xs uppercase tracking-widest">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t-2 border-black space-y-2">
                      <button
                        onClick={() => {
                          setIsSettingsOpen(true);
                          setIsSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <Settings size={18} />
                        <span className="font-bold text-sm uppercase tracking-widest">Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsLoggedIn(false);
                          setPin('');
                          setIsSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="font-bold text-sm uppercase tracking-widest">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* History Drawer (Right) */}
            <AnimatePresence>
              {isHistoryOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsHistoryOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[110]"
                  />
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute top-0 right-0 bottom-0 w-[82vw] max-w-72 bg-white border-l-2 border-black z-[120] flex flex-col shadow-[-8px_0_0_rgba(0,0,0,0.05)]"
                  >
                    <div className="p-6 border-b-2 border-black flex items-center justify-between bg-black text-white">
                      <div className="flex items-center gap-2">
                        <History size={20} />
                        <span className="font-black uppercase tracking-tighter italic text-xl">History</span>
                      </div>
                      <button 
                        onClick={() => setIsHistoryOpen(false)}
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            createNewChat(activeCategory);
                            setIsHistoryOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-transparent hover:border-black hover:bg-gray-50 transition-all group"
                        >
                          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                          <span className="font-bold text-sm uppercase tracking-widest">New Session</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-3">
                          {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} History
                        </p>
                        <div className="space-y-1">
                          {sessions
                            .filter(s => s.category === activeCategory)
                            .map((session) => (
                              <div
                                key={session.id}
                                onClick={() => {
                                  setActiveSessionId(session.id);
                                  setIsHistoryOpen(false);
                                }}
                                className={cn(
                                  "flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all group",
                                  activeSessionId === session.id 
                                    ? "bg-gray-100 border-2 border-black" 
                                    : "hover:bg-gray-50 border-2 border-transparent"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <MessageSquare size={16} className="flex-shrink-0" />
                                  <span className="text-xs font-medium truncate">{session.title}</span>
                                </div>
                                <button
                                  onClick={(e) => deleteSession(session.id, e)}
                                  className={cn(
                                    "p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                                    activeSessionId === session.id ? "hover:bg-gray-200 text-gray-600" : "hover:bg-gray-200 text-gray-400"
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Settings Overlay */}
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] bg-white flex flex-col p-4 sm:p-6 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-12">
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter">Settings</h2>
                      <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-2 border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Security</h3>
                        <div className="p-6 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-400">Change PIN</label>
                            <input
                              type="password"
                              maxLength={4}
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                              className="w-full p-3 border-2 border-black rounded-lg outline-none focus:bg-gray-50 text-center text-xl tracking-[0.5em] font-bold"
                              placeholder="NEW PIN"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-400">Confirm New PIN</label>
                            <input
                              type="password"
                              maxLength={4}
                              value={confirmPin}
                              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                              className={cn(
                                "w-full p-3 border-2 border-black rounded-lg outline-none focus:bg-gray-50 text-center text-xl tracking-[0.5em] font-bold",
                                pinError && "border-red-500 animate-shake"
                              )}
                              placeholder="CONFIRM"
                            />
                          </div>
                          <button
                            onClick={handleChangePin}
                            className="w-full py-3 bg-black text-white font-bold uppercase text-xs tracking-widest rounded-lg shadow-[3px_3px_0_#333] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                          >
                            Update PIN
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Chat</h3>
                        <button
                          onClick={() => {
                            const initialSession: ChatSession = {
                              id: crypto.randomUUID(),
                              title: 'New Chat',
                              messages: [],
                              lastUpdated: Date.now(),
                              category: 'chat'
                            };
                            setSessions([initialSession]);
                            setActiveSessionId(initialSession.id);
                            setActiveCategory('chat');
                            setIsSettingsOpen(false);
                          }}
                          className="w-full p-4 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] flex items-center justify-between hover:bg-red-50 hover:border-red-500 hover:text-red-500 transition-all group"
                        >
                          <span className="font-bold uppercase tracking-widest">Clear All History</span>
                          <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Purrfect v1.0.0</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-50"
                  title="Menu"
                >
                  <Menu size={24} />
                </button>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-50"
                    title="History"
                  >
                    <History size={24} />
                  </button>
                  <button 
                    onClick={clearChat}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-50"
                    title="Clear Chat"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </header>

            {/* Cat Display Area */}
            <div className="flex-shrink-0 h-[170px] sm:h-[220px] flex items-center justify-center bg-transparent relative">
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="absolute top-5 left-10"><Sparkles size={30} /></div>
                <div className="absolute bottom-5 right-10"><Sparkles size={30} /></div>
              </div>
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 0.8, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="translate-y-1 sm:translate-y-2 sm:scale-100"
              >
                <Cat emotion={currentEmotion} />
              </motion.div>
            </div>

            {/* Chat Messages or Game View */}
            <div 
              ref={scrollRef}
              className={cn(
                "flex-1 min-h-0 scroll-smooth",
                (activeCategory === 'chat') 
                  ? "overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6" 
                  : "overflow-hidden"
              )}
            >
              {activeCategory === 'game' ? (
                <PickTheLock 
                  onScoreUpdate={(score) => {
                    if (score % 5 === 0) setCurrentEmotion('happy');
                    else if (score % 3 === 0) setCurrentEmotion('pookie');
                  }}
                  onGameOver={(score) => {
                    setCurrentEmotion('shocked');
                    setTimeout(() => setCurrentEmotion('bored'), 2000);
                  }}
                  onAutoPlayToggle={(active) => {
                    if (active) setCurrentEmotion('happy');
                    else setCurrentEmotion('bored');
                  }}
                />
              ) : activeCategory === 'productivity' ? (
                <Productivity 
                  onTaskAdded={() => {
                    setCurrentEmotion('happy');
                    toast.success('Task added! Meow-velous!');
                    setTimeout(() => setCurrentEmotion('bored'), 1500);
                  }}
                  onTaskCompleted={() => {
                    setCurrentEmotion('pookie');
                    toast.success('Task completed! Good job!');
                    setTimeout(() => setCurrentEmotion('bored'), 1500);
                  }}
                  onReminderSet={() => {
                    setCurrentEmotion('happy');
                    toast.success('Reminder set! I won\'t forget!');
                    setTimeout(() => setCurrentEmotion('bored'), 1500);
                  }}
                  onReminderTriggered={(text, soundUrl) => {
                    setCurrentEmotion('shocked');
                    toast(text, {
                      description: 'Reminder from Purrfect!',
                      icon: <Bell className="text-black" size={16} />,
                      duration: 10000,
                    });
                    // Play a subtle sound if enabled
                    if (soundUrl) {
                      try {
                        const audio = new Audio(soundUrl);
                        audio.volume = 0.5;
                        audio.play();
                      } catch (e) {}
                    }
                    setTimeout(() => setCurrentEmotion('bored'), 3000);
                  }}
                />
              ) : activeCategory === 'timer' ? (
                <Timer 
                  onTimerStart={() => {
                    setCurrentEmotion('happy');
                    toast.success('Timer started! Meow-mentum!');
                    setTimeout(() => setCurrentEmotion('bored'), 1500);
                  }}
                  onTimerEnd={() => {
                    setCurrentEmotion('shocked');
                    toast.error('Time is up! Meow!', {
                      duration: 5000,
                      icon: <Bell className="text-red-500" size={16} />
                    });
                    setTimeout(() => setCurrentEmotion('bored'), 3000);
                  }}
                />
              ) : activeCategory === 'finance' ? (
                <ExpenseTracker 
                  onExpenseAdded={(amount) => {
                    setCurrentEmotion('shocked');
                    toast.error(`Spent $${amount.toLocaleString()}! Watch out!`);
                    setTimeout(() => setCurrentEmotion('bored'), 2000);
                  }}
                  onIncomeAdded={(amount) => {
                    setCurrentEmotion('happy');
                    toast.success(`Added $${amount.toLocaleString()}! Meow-ney!`);
                    setTimeout(() => setCurrentEmotion('bored'), 2000);
                  }}
                  onBudgetExceeded={() => {
                    setCurrentEmotion('crying');
                    toast.error('Budget exceeded! Meow... we are broke!');
                  }}
                />
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-center space-y-4">
                      <div className="opacity-40 flex flex-col items-center space-y-2">
                        <Bot size={24} className="text-gray-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Meow. I'm Purrfect.
                        </p>
                      </div>
                      
                      {/* Context-aware suggestions */}
                      <div className="flex flex-wrap justify-center gap-2 max-w-[240px]">
                        {(() => {
                          const tasks = JSON.parse(localStorage.getItem('kuro_tasks') || '[]');
                          const activeTasks = tasks.filter((t: any) => !t.completed);
                          if (activeTasks.length > 0) {
                            return (
                              <button 
                                onClick={() => setInput(`What are my tasks?`)}
                                className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                              >
                                Check Tasks
                              </button>
                            );
                          }
                          return null;
                        })()}
                        {(() => {
                          const reminders = JSON.parse(localStorage.getItem('kuro_reminders') || '[]');
                          const pendingReminders = reminders.filter((r: any) => !r.triggered);
                          if (pendingReminders.length > 0) {
                            return (
                              <button 
                                onClick={() => setInput(`Do I have any reminders?`)}
                                className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                              >
                                Check Reminders
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "flex w-full",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[85%] px-3 py-2 rounded-xl text-xs font-medium leading-normal shadow-[2px_2px_0_#000]",
                          msg.role === 'user' 
                            ? "bg-black text-white rounded-tr-none" 
                            : "bg-white border-2 border-black text-gray-800 rounded-tl-none"
                        )}>
                          <div className="markdown-body">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-gray-50 px-3 py-2 rounded-xl rounded-tl-none flex gap-1 items-center border border-gray-100">
                        <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"></span>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Input Area */}
            {activeCategory !== 'game' && activeCategory !== 'productivity' && activeCategory !== 'timer' && activeCategory !== 'finance' && (
              <div className="p-2 sm:p-3 bg-white border-t border-gray-100 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Meow something..."
                    className="flex-1 p-2 text-xs border-2 border-black rounded-lg shadow-[2px_2px_0_#000] outline-none transition-all focus:shadow-[4px_4px_0_#000] placeholder:text-gray-400 bg-white"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center transition-all border-2 border-black rounded-lg outline-none",
                      input.trim() && !isLoading 
                        ? "bg-white text-black shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]" 
                        : "bg-gray-100 text-gray-300 shadow-none"
                    )}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster position="top-center" richColors />
    </div>
  );
}
