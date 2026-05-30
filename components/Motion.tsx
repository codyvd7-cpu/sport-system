'use client';

// Shared framer-motion animation components
// Use these instead of the manual mounted/fade pattern

import { motion, AnimatePresence } from 'framer-motion';
import * as React from 'react';

// Fade up — replaces manual fade() style function
export function FadeUp({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// Staggered list — children fade in one by one
export function StaggerList({
  children,
  className,
  stagger = 40,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger / 1000 } },
      }}
    >
      {children}
    </motion.div>
  );
}

// Stagger item — use inside StaggerList
export function StaggerItem({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden:  { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
    >
      {children}
    </motion.div>
  );
}

// Scale in — good for cards appearing
export function ScaleIn({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// Slide in from left — good for sidebars/modals
export function SlideIn({
  children,
  from = 'bottom',
  className,
}: {
  children: React.ReactNode;
  from?: 'left' | 'right' | 'bottom' | 'top';
  className?: string;
}) {
  const initial = {
    left:   { opacity: 0, x: -24 },
    right:  { opacity: 0, x:  24 },
    bottom: { opacity: 0, y:  24 },
    top:    { opacity: 0, y: -24 },
  }[from];

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover card — premium lift effect on hover
export function HoverCard({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      onClick={onClick}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
    >
      {children}
    </motion.div>
  );
}

// Presence wrapper — for conditional renders with exit animation
export function Presence({
  children,
  show,
}: {
  children: React.ReactNode;
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Number counter animation
export function CountUp({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const step = (end - start) / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span className={className} style={style}>{display}</span>;
}
