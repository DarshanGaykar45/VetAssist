import { useRef, useCallback, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber.jsx';

/**
 * Premium StatCard — CSS perspective-based 3D hover tilt + floating icon
 * No external library; uses onMouseMove to compute rotateX/rotateY.
 * Automatically disabled on touch devices (no cursor position).
 */

/* Detect touch device to skip 3D tilt */
function useIsTouch() {
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(hover: none)').matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(hover: none)');
    const handler = (e) => setIsTouch(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isTouch;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  color  = '#0F766E',
  bgColor = 'rgba(15,118,110,0.12)',
  glowColor = 'rgba(15,118,110,0.3)',
  trend,
  trendLabel,
  index = 0,
}) {
  const cardRef = useRef(null);
  const frameRef = useRef(null);
  const isTouch = useIsTouch();

  /* ── Mouse-driven 3D tilt (disabled on touch devices) ── */
  const handleMouseMove = useCallback((e) => {
    if (isTouch || !cardRef.current) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rect = cardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotY =  dx * 7;
      const rotX = -dy * 7;
      cardRef.current.style.transform =
        `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px) scale(1.018)`;
    });
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    if (isTouch) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.transition = 'transform 400ms cubic-bezier(0.16,1,0.3,1)';
    }
  }, [isTouch]);

  const handleMouseEnter = useCallback(() => {
    if (isTouch) return;
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 80ms linear';
    }
  }, [isTouch]);

  const trendDir = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.09,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ position: 'relative' }}
    >
      <div
        ref={cardRef}
        className="stat-card"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        style={{
          willChange: 'transform',
          transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1), box-shadow 250ms ease, border-color 200ms ease',
        }}
      >
        {/* Ambient glow orb — top-right */}
        <div
          className="stat-card-glow"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="stat-label">{label}</p>
            <div className="stat-value">
              {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
            </div>
            {trendLabel && (
              <div className={`stat-trend ${trendDir}`}>
                {trend !== undefined && <TrendIcon size={11} />}
                <span>{trendLabel}</span>
              </div>
            )}
          </div>

          {Icon && (
            <motion.div
              className="stat-icon stat-icon-floating"
              style={{
                background: bgColor,
                color: color,
                boxShadow: `0 4px 14px -2px ${glowColor}`,
                borderRadius: 'var(--radius-lg)',
                width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${bgColor}`,
              }}
              whileHover={{ scale: 1.12, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            >
              <Icon size={22} color={color} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
