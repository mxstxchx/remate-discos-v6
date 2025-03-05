"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { animate } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Extend the ButtonProps to include variants and motion props
interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "knurled" | "led";
  size?: "default" | "sm" | "lg" | "icon";
  ledColor?: "success" | "error" | "info" | "warning" | "none";
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, variant, size, ledColor, asChild = false, ...props }, ref) => {
    // Create a ref to the button element for animations
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const forwardedRef = ref || buttonRef;
    
    // Handle press animation
    const handlePressStart = () => {
      if (buttonRef.current) {
        animate(buttonRef.current, 
          { scale: 0.98 }, 
          { duration: 0.2, ease: "easeOut" }
        );
      }
    };
    
    const handlePressEnd = () => {
      if (buttonRef.current) {
        animate(buttonRef.current, 
          { scale: 1 }, 
          { duration: 0.2, ease: "easeOut" }
        );
      }
    };
    
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        ref={forwardedRef as any}
        className={cn(
          buttonVariants({ variant, size, ledColor, className })
        )}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        {...props}
      />
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };
