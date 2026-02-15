'use client';

import React, { useState } from 'react';
import { X, Sparkles, Mail, Linkedin, ArrowRight, Gift, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useCampaignStore } from '@/store/campaign';

const TOTAL_SLOTS = 1000;
const LINKEDIN_URL = 'https://www.linkedin.com/in/sontbv/';
const EMAIL_SUBJECT = 'Apply for Free Digital Clone - MentionAI';
const EMAIL_BODY = 'Hi, I would like to apply for the free digital clone offer for the first 1000 users.';

export function CampaignBanner() {
  const { remainingSlots, hasApplied, markAsApplied } = useCampaignStore();
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleEmailClick = () => {
    markAsApplied();
    const mailtoLink = `mailto:contact@mentionai.io?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`;
    window.location.href = mailtoLink;
  };

  const handleLinkedInClick = () => {
    markAsApplied();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="relative w-full bg-black overflow-hidden"
      >
        {/* Mobile close button - Top right */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden absolute top-2 right-2 z-10 text-white hover:bg-white/20 hover:text-white"
          onClick={handleDismiss}
        >
          <X className="size-4" />
          <span className="sr-only">Dismiss banner</span>
        </Button>

        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
        </div>

        {/* Sparkle animations */}
        <motion.div
          className="absolute top-2 left-10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="size-6 text-white/60" />
        </motion.div>
        <motion.div
          className="absolute bottom-2 right-10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        >
          <Sparkles className="size-5 text-white/60" />
        </motion.div>

        <div className="relative px-4 py-3 md:py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Main content */}
              <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-white">
                {/* Icon and Badge */}
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Gift className="size-6 md:size-8 text-white" />
                  </motion.div>
                  <Badge 
                    className="bg-white text-black border-white hover:bg-gray-100 text-xs font-bold px-2 py-0.5 transition-colors"
                  >
                    LIMITED OFFER
                  </Badge>
                </div>

                {/* Text content */}
                <div className="text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-bold">
                    🎉 FREE Digital Clone for First 1000 Users!
                  </h3>
                  <p className="text-sm md:text-base text-white/90 mt-1">
                    Create your AI-powered digital twin today
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white text-black hover:bg-white/90 font-semibold shadow-lg"
                    asChild
                  >
                    <Link 
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      onClick={handleLinkedInClick}
                    >
                      <Linkedin className="size-4" />
                      <span className="hidden md:inline">Connect on LinkedIn</span>
                      <span className="md:hidden">LinkedIn</span>
                    </Link>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="bg-white text-black px-4 py-2 rounded-md font-semibold shadow-lg flex items-center gap-2 text-sm">
                    <Mail className="size-4" />
                    <span>contact@mentionai.io</span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white text-black hover:bg-white/90 font-semibold shadow-lg"
                    asChild
                  >
                    <Link 
                      href="https://x.com/mentionai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Twitter className="size-4" />
                      <span className="hidden md:inline">Follow on X</span>
                      <span className="md:hidden">X</span>
                    </Link>
                  </Button>
                </motion.div>

                {/* Close button - Desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex text-white hover:bg-white/20 hover:text-white ml-2"
                  onClick={handleDismiss}
                >
                  <X className="size-4" />
                  <span className="sr-only">Dismiss banner</span>
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Animated gradient border */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white to-white/20"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}