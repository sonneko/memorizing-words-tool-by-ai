import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Word } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fisher-Yates (aka Knuth) Shuffle
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export const parseRange = (rangeStr: string, max: number): [number, number] | null => {
  if (rangeStr.toLowerCase() === 'all') {
    return [0, max - 1];
  }
  const parts = rangeStr.split('-');
  if (parts.length !== 2) return null;
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);

  if (isNaN(start) || isNaN(end) || start < 1 || end > max || start > end) {
    return null;
  }
  return [start - 1, end - 1]; // 0-indexed
};


const normalizeJapaneseString = (ja: string): string => {
  // \uff08 and \uff09 are full-width parentheses
  return ja.replace(/\（[^）]*\）|\([^)]*\)|\s+/g, '').trim();
};

const splitJapaneseAnswers = (ja: string): string[] => {
  // Remove content within parentheses first, then split
  const cleanedJa = ja.replace(/\（[^）]*\）|\([^)]*\)/g, '');
  // Split by full-width or half-width semicolon/comma
  return cleanedJa.split(/[；，;,]/).map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
};


export const checkAnswer = (
  userInput: string,
  correctWord: Word,
  direction: 'en-to-ja' | 'ja-to-en'
): boolean => {
  const normalizedInput = userInput.toLowerCase().trim();

  if (direction === 'ja-to-en') {
    return normalizedInput === correctWord.en.toLowerCase().trim();
  } else { // en-to-ja
    const possibleJaAnswers = splitJapaneseAnswers(correctWord.ja);
    if (possibleJaAnswers.length === 0) return false;

    // Check first answer with particle (を, に) flexibility
    const firstAnswer = possibleJaAnswers[0]; // Already toLowerCase() from splitJapaneseAnswers
    
    // If the first correct answer starts with "を" or "に"
    if (firstAnswer.startsWith('を') || firstAnswer.startsWith('に')) {
      // User input matches full answer OR user input matches answer without particle
      if (normalizedInput === firstAnswer || normalizedInput === firstAnswer.substring(1)) {
        return true;
      }
    } else {
      // Standard match for first answer if no particle
      if (normalizedInput === firstAnswer) {
        return true;
      }
    }

    // Check subsequent answers for exact match
    for (let i = 1; i < possibleJaAnswers.length; i++) {
      if (normalizedInput === possibleJaAnswers[i]) { // Already toLowerCase()
        return true;
      }
    }
    return false;
  }
};

// Generates a simple unique ID for output lines
export const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const formatWordForDisplay = (word: Word): string => {
  return `${word.en} - ${word.ja}`;
};
