// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fonction utilitaire pour fusionner les classes Tailwind
 * Elle utilise clsx pour la logique conditionnelle et tailwind-merge pour éviter les conflits.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}