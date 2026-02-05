import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function toConversationalTone(text: string): string {
  // Simple heuristic mapping for now, can be expanded with AI later
  const endings = {
    "합니다.": "해요.",
    "입니다.": "이에요.",
    "하십시오.": "해보세요.",
    "않습니다.": "않아요.",
    "됩니다.": "돼요.",
    "없습니다.": "없어요.",
    "있습니다.": "있어요.",
  };

  let newText = text;
  Object.entries(endings).forEach(([formal, casual]) => {
    newText = newText.replace(new RegExp(formal, 'g'), casual);
  });

  return newText;
}
