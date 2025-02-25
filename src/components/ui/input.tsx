import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

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

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
