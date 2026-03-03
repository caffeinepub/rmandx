import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  duration = 1500,
  decimals = 2,
): string {
  const [value, setValue] = useState(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const prevTargetRef = useRef<number>(0);

  useEffect(() => {
    const startValue = prevTargetRef.current;
    prevTargetRef.current = target;

    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
    }

    startRef.current = null;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - (1 - progress) ** 3;
      const current = startValue + (target - startValue) * ease;
      setValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  return value.toFixed(decimals);
}
