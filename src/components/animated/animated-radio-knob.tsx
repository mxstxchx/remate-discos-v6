"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { animate } from "framer-motion";
import { cn } from "@/lib/utils";

const AnimatedRadioGroupKnob = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  // Create a ref to the radio element for animations
  const knobRef = React.useRef<HTMLButtonElement>(null);
  const forwardedRef = ref || knobRef;
  
  // Track press state
  const [isPressed, setIsPressed] = React.useState(false);
  
  // Handle press animation
  React.useEffect(() => {
    if (!knobRef.current) return;
    
    if (isPressed) {
      animate(
        knobRef.current,
        { transform: 'rotate(15deg)' },
        { duration: 0.3, easing: [0.34, 1.56, 0.64, 1] } // Spring-like
      );
    } else {
      animate(
        knobRef.current,
        { transform: 'rotate(0deg)' },
        { duration: 0.5, easing: "ease-out" }
      );
    }
  }, [isPressed]);
  
  return (
    <RadioGroupPrimitive.Item
      ref={forwardedRef as any}
      className={cn(
        "relative h-10 w-10 rounded-full border border-primary/20 bg-secondary texture-knurled shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-150 hover:scale-105 hover:border-primary/50 data-[state=checked]:scale-110 data-[state=checked]:border-primary/80",
        "after:absolute after:inset-[3px] after:rounded-full after:bg-black/10 after:opacity-0 data-[state=checked]:after:opacity-100",
        className
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center h-full w-full">
        <div className="h-2 w-2 rounded-full bg-primary absolute"></div>
        <div className="h-5 w-0.5 bg-gradient-to-b from-primary to-primary-dark absolute top-1"></div>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

AnimatedRadioGroupKnob.displayName = "AnimatedRadioGroupKnob";

export { AnimatedRadioGroupKnob };
