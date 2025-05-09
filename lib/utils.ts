import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name?: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return "";
  }

  const parts = trimmedName.split(/\s+/).filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "";
  }

  let initials = parts[0][0];

  if (parts.length > 1) {
    initials += parts[parts.length - 1][0];
  }

  return initials.toUpperCase();
}
