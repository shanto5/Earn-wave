import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface BeautifulModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  showClose?: boolean;
}

export const BeautifulModal: React.FC<BeautifulModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  showClose = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full bg-white/90 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/20 overflow-hidden",
              maxWidth
            )}
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-ink tracking-tighter">{title}</h3>
              {showClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors text-ink-muted hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-8 pb-8">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
