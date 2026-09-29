import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

/**
 * Toast — slides in from bottom-right, stacks with spring spacing,
 * auto-dismisses with smooth exit. Left accent border per type.
 */
function ToastItem({ toast, onClose }) {
  const Icon = ICONS[toast.type] || Info;
  return (
    <motion.div
      layout
      className={`toast ${toast.type}`}
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,  scale: 1   }}
      exit={{   opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
    >
      <span className="toast-icon"><Icon size={17} /></span>
      <div className="toast-content">
        <p className="toast-title">{toast.title}</p>
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>
      {typeof onClose === 'function' && (
        <motion.button
          className="toast-close"
          onClick={() => onClose(toast.id)}
          aria-label="Dismiss notification"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={13} />
        </motion.button>
      )}
    </motion.div>
  );
}

export default function ToastContainer({ toasts, onClose, removeToast }) {
  const handleClose = typeof onClose === 'function' ? onClose : (typeof removeToast === 'function' ? removeToast : null);
  return (
    <div className="toast-container" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts?.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={handleClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
