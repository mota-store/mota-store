import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";

interface Position {
  x: number;
  y: number;
}

interface FlyToCartProps {
  startPos: Position;
  endPos: Position;
  onComplete: () => void;
}

export function FlyToCart({ startPos, endPos, onComplete }: FlyToCartProps) {
  const midX = (startPos.x + endPos.x) / 2;
  const midY = Math.min(startPos.y, endPos.y) - 80;

  return (
    <motion.div
      initial={{ 
        x: startPos.x - 14, 
        y: startPos.y - 14, 
        scale: 1, 
        opacity: 1 
      }}
      animate={{
        x: [startPos.x - 14, midX, endPos.x - 6],
        y: [startPos.y - 14, midY, endPos.y - 6],
        scale: [1, 0.8, 0.4],
        opacity: [1, 1, 0],
      }}
      transition={{ 
        duration: 0.75, 
        ease: "easeInOut" 
      }}
      onAnimationComplete={onComplete}
      className="fixed z-[9999] pointer-events-none text-accent"
    >
      <ShoppingCart size={28} strokeWidth={3} />
    </motion.div>
  );
}

export function FlyAnimationsContainer({ 
  animations, 
  onRemove 
}: { 
  animations: Array<{ id: number; startPos: Position; endPos: Position }>;
  onRemove: (id: number) => void;
}) {
  return (
    <AnimatePresence>
      {animations.map((anim) => (
        <FlyToCart
          key={anim.id}
          startPos={anim.startPos}
          endPos={anim.endPos}
          onComplete={() => onRemove(anim.id)}
        />
      ))}
    </AnimatePresence>
  );
}
