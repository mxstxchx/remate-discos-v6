"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { animate } from "framer-motion"
import { cn } from "@/lib/utils"

const AnimatedSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    variant?: "default" | "pitchControl"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const thumbRef = React.useRef<HTMLSpanElement>(null);
  const trackRef = React.useRef<HTMLSpanElement>(null);
  const rangeRef = React.useRef<HTMLSpanElement>(null);

  // Handle thumb drag animation
  const handleDragStart = () => {
    if (thumbRef.current) {
      animate(
        thumbRef.current,
        { transform: 'scale(1.15)' },
        { duration: 0.2, easing: "ease-out" }
      );
    }
  };

  const handleDragEnd = () => {
    if (thumbRef.current) {
      animate(
        thumbRef.current,
        { transform: 'scale(1)' },
        { duration: 0.3, easing: [0.22, 1.2, 0.36, 1] }
      );
    }
  };

  // Add subtle animation when value changes
  React.useEffect(() => {
    if (!thumbRef.current || !rangeRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style' && rangeRef.current) {
          // Add subtle pulse to the track when value changes
          animate(
            rangeRef.current,
            { opacity: [0.7, 1] as any },
            { duration: 0.3, easing: "ease-out" }
          );
        }
      });
    });

    observer.observe(rangeRef.current, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={variant === 'pitchControl' ? "relative" : ""}>
      {variant === 'pitchControl' && (
        <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none" aria-hidden="true">
          {/* Create pitch markers */}
          {Array.from({ length: 19 }).map((_, i) => {
            const percent = i * 5 + 5;
            const isMajor = i % 2 === 0;
            return (
              <React.Fragment key={`markers-${i}`}>
                <div 
                  className={cn(
                    "absolute top-0 w-0.5 transform -translate-x-1/2",
                    isMajor ? "h-2.5 bg-primary/50" : "h-1.5 bg-primary/30"
                  )} 
                  style={{ left: `${percent}%` }}
                />
                <div 
                  className={cn(
                    "absolute bottom-0 w-0.5 transform -translate-x-1/2",
                    isMajor ? "h-2.5 bg-primary/50" : "h-1.5 bg-primary/30"
                  )} 
                  style={{ left: `${percent}%` }}
                />
              </React.Fragment>
            );
          })}
        </div>
      )}
      
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          variant === 'pitchControl' ? "py-6" : "",
          className
        )}
        onPointerDown={handleDragStart}
        onPointerUp={handleDragEnd}
        {...props}
      >
        <SliderPrimitive.Track 
          ref={trackRef}
          className={cn(
            "relative w-full grow overflow-hidden rounded-full",
            variant === 'pitchControl' 
              ? "h-2.5 bg-muted/50 border border-primary/20 texture-sandblasted" 
              : "h-1.5 bg-primary/20"
          )}
        >
          <SliderPrimitive.Range 
            ref={rangeRef}
            className={cn(
              "absolute h-full",
              variant === 'pitchControl'
                ? "bg-gradient-to-r from-primary-dark via-primary to-primary-dark"
                : "bg-primary"
            )} 
          />
        </SliderPrimitive.Track>
        
        {props.defaultValue?.map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            ref={i === 0 ? thumbRef : undefined}
            className={cn(
              "block rounded-full border shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 transition-all duration-200",
              variant === 'pitchControl'
                ? "h-7 w-7 border-primary/80 bg-secondary texture-knurled hover:cursor-grab active:cursor-grabbing active:border-primary"
                : "h-4 w-4 border-primary/50 bg-background"
            )}
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  )
})
AnimatedSlider.displayName = SliderPrimitive.Root.displayName

export { AnimatedSlider }
