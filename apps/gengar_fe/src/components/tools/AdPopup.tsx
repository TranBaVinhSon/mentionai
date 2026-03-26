"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Use next/navigation for App Router
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
interface AdPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdPopup = ({ isOpen, onClose }: AdPopupProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  if (session) {
    return null;
  }

  const handleTryMentionAI = () => {
    router.push("/");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-xl bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
        >
          <div className="p-6 md:p-8 text-center">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Discover MentionAI
                <Sparkles className="w-6 h-6 text-blue-500" />
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Ready to take your insights to the next level? Give MentionAI a
                try!
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
              <Button variant="outline" onClick={onClose} className="shadow-sm">
                Maybe Later
              </Button>
              <Button
                onClick={handleTryMentionAI}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
              >
                Try MentionAI Now
              </Button>
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default AdPopup;
