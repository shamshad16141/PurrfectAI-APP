import React, { useEffect, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CatEmotion = 
  | 'normal' 
  | 'bored' 
  | 'side-eye' 
  | 'pleading' 
  | 'angry' 
  | 'crying' 
  | 'thinking' 
  | 'listening' 
  | 'doubt' 
  | 'happy' 
  | 'sleeping' 
  | 'shocked' 
  | 'pookie' 
  | 'love'
  | 'typing';

interface CatProps {
  emotion?: CatEmotion;
  className?: string;
}

const emotionToClass: Record<CatEmotion, string> = {
  'normal': '',
  'bored': 'state-bored',
  'side-eye': 'state-side-eye',
  'pleading': 'state-pleading',
  'angry': 'state-angry',
  'crying': 'state-crying',
  'thinking': 'state-thinking',
  'listening': 'state-listening',
  'doubt': 'state-doubt',
  'happy': 'state-happy',
  'sleeping': 'state-sleeping',
  'shocked': 'state-shocked',
  'pookie': 'state-pookie',
  'love': 'state-love',
  'typing': 'state-typing',
};

export const Cat: React.FC<CatProps> = ({ emotion = 'normal', className }) => {
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const triggerBlink = () => {
      if (!catRef.current) return;
      
      const restrictedStates = [
        'state-sleeping'
      ];

      if (!restrictedStates.some(s => catRef.current?.classList.contains(s))) {
        const lids = catRef.current.querySelectorAll('.eyelid.top') as NodeListOf<HTMLDivElement>;
        lids.forEach(lid => lid.style.top = '0%');
        setTimeout(() => {
          lids.forEach(lid => lid.style.top = '');
        }, 150);
      }
      blinkTimeout = setTimeout(triggerBlink, Math.random() * 4000 + 1500);
    };

    triggerBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <div className={cn("relative w-[300px] h-[300px] flex justify-center items-center overflow-visible", className)}>
      <div ref={catRef} className={cn("cat relative w-[200px] h-[240px] transition-transform duration-200", emotionToClass[emotion])}>
        <div className="shadow"></div>
        <div className="tail"></div>
        <div className="body"></div>
        
        <div className="knife">
          <div className="knife-handle"></div>
          <div className="knife-blade"></div>
        </div>

        <div className="paws-container">
          <div className="paw left"></div>
          <div className="paw right"></div>
        </div>

        <div className="head-pivot">
          <div className="head">
            {/* LOADING */}
            <div className="loading-icon">
              <div className="spinner-track">
                <div className="tick"></div><div className="tick"></div><div className="tick"></div><div className="tick"></div>
                <div className="tick"></div><div className="tick"></div><div className="tick"></div><div className="tick"></div>
              </div>
            </div>
            
            {/* QUESTION MARKS */}
            <div className="question-marks">
              <div className="q-mark">?</div>
              <div className="q-mark">?</div>
              <div className="q-mark">?</div>
              <div className="q-mark">?</div>
            </div>

            {/* SPARKLES */}
            <div className="sparkles">
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
            </div>

            {/* ZZZ (SLEEPING) */}
            <div className="zzz-container">
              <div className="z-char">z</div>
              <div className="z-char">z</div>
              <div className="z-char">Z</div>
            </div>

            {/* SHOCKED MARKS */}
            <div className="shocked-marks">
              <div className="sh-mark">!</div>
              <div className="sh-mark">!</div>
            </div>
            
            {/* HEARTS (LOVE) */}
            <div className="hearts">
              <div className="heart"></div>
              <div className="heart"></div>
              <div className="heart"></div>
            </div>

            {/* LISTENING WAVES */}
            <div className="sound-waves">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
            
            {/* POOKIE BOW */}
            <div className="bow">
              <div className="bow-loop left"></div>
              <div className="bow-loop right"></div>
              <div className="bow-knot"></div>
            </div>

            <div className="ear left"><div className="ear-inner"></div></div>
            <div className="ear right"><div className="ear-inner"></div></div>
            
            <div className="face relative w-full h-full">
              <div className="tear-drop left"></div>
              <div className="tear-drop right"></div>
              <div className="blush left"></div>
              <div className="blush right"></div>

              <div className="eyes-row absolute top-[50px] left-0 w-full flex justify-center gap-4 z-[5]">
                <div id="eyeLeft" className="eye relative w-[65px] h-[65px] bg-[#fbfbfb] border-[3px] border-black rounded-full overflow-hidden transition-all duration-400">
                  <div className="pupil"></div>
                  <div className="tear-pool"></div>
                  <div className="eyelid top"></div>
                  <div className="eyelid bottom"></div>
                </div>
                <div id="eyeRight" className="eye relative w-[65px] h-[65px] bg-[#fbfbfb] border-[3px] border-black rounded-full overflow-hidden transition-all duration-400">
                  <div className="pupil"></div>
                  <div className="tear-pool"></div>
                  <div className="eyelid top"></div>
                  <div className="eyelid bottom"></div>
                </div>
              </div>
              
              <div className="mouth absolute bottom-[35px] left-1/2 -translate-x-1/2 w-[10px] h-[4px] bg-[#554444] rounded-[20px] transition-all duration-300"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
