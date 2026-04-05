import React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a Google Drive 'view' link to a direct download link.
 * This is necessary for HTML5 audio players to work with Drive-hosted files.
 */
export function getDirectAudioUrl(url: string): string {
  if (!url) return "";
  
  // Handle Google Drive links
  if (url.includes('drive.google.com')) {
    // Extract ID from various Drive link formats
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                        url.match(/id=([a-zA-Z0-9_-]+)/) ||
                        url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                        
    if (fileIdMatch && fileIdMatch[1]) {
      const id = fileIdMatch[1];
      // Use the direct download link format with confirm=t for large files
      // This helps bypass the virus scan warning for some public files
      return `https://drive.google.com/uc?export=download&id=${id}&confirm=t`;
    }
  }
  
  return url;
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
