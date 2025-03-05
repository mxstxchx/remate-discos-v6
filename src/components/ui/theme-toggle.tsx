"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { animate } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = React.useState(false);

  // Only show the toggle UI once mounted on the client
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Apply animation when theme changes
  React.useEffect(() => {
    if (!buttonRef.current || !mounted) return;
    
    // Button spin animation - cast as any to fix type error
    animate(
      buttonRef.current,
      { transform: `rotate(${theme === 'dark' ? 180 : 0}deg)` } as any,
      { duration: 0.5, easing: [0.34, 1.56, 0.64, 1] } as any
    );
  }, [theme, mounted]);

  if (!mounted) {
    return <Button variant="knurled" size="icon" className="rounded-full overflow-hidden relative w-9 h-9" />;
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          ref={buttonRef}
          variant="knurled" 
          size="icon" 
          className="rounded-full overflow-hidden relative"
        >
          <Sun className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-0 scale-0 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
          <Moon className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 rotate-90'}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="texture-sandblasted"
        sideOffset={8}
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
