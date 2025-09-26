'use client';

import { useCallback } from 'react';

type SoundType = 'match' | 'combo' | 'bomb' | 'win' | 'lose' | 'click';

export const useSound = () => {
  const playSound = useCallback((sound: SoundType) => {
    if (typeof window !== 'undefined') {
      try {
        // Sounds are expected to be in /public/sounds
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.play().catch(error => {
          // Autoplay was prevented.
          console.log(`Playback for ${sound} prevented.`, error);
        });
      } catch (error) {
        console.error(`Could not play sound: ${sound}`, error);
      }
    }
  }, []);

  return { playSound };
};
