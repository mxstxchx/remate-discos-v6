"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary/40 bg-background shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/80",
        "after:absolute after:inset-0 after:rounded-full after:opacity-0 after:transition-opacity data-[state=checked]:after:opacity-100",
        "after:bg-gradient-to-b after:from-primary after:to-primary-dark after:scale-[0.5]",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground relative z-10"></div>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

// Create a radio group with knob-like styling
const RadioGroupKnob = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "relative h-10 w-10 rounded-full border border-primary/20 bg-secondary texture-knurled shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
      "transition-all duration-150 hover:scale-105 hover:border-primary/50 data-[state=checked]:scale-110 data-[state=checked]:border-primary/80",
      "after:absolute after:inset-[3px] after:rounded-full after:bg-black/10 after:opacity-0 data-[state=checked]:after:opacity-100",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center h-full w-full">
      <div className="h-2 w-2 rounded-full bg-primary absolute"></div>
      <div className="h-5 w-0.5 bg-gradient-to-b from-primary to-primary-dark absolute top-1"></div>
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupKnob.displayName = "RadioGroupKnob";

export { RadioGroup, RadioGroupItem, RadioGroupKnob }
