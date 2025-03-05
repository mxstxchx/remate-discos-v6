"use client";

import * as React from "react";
import { animate } from "framer-motion";
import { Card, cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "vinyl" | "metallic" | "matte";
  hover?: "default" | "lift" | "glow" | "none";
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, variant, hover, children, ...props }, ref) => {
    // Create a ref to the card element for animations
    const cardRef = React.useRef<HTMLDivElement>(null);
    const forwardedRef = ref || cardRef;
    
    // Track hover state
    const [isHovered, setIsHovered] = React.useState(false);
    
    // Handle hover animation
    React.useEffect(() => {
      if (!cardRef.current || hover !== "lift") return;
      
      if (isHovered) {
        animate(cardRef.current, 
          { y: -4 }, 
          { duration: 0.3, ease: "easeOut" }
        );
      } else {
        animate(cardRef.current, 
          { y: 0 }, 
          { duration: 0.3, ease: "easeOut" }
        );
      }
    }, [isHovered, hover]);
    
    return (
      <div
        ref={forwardedRef}
        className={cn(cardVariants({ variant, hover, className }))}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

export { AnimatedCard };
