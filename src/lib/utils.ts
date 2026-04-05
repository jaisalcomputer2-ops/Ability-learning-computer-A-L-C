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
  
  // Handle Dropbox links
  if (url.includes('dropbox.com')) {
    return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '').replace('?dl=1', '');
  }
  
  // Handle Catbox.moe links (ensure they are direct)
  if (url.includes('catbox.moe') && !url.includes('files.catbox.moe')) {
    return url.replace('catbox.moe', 'files.catbox.moe');
  }
  
  return url;
}

export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  let videoId = "";
  
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.includes('/watch')) {
        videoId = urlObj.searchParams.get('v') || "";
      } else if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1].split('/')[0];
      } else if (urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1].split('/')[0];
      } else if (urlObj.pathname.includes('/v/')) {
        videoId = urlObj.pathname.split('/v/')[1].split('/')[0];
      }
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }
  } catch (e) {
    // Fallback to old logic if URL parsing fails
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1].split('?')[0];
    }
  }
  
  if (!videoId) return "";
  
  // Use window.location.origin to fix embed errors
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;
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
