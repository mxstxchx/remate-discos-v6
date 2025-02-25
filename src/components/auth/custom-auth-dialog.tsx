"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const AuthDialog = DialogPrimitive.Root;

const AuthDialogTrigger = DialogPrimitive.Trigger;

const AuthDialogClose = DialogPrimitive.Close;

const AuthDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AuthDialogOverlay.displayName = "AuthDialogOverlay";

const AuthDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <AuthDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[51] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-primary/10 bg-background p-6 shadow-lg sm:rounded-lg overflow-hidden",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "before:!hidden before:!content-none after:!hidden after:!content-none",
        className
      )}
      style={{
        // Ensure no pseudo-elements are applied
        "--before-content": "none",
        "--after-content": "none",
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full w-6 h-6 flex items-center justify-center bg-secondary/80 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none hover:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
AuthDialogContent.displayName = "AuthDialogContent";

const AuthDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
AuthDialogHeader.displayName = "AuthDialogHeader";

const AuthDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
AuthDialogFooter.displayName = "AuthDialogFooter";

const AuthDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-heading font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
AuthDialogTitle.displayName = "AuthDialogTitle";

const AuthDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AuthDialogDescription.displayName = "AuthDialogDescription";

export {
  AuthDialog,
  AuthDialogTrigger,
  AuthDialogClose,
  AuthDialogContent,
  AuthDialogHeader,
  AuthDialogFooter,
  AuthDialogTitle,
  AuthDialogDescription,
};
