import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal — scale+fade entrance on desktop, bottom-sheet slide-up on mobile.
 * Backdrop blur, Escape to close, outside-click close.
 * size: sm | md (default) | lg | xl
 */

/* Check if viewport is mobile-sized (matches the ≤440px breakpoint) */
function useIsMobile(breakpoint = 440) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

export default function Modal({ isOpen = true, onClose, title, children, footer, size = 'md' }) {
  const isMobile = useIsMobile();
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll and toggle modal-open class to hide mobile tab bar & FAB
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Handle iOS visualViewport changes (when virtual keyboard appears/disappears)
  useEffect(() => {
    if (!isOpen || !isMobile || typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      if (modalRef.current) {
        const vvHeight = window.visualViewport.height;
        const maxH = Math.min(vvHeight * 0.92, window.innerHeight * 0.92);
        modalRef.current.style.maxHeight = `${maxH}px`;
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [isOpen, isMobile]);

  // Scroll focused input into view on iOS (keyboard covers field)
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const handler = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 280);
      }
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, [isOpen, isMobile]);

  const sizeClass =
    size === 'lg' ? 'modal-lg' :
    size === 'xl' ? 'modal-xl' :
    size === 'sm' ? 'modal-sm' : '';

  // Mobile: slide up from bottom; Desktop: scale+fade from center
  const modalVariants = isMobile
    ? {
        initial: { opacity: 0, y: '100%' },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: '100%' },
        transition: { type: 'spring', damping: 30, stiffness: 340, mass: 0.9 },
      }
    : {
        initial: { opacity: 0, scale: 0.93, y: 16 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.93, y: 12 },
        transition: { type: 'spring', damping: 26, stiffness: 360, mass: 0.85 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            ref={modalRef}
            className={`modal ${sizeClass}`}
            initial={modalVariants.initial}
            animate={modalVariants.animate}
            exit={modalVariants.exit}
            transition={modalVariants.transition}
          >
            {/* Mobile drag handle indicator */}
            {isMobile && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '0.5rem 0 0',
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--color-border)',
                  }}
                />
              </div>
            )}

            {/* Header */}
            <div className="modal-header">
              <h2 className="modal-title" id="modal-title">{title}</h2>
              <motion.button
                className="modal-close"
                onClick={onClose}
                aria-label="Close modal"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Body */}
            <div className="modal-body">{children}</div>

            {/* Optional footer */}
            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

