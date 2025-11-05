"use client";

import { motion } from "framer-motion";
import { Boxes, Loader2 } from "lucide-react";

interface LoadingPageProps {}

const LoadingPage = ({}: LoadingPageProps) => {
  return (
    <div className="from-primary/5 via-background to-primary/10 flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br">
      {/* Logo + App Name */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex flex-col items-center justify-center space-y-2"
      >
        <div className="flex items-center space-x-2">
          <Boxes className="text-primary h-10 w-10" />
          <h1 className="text-primary text-2xl font-semibold">Stocking App</h1>
        </div>
      </motion.div>

      {/* Loading Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, rotate: 360 }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 1.2,
        }}
      >
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
      </motion.div>

      {/* Optional text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground mt-6 text-sm"
      >
        Loading, please wait...
      </motion.p>
    </div>
  );
};

export default LoadingPage;
