import { useEffect, useState } from "react";
import { motion, stagger, useAnimate, useInView } from "framer-motion";

const loadingTexts = [
  "Hmmm...",
  "Thinking...",
  "Just a sec...",
  "Hold on...",
  "Almost there...",
  "Processing...",
  "Hang tight...",
  "One moment...",
  "Loading...",
  "Working on it...",
  "Getting there...",
  "Please wait...",
  "Give me a moment...",
  "Fetching data...",
  "Checking...",
  "Stay with me...",
  "Crunching numbers...",
  "Loading up...",
  "Gathering info...",
  "Let me think...",
  "Searching...",
];

const getRandomLoadingText = () => {
  return loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
};

const useInterval = (callback: () => void, delay: number) => {
  useEffect(() => {
    const interval = setInterval(callback, delay);
    return () => clearInterval(interval);
  }, []);
};

export const LoadingText = () => {
  const [loadingText, setLoadingText] = useState(getRandomLoadingText());

  useInterval(() => {
    setLoadingText(getRandomLoadingText());
  }, 4000);

  return (
    <motion.span
      className="text-foreground/40 lowercase"
      initial={{ opacity: 0.2 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.4,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    >
      {loadingText}
    </motion.span>
  );
};
