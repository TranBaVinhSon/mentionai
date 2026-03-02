"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({ 
  size = "md", 
  className,
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-16 w-16 border-4", 
    lg: "h-24 w-24 border-6"
  };

  const containerClasses = fullScreen 
    ? "flex justify-center items-center min-h-screen w-full"
    : "flex justify-center items-center min-h-[300px]";

  return (
    <div className={containerClasses}>
      <motion.div
        className={cn(
          "rounded-full border-brand/30 border-t-brand",
          sizeClasses[size],
          className
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};