import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] active:shadow-inset-tight",
  {
    variants: {
      variant: {
        default:
          "relative bg-gradient-to-b from-primary to-primary-dark text-primary-foreground shadow-md hover:brightness-110 border border-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 texture-sandblasted",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        knurled: 
          "relative border border-primary/20 bg-secondary text-secondary-foreground before:absolute before:inset-0 before:texture-knurled before:opacity-30 before:pointer-events-none hover:before:opacity-50 shadow-sm",
        led: 
          "bg-muted text-foreground relative pl-8 border border-secondary/80 hover:border-primary/30",
      },
      ledColor: {
        none: "",
        success: "before:led before:led-success",
        error: "before:led before:led-error",
        info: "before:led before:led-info",
        warning: "before:led before:led-warning",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    compoundVariants: [
      {
        variant: "led",
        ledColor: ["success", "error", "info", "warning"],
        className: "before:absolute before:left-2 before:top-1/2 before:size-3 before:-translate-y-1/2",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      ledColor: "none",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ledColor, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, ledColor, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
