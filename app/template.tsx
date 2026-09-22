"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Subtle top navigation accent bar */}
      <motion.div
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{
          scaleX: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.25, delay: 0.3, ease: "easeOut" },
        }}
        style={{ transformOrigin: "0% 50%" }}
        className="fixed top-0 left-0 right-0 h-[2.5px] bg-[#3157D5] z-9999 pointer-events-none"
      />

      {/* Page Content Entry with subtle vertical ease & fade */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.25,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="flex-1 flex flex-col w-full"
      >
        {children}
      </motion.div>
    </>
  );
}
