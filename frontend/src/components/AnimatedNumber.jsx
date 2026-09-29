import { useEffect, useState } from 'react';

/**
 * Animated count-up counter with smooth cubic ease-out
 */
export default function AnimatedNumber({ value, duration = 900 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo for a fast initial rise and smooth settle
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (target - start) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}
