"use client";

import { useState, useEffect } from "react";
import { motion, stagger, useAnimate, useInView } from "framer-motion";

export function MentionLogo() {
  const [animate, setAnimate] = useState(false);

  // useEffect(() => {
  //   const timer = setTimeout(() => setAnimate(true), 1000);
  //   return () => clearTimeout(timer);
  // }, []);

  return (
    <div className="w-14 h-14">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          className={`transition-all duration-500 ${
            animate
              ? "fill-red-500 dark:fill-red-600"
              : "fill-black dark:fill-neutral-800"
          }`}
        />

        {/* Central small circle */}
        {animate ? (
          <motion.text
            x="50"
            y="58"
            fontSize="32"
            fontWeight="bold"
            fill="black"
            textAnchor="middle"
            initial={{
              opacity: 0,
              scale: 0,
              rotate: 180,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            @
          </motion.text>
        ) : (
          <circle
            cx="50"
            cy="50"
            r="10"
            className={`transition-all duration-500 ${
              animate ? "fill-black" : "fill-white"
            }`}
          />
        )}

        {/* Orbiting circles and connecting lines */}
        <g
          className={`${animate ? "animate-spin" : ""}`}
          style={{ transformOrigin: "center", animationDuration: "2s" }}
        >
          <circle
            cx="50"
            cy="15"
            r="8"
            className={`transition-all duration-500 ${
              animate ? "fill-black" : "fill-white"
            }`}
          />
          <line
            x1="50"
            y1="25"
            x2="50"
            y2="40"
            className={`transition-all duration-500 ${
              animate ? "stroke-black" : "stroke-white"
            }`}
            strokeWidth="2"
          />

          <circle
            cx="80"
            cy="50"
            r="8"
            className={`transition-all duration-500 ${
              animate ? "fill-black" : "fill-white"
            }`}
          />
          <line
            x1="70"
            y1="50"
            x2="60"
            y2="50"
            className={`transition-all duration-500 ${
              animate ? "stroke-black" : "stroke-white"
            }`}
            strokeWidth="2"
          />

          <circle
            cx="50"
            cy="85"
            r="8"
            className={`transition-all duration-500 ${
              animate ? "fill-black" : "fill-white"
            }`}
          />
          <line
            x1="50"
            y1="75"
            x2="50"
            y2="60"
            className={`transition-all duration-500 ${
              animate ? "stroke-black" : "stroke-white"
            }`}
            strokeWidth="2"
          />

          <circle
            cx="20"
            cy="50"
            r="8"
            className={`transition-all duration-500 ${
              animate ? "fill-black" : "fill-white"
            }`}
          />
          <line
            x1="30"
            y1="50"
            x2="40"
            y2="50"
            className={`transition-all duration-500 ${
              animate ? "stroke-black" : "stroke-white"
            }`}
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}
