import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Bot } from 'lucide-react';

interface PickTheLockProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  onAutoPlayToggle?: (active: boolean) => void;
  isPurrfectPlaying?: boolean;
}

export const PickTheLock: React.FC<PickTheLockProps> = ({ onScoreUpdate, onGameOver, onAutoPlayToggle, isPurrfectPlaying: initialPurrfectPlaying = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [isAutoPlay, setIsAutoPlay] = useState(initialPurrfectPlaying);
  const [catHighScore, setCatHighScore] = useState(() => {
    return parseInt(localStorage.getItem('kuro_lock_cat_highscore') || '0');
  });
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('kuro_lock_highscore') || '0');
  });

  // Game state refs to avoid closure issues in the loop
  const stateRef = useRef({
    isRunning: false,
    score: 0,
    angle: 270,
    targetAngle: 0,
    direction: 1,
    speed: 3.5,
    lastTime: 0,
    particles: [] as any[],
    trail: [] as number[],
    pulse: 0,
    isAutoPlay: false,
    autoPlayReactionTime: 0,
    autoPlayError: 0,
    config: {
      radius: 0,
      lineWidth: 0,
      pinRadius: 0,
      baseSpeed: 3.5,
      speedInc: 0.2,
      tolerance: 15,
      trailLength: 8
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'pop' | 'fail') => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    const now = audioCtxRef.current.currentTime;

    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + (stateRef.current.score * 15), now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'fail') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.3);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  };

  const resize = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const minDimension = Math.min(rect.width, rect.height);
    stateRef.current.config.radius = minDimension * 0.35;
    stateRef.current.config.lineWidth = minDimension * 0.08;
    stateRef.current.config.pinRadius = minDimension * 0.04;
  };

  const getAngleDistance = (a: number, b: number) => {
    let phi = Math.abs(b - a) % 360;
    return phi > 180 ? 360 - phi : phi;
  };

  const setRandomTarget = () => {
    let minDiff = 80;
    let newAngle;
    do {
      newAngle = Math.floor(Math.random() * 360);
    } while (getAngleDistance(stateRef.current.angle, newAngle) < minDiff);
    stateRef.current.targetAngle = newAngle;

    // Set a random error for the cat's next hit (in degrees)
    // Higher score = more pressure = more potential for error
    const maxError = 5 + (stateRef.current.score * 0.5);
    stateRef.current.autoPlayError = (Math.random() - 0.5) * maxError;
    // Reaction time in frames (approx 60fps)
    stateRef.current.autoPlayReactionTime = Math.floor(Math.random() * 10) + 5;
  };

  const getCoordinates = (angle: number, radius: number, cx: number, cy: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius
    };
  };

  const spawnParticles = (x: number, y: number) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      stateRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        size: Math.random() * 3 + 2
      });
    }
  };

  const checkHit = () => {
    const dist = getAngleDistance(stateRef.current.angle, stateRef.current.targetAngle);
    if (dist <= stateRef.current.config.tolerance) {
      stateRef.current.score++;
      setScore(stateRef.current.score);
      stateRef.current.speed = stateRef.current.config.baseSpeed + (stateRef.current.score * stateRef.current.config.speedInc);
      stateRef.current.direction *= -1;
      
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const cx = canvas.width / (2 * dpr);
        const cy = canvas.height / (2 * dpr);
        const coords = getCoordinates(stateRef.current.angle, stateRef.current.config.radius, cx, cy);
        spawnParticles(coords.x, coords.y);
      }
      
      playSound('pop');
      setRandomTarget();
      onScoreUpdate?.(stateRef.current.score);
    } else {
      handleGameOver();
    }
  };

  const handleGameOver = () => {
    stateRef.current.isRunning = false;
    setGameState('gameover');
    playSound('fail');
    onAutoPlayToggle?.(false);
    
    if (stateRef.current.isAutoPlay) {
      if (stateRef.current.score > catHighScore) {
        setCatHighScore(stateRef.current.score);
        localStorage.setItem('kuro_lock_cat_highscore', stateRef.current.score.toString());
      }
    } else {
      if (stateRef.current.score > highScore) {
        setHighScore(stateRef.current.score);
        localStorage.setItem('kuro_lock_highscore', stateRef.current.score.toString());
      }
    }
    
    onGameOver?.(stateRef.current.score);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };

  const startGame = (auto: boolean = false) => {
    initAudio();
    stateRef.current.score = 0;
    setScore(0);
    stateRef.current.speed = stateRef.current.config.baseSpeed;
    stateRef.current.angle = 270;
    stateRef.current.direction = 1;
    stateRef.current.isRunning = true;
    stateRef.current.lastTime = 0;
    stateRef.current.trail = [];
    stateRef.current.particles = [];
    stateRef.current.isAutoPlay = auto;
    setIsAutoPlay(auto);
    onAutoPlayToggle?.(auto);
    
    setGameState('playing');
    setRandomTarget();
  };

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    
    let animationFrameId: number;
    
    const loop = (timestamp: number) => {
      if (!stateRef.current.lastTime) stateRef.current.lastTime = timestamp;
      const deltaTime = timestamp - stateRef.current.lastTime;
      stateRef.current.lastTime = timestamp;

      const safeDelta = Math.min(deltaTime, 50);
      const timeMultiplier = safeDelta / (1000 / 60);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        const cx = canvas.width / (2 * dpr);
        const cy = canvas.height / (2 * dpr);
        
        // Update
        if (stateRef.current.isRunning) {
          stateRef.current.pulse += 0.1 * timeMultiplier;
          stateRef.current.angle += (stateRef.current.speed * timeMultiplier) * stateRef.current.direction;
          
          stateRef.current.trail.push(stateRef.current.angle);
          if (stateRef.current.trail.length > stateRef.current.config.trailLength) {
            stateRef.current.trail.shift();
          }
          
          if (stateRef.current.angle >= 360) stateRef.current.angle -= 360;
          if (stateRef.current.angle < 0) stateRef.current.angle += 360;

          // Auto Play Logic (Human-like)
          if (stateRef.current.isAutoPlay) {
            const targetWithError = (stateRef.current.targetAngle + stateRef.current.autoPlayError + 360) % 360;
            const dist = getAngleDistance(stateRef.current.angle, targetWithError);
            
            // If we're close to the "perceived" target, start the reaction timer
            if (dist < stateRef.current.config.tolerance * 0.8) {
              if (stateRef.current.autoPlayReactionTime > 0) {
                stateRef.current.autoPlayReactionTime -= timeMultiplier;
              } else {
                // Chance to just "miss" entirely if speed is high
                const missChance = Math.min(0.15, stateRef.current.score * 0.005);
                if (Math.random() > missChance) {
                  checkHit();
                }
              }
            }
          }
        }

        for (let i = stateRef.current.particles.length - 1; i >= 0; i--) {
          const p = stateRef.current.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.life -= p.decay;
          p.size *= 0.95;
          if (p.life <= 0) stateRef.current.particles.splice(i, 1);
        }

        // Draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Track
        ctx.beginPath();
        ctx.arc(cx, cy, stateRef.current.config.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f9fafb';
        ctx.fill();
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = stateRef.current.config.lineWidth;
        ctx.stroke();

        if (stateRef.current.isRunning || stateRef.current.particles.length > 0) {
          // Target
          const tPos = getCoordinates(stateRef.current.targetAngle, stateRef.current.config.radius, cx, cy);
          const pulseSize = Math.sin(stateRef.current.pulse) * 1.5;
          ctx.beginPath();
          ctx.arc(tPos.x, tPos.y, stateRef.current.config.pinRadius + pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = '#9ca3af';
          ctx.fill();

          // Trail
          stateRef.current.trail.forEach((trailAngle, i) => {
            const pos = getCoordinates(trailAngle, stateRef.current.config.radius, cx, cy);
            const alpha = (i / stateRef.current.trail.length) * 0.4;
            const size = stateRef.current.config.pinRadius * 0.8 * (i / stateRef.current.trail.length);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fill();
          });

          // Player
          const pPos = getCoordinates(stateRef.current.angle, stateRef.current.config.radius, cx, cy);
          ctx.beginPath();
          ctx.arc(pPos.x, pPos.y, stateRef.current.config.pinRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();

          // Particles
          stateRef.current.particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1.0;
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleInteraction = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (gameState === 'playing') {
      checkHit();
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full py-4 px-4 space-y-4 overflow-hidden select-none touch-none"
      onPointerDown={handleInteraction}
    >
      <div className="flex items-center justify-between w-full max-w-[240px]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {isAutoPlay ? 'Purrfect Score' : 'Score'}
          </span>
          <span className={`text-2xl font-black italic tracking-tighter ${isAutoPlay ? 'text-blue-500' : ''}`}>{score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {isAutoPlay ? 'Purrfect Best' : 'Best'}
          </span>
          <div className="flex items-center gap-1">
            <Trophy size={12} className={isAutoPlay ? 'text-blue-400' : 'text-yellow-500'} />
            <span className="text-lg font-bold">{isAutoPlay ? catHighScore : highScore}</span>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative w-full max-w-[220px] aspect-square bg-white border-4 border-black rounded-full shadow-[6px_6px_0_#000] overflow-hidden cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-[4px_4px_0_#000] transition-all flex-shrink-0 touch-none ${isAutoPlay ? 'border-blue-500 shadow-[6px_6px_0_#3b82f6]' : ''}`}
        onPointerDown={handleInteraction}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        
        <AnimatePresence mode="wait">
          {gameState !== 'playing' && (
            <motion.div 
              key={gameState}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center"
            >
              {gameState === 'idle' ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter">Pick the Lock</h2>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-tight">Tap when the black dot<br/>hits the target!</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startGame(false);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-black uppercase tracking-widest shadow-[3px_3px_0_#333] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all text-[11px] w-full"
                    >
                      <Play size={14} fill="currentColor" />
                      Play Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startGame(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest shadow-[3px_3px_0_#1e40af] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all text-[11px] w-full"
                    >
                      <Bot size={14} />
                      Purrfect Mode
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-red-500 leading-none">Game Over</h2>
                    <p className="text-xs font-bold">
                      {isAutoPlay ? 'Purrfect' : 'You'} unlocked {score} levels!
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startGame(isAutoPlay);
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-2 ${isAutoPlay ? 'bg-blue-600' : 'bg-black'} text-white rounded-lg font-black uppercase tracking-widest shadow-[3px_3px_0_#333] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all text-[11px] w-full`}
                    >
                      <RotateCcw size={14} />
                      Try Again
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGameState('idle');
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                    >
                      Back to Menu
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center max-w-[240px]">
        {isAutoPlay ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 leading-relaxed animate-pulse">
            Purrfect is playing... Watch the master at work!
          </p>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 leading-relaxed">
            Tip: The lock gets faster as you progress. Stay focused!
          </p>
        )}
      </div>
    </div>
  );
};
