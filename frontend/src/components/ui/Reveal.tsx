/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealProps {
  children?: React.ReactNode;
  /** Seconds to hold before starting — stagger a row of cards with 0, .08, .16, … */
  delay?: number;
  /** How far it travels in. Keep it small; this is a settle, not an entrance. */
  y?: number;
  className?: string;
  key?: React.Key;
}

/**
 * Fades content up as it scrolls into view, once. Deliberately understated: a short distance, a
 * single easing, and no repeat — the movement should register as the page settling rather than as
 * an effect. Anything that draws attention to itself belongs in the content, not the transition.
 *
 * Honours prefers-reduced-motion by rendering the final state immediately.
 */
export default function Reveal({ children, delay = 0, y = 16, className = '' }: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // `once` matters: re-animating on every pass turns a calm page into a nervous one.
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
