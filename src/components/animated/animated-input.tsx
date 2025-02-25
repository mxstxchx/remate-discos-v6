"use client"

import * as React from "react"
import { animate } from "motion"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const inputVariants = cva(
  "flex h-9 w-full rounded-md border border-input shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: 
          "bg-transparent px-3 py-1 text-base focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
        inset: 
          "bg-muted/30 px-3 py-1 text-base focus-visible:bg-transparent texture-sandblasted focus-visible:texture-none",
        metallic: 
          "bg-secondary/50 px-3 py-1 text-base border-primary/20 texture-brushed-metal focus-visible:border-primary/50"
      },
      size: {
        default: "h-9",
        sm: "h-8 text-xs px-2 py-1 rounded-sm",
        lg: "h-10 px-4 py-2 text-base rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface AnimatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = (node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    // Handle focus/blur animations
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (props.onFocus) props.onFocus(e);
      
      if (inputRef.current) {
        animate(
          inputRef.current,
          { scale: 1.01 },
          { duration: 0.25, easing: "ease-out" }
        );
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (props.onBlur) props.onBlur(e);
      
      if (inputRef.current) {
        animate(
          inputRef.current,
          { scale: 1 },
          { duration: 0.25, easing: "ease-out" }
        );
      }
    };

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={combinedRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";

export { AnimatedInput, inputVariants };
