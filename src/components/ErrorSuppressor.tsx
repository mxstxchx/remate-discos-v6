'use client'

import { useEffect } from 'react'

export function ErrorSuppressor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    // Suppress WebSocket error messages in console
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Filter out WebSocket-related errors
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('WebSocket') || 
           args[0].includes('wss://') || 
           args[0].includes('realtime') || 
           args[0].includes('interrupted'))) {
        console.debug('WebSocket error suppressed');
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    // Override window.onerror to catch WebSocket connection errors
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (message && 
          (typeof message === 'string' && 
          (message.includes('WebSocket') || 
           message.includes('wss://') || 
           message.includes('realtime')))) {
        console.debug('WebSocket window error suppressed');
        return true; // Prevent default error handling
      }
      return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
    };
    
    return () => {
      console.error = originalConsoleError;
      window.onerror = originalOnError;
    };
  }, []);

  return null; // This component does not render anything
}