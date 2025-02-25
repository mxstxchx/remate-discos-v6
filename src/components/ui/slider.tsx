"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      variant: {
        default: "",
        pitchControl: "py-6", // Extra padding for the pitch control markings
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const trackVariants = cva(
  "relative w-full grow overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        default: "h-1.5 bg-primary/20",
        pitchControl: "h-2.5 bg-muted/50 border border-primary/20 texture-sandblasted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const rangeVariants = cva(
  "absolute h-full",
  {
    variants: {
      variant: {
        default: "bg-primary",
        pitchControl: "bg-gradient-to-r from-primary-dark via-primary to-primary-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const thumbVariants = cva(
  "block rounded-full border shadow transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "h-4 w-4 border-primary/50 bg-background",
        pitchControl: "h-7 w-7 border-primary/80 bg-secondary texture-knurled hover:cursor-grab active:cursor-grabbing active:border-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant, ...props }, ref) => {
  const id = React.useId();
  const isRange = Array.isArray(props.defaultValue) && props.defaultValue.length > 1;
  
  return (
    <div className={variant === 'pitchControl' ? "relative" : ""}>
      {variant === 'pitchControl' && (
        <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none" aria-hidden="true">
          {/* Create pitch markers */}
          {Array.from({ length: 19 }).map((_, i) => {
            const percent = i * 5 + 5;
            const isMajor = i % 2 === 0;
            return (
              <div 
                key={i} 
                className={cn(
                  "absolute top-0 w-0.5 transform -translate-x-1/2",
                  isMajor ? "h-2.5 bg-primary/50" : "h-1.5 bg-primary/30"
                )} 
                style={{ left: `${percent}%` }}
              />
            );
          })}
          {/* Create bottom markers too */}
          {Array.from({ length: 19 }).map((_, i) => {
            const percent = i * 5 + 5;
            const isMajor = i % 2 === 0;
            return (
              <div 
                key={`bottom-${i}`} 
                className={cn(
                  "absolute bottom-0 w-0.5 transform -translate-x-1/2",
                  isMajor ? "h-2.5 bg-primary/50" : "h-1.5 bg-primary/30"
                )} 
                style={{ left: `${percent}%` }}
              />
            );
          })}
        </div>
      )}
      
      <SliderPrimitive.Root
        ref={ref}
        className={cn(sliderVariants({ variant }), className)}
        {...props}
      >
        <SliderPrimitive.Track className={cn(trackVariants({ variant }))}>
          <SliderPrimitive.Range className={cn(rangeVariants({ variant }))} />
        </SliderPrimitive.Track>
        
        {/* If we have a range slider, render two thumbs */}
        {isRange ? (
          <>
            <SliderPrimitive.Thumb 
              className={cn(thumbVariants({ variant }))}
              aria-label="Min value"
            />
            <SliderPrimitive.Thumb 
              className={cn(thumbVariants({ variant }))}
              aria-label="Max value"
            />
          </>
        ) : (
          <SliderPrimitive.Thumb 
            className={cn(thumbVariants({ variant }))}
          />
        )}
      </SliderPrimitive.Root>
    </div>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
