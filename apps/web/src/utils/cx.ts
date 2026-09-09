import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** SEAM-compatible className helper (alias of cn). */
export default function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
