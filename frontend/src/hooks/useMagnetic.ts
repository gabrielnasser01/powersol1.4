import { useEffect, RefObject } from 'react';

interface MagneticOptions {
  strength?: number;
  disabled?: boolean;
}

export function useMagnetic(ref: RefObject<HTMLElement>, options: MagneticOptions = {}) {
  const { strength = 12, disabled = false } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      
      element.style.transform = `translate(${x / strength}px, ${y / strength}px)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, strength, disabled]);
}