"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { animate } from "motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const AnimatedCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  const checkRef = React.useRef<SVGSVGElement>(null);
  const rootRef = React.useRef<HTMLButtonElement>(null);
  const combinedRef = (node: HTMLButtonElement) => {
    // Pass the ref to both our local ref and the forwarded ref
    rootRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // Handle animation when checked state changes
  React.useEffect(() => {
    if (!checkRef.current || !rootRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-state') {
          const newState = (mutation.target as HTMLElement).getAttribute('data-state');
          
          if (newState === 'checked') {
            // Scale in the checkbox
            animate(
              rootRef.current!,
              { scale: [0.95, 1.05, 1] },
              { duration: 0.3, easing: [0.22, 1.2, 0.36, 1] }
            );
            
            // Fade in and scale the check mark with a spring effect
            animate(
              checkRef.current!,
              { 
                opacity: [0, 1],
                scale: [0.5, 1.2, 1],
                rotate: [-10, 5, 0]
              },
              { duration: 0.3, easing: [0.22, 1.2, 0.36, 1] }
            );
          }
        }
      });
    });

    observer.observe(rootRef.current, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <CheckboxPrimitive.Root
      ref={combinedRef}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary/40 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-gradient-to-b data-[state=checked]:from-primary data-[state=checked]:to-primary-dark data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        "transition-all duration-200",
        "hover:border-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check ref={checkRef} className="h-3.5 w-3.5 opacity-0" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
AnimatedCheckbox.displayName = CheckboxPrimitive.Root.displayName

export { AnimatedCheckbox }
