'use client';

import React, { useState, useEffect } from 'react';
import { X, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { signIn } from 'next-auth/react';

export function CampaignPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show popup after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 left-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm md:max-w-sm"
      >
        <div className="relative bg-black text-white rounded-lg shadow-2xl border border-white/20 overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close popup"
          >
            <X className="size-4" />
          </button>

          <div className="p-4 pr-10 md:p-6 md:pr-10">
            {/* Header with icon */}
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Gift className="size-8 text-white" />
              </motion.div>
              <Badge 
                className="bg-white text-black border-white text-xs font-bold px-2 py-0.5"
              >
                LIMITED TIME
              </Badge>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold mb-2">
              🎉 FREE Digital Clone
            </h3>
            <p className="text-sm text-white/80 mb-3">
              First 1000 users get a FREE digital clone! Message us to claim your free campaign offer.
            </p>
            <button
              onClick={() => signIn()}
              className="text-sm font-semibold text-white hover:text-white/80 transition-colors flex items-center gap-1"
            >
              Login now to get your free digital clone →
            </button>

            {/* Visual accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white to-white/20" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}