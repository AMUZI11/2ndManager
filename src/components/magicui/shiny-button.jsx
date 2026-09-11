"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

const animationProps = {
  initial: { "--x": "100%", scale: 0.8 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
};

export const ShinyButton = React.forwardRef(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        {...animationProps}
        {...props}
        className={cn(
          "relative rounded-full px-8 py-3 font-medium backdrop-blur-xl transition-[box-shadow] duration-300 ease-in-out hover:shadow",
          "bg-[#F59E0B] text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-[#F59E0B]",
          className
        )}
      >
        <span
          className="relative block h-full w-full text-xl font-bold tracking-wide text-black"
          style={{
            maskImage:
              "linear-gradient(-75deg,black calc(var(--x) + 20%),transparent calc(var(--x) + 30%),black calc(var(--x) + 100%))",
          }}
        >
          {children}
        </span>
        <span
          style={{
            mask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
            maskComposite: "exclude",
          }}
          className="absolute inset-0 z-10 block rounded-[inherit] bg-[linear-gradient(-75deg,rgba(255,255,255,0.1)_calc(var(--x)+20%),rgba(255,255,255,0.5)_calc(var(--x)+25%),rgba(255,255,255,0.1)_calc(var(--x)+100%))] p-px"
        ></span>
      </motion.button>
    );
  }
);

ShinyButton.displayName = "ShinyButton";
