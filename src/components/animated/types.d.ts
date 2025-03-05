// Type definitions for animated components
declare module "framer-motion" {
  export interface AnimateOptions {
    duration?: number;
    ease?: string | number[];
    delay?: number;
    type?: string;
  }

  export function animate(
    element: HTMLElement | SVGElement | null,
    keyframes: Record<string, any>,
    options?: AnimateOptions
  ): { stop: () => void };
}
