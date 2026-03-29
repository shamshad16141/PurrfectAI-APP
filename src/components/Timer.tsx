import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Bell, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimerProps {
  onTimerEnd?: () => void;
  onTimerStart?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ onTimerEnd, onTimerStart }) => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      playAlarm();
      onTimerEnd?.();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, onTimerEnd]);

  const playAlarm = () => {
    if (isMuted) return;
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.error('Failed to play alarm', e);
    }
  };

  const startTimer = () => {
    if (isEditing) {
      const totalSeconds = minutes * 60 + seconds;
      if (totalSeconds > 0) {
        setTimeLeft(totalSeconds);
        setIsEditing(false);
        setIsActive(true);
        onTimerStart?.();
      }
    } else {
      setIsActive(true);
    }
  };

  const pauseTimer = () => {
    setIsActive(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsEditing(true);
    setTimeLeft(0);
    setMinutes(0);
    setSeconds(0);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isEditing ? 0 : (timeLeft / (minutes * 60 + seconds)) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 space-y-4">
      <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0">
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="88"
            cy="88"
            r="80"
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth="8"
          />
          {!isEditing && (
            <motion.circle
              cx="88"
              cy="88"
              r="80"
              fill="transparent"
              stroke="black"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 80}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: (2 * Math.PI * 80) * (1 - progress / 100) }}
              transition={{ duration: 1, ease: "linear" }}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="z-10 text-center">
          {isEditing ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-12 text-2xl font-black text-center bg-transparent border-b-2 border-black outline-none"
                />
                <span className="text-[7px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Min</span>
              </div>
              <div className="flex flex-col items-center justify-center h-8">
                <span className="text-2xl font-black">:</span>
                <div className="h-3" />
              </div>
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-12 text-2xl font-black text-center bg-transparent border-b-2 border-black outline-none"
                />
                <span className="text-[7px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Sec</span>
              </div>
            </div>
          ) : (
            <motion.div
              key={timeLeft}
              initial={{ scale: 1.1, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-black italic tracking-tighter"
            >
              {formatTime(timeLeft)}
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {isActive ? (
          <button
            onClick={pauseTimer}
            className="p-4 bg-black text-white rounded-full shadow-[4px_4px_0_#333] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            <Pause size={24} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={startTimer}
            disabled={isEditing && minutes === 0 && seconds === 0}
            className="p-4 bg-black text-white rounded-full shadow-[4px_4px_0_#333] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50"
          >
            <Play size={24} fill="currentColor" className="translate-x-0.5" />
          </button>
        )}

        <button
          onClick={resetTimer}
          className="p-2 border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-[180px]">
        {[5, 10, 15, 25].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setMinutes(preset);
              setSeconds(0);
              setIsEditing(true);
              setIsActive(false);
            }}
            className="px-2 py-1 border-2 border-black rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-[1.5px_1.5px_0_#000] active:shadow-none active:translate-x-[0.5px] active:translate-y-[0.5px]"
          >
            {preset}m
          </button>
        ))}
      </div>
    </div>
  );
};
