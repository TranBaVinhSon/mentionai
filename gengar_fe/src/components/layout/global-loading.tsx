"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useIsFetching } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/shadcn-io/spinner";

export function GlobalLoading() {
  const isFetching = useIsFetching();

  return (
    <AnimatePresence>
      {isFetching > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <Spinner variant="circle-filled" size={48} className="text-brand" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
