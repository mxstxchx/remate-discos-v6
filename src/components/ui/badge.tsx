import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-b from-primary to-primary-dark text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent texture-sandblasted bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: 
          "text-foreground",
        metallic:
          "border-primary/20 texture-brushed-metal bg-secondary/90 text-secondary-foreground",
        success:
          "border-transparent bg-status-success/90 text-white shadow hover:bg-status-success",
        error:
          "border-transparent bg-status-error/90 text-white shadow hover:bg-status-error",
        info:
          "border-transparent bg-status-info/90 text-white shadow hover:bg-status-info",
        warning:
          "border-transparent bg-status-warning/90 text-black shadow hover:bg-status-warning",
      },
      led: {
        none: "",
        on: "pl-7 relative before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:size-3",
      },
      ledColor: {
        none: "",
        success: "before:led before:led-success",
        error: "before:led before:led-error",
        info: "before:led before:led-info",
        warning: "before:led before:led-warning",
      },
    },
    compoundVariants: [
      {
        variant: "success",
        led: "on",
        ledColor: "none",
        className: "before:led before:led-success",
      },
      {
        variant: "error",
        led: "on",
        ledColor: "none",
        className: "before:led before:led-error",
      },
      {
        variant: "info",
        led: "on",
        ledColor: "none",
        className: "before:led before:led-info",
      },
      {
        variant: "warning",
        led: "on",
        ledColor: "none",
        className: "before:led before:led-warning",
      },
    ],
    defaultVariants: {
      variant: "default",
      led: "none",
      ledColor: "none",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, led, ledColor, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, led, ledColor }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
