import React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Handle Enter and Space key presses to trigger a click on the target element.
 * This is useful for accessibility on non-button elements or ensuring consistent behavior.
 */
export function handleKey(e: React.KeyboardEvent<any>) {
  if (e.key === "Enter" || e.key === " ") {
    // Prevent default scrolling for Space key
    if (e.key === " ") {
      e.preventDefault();
    }
    // Trigger click on the target element
    (e.target as HTMLElement).click();
  }
}
