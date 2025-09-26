'use client';

import { useEffect, useState } from 'react';

interface ComboEffectProps {
  message: string;
}

export default function ComboEffect({ message }: ComboEffectProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (message) {
      setText(message);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1400); // Should be slightly less than animation duration
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div
        key={text} // Re-trigger animation on new message
        className="text-5xl font-bold text-white text-stroke-_3 text-stroke-primary animate-combo drop-shadow-lg"
        style={
          {
            '--text-stroke-color': 'hsl(var(--primary))',
            WebkitTextStroke: '3px hsl(var(--primary))',
          } as React.CSSProperties
        }
      >
        {text}
      </div>
    </div>
  );
}
