export interface Word {
  ja: string;
  en: string;
  id?: number; // Optional: for easier tracking if needed, not in vocab.json
}

export type AppMode =
  | 'LOADING'
  | 'MENU'
  | 'LEARN_RANGE'
  | 'LEARN_DIRECTION'
  | 'LEARNING'
  | 'LEARN_SAVE_TESTNAME'
  | 'REVIEW_CHOOSE_TEST'
  | 'REVIEW_TESTNAME'
  | 'REVIEWING'
  | 'SEARCH_TERM'
  | 'SEARCH_RESULTS'
  | 'EXITED'
  | 'ERROR';

export interface OutputLineData {
  id: string; // Unique ID for React key
  type: 'system' | 'prompt' | 'user' | 'error' | 'info' | 'success' | 'header' | 'question' | 'answer';
  content: string | JSX.Element;
  timestamp?: number;
}

export interface LearningSession {
  words: Word[];
  currentIndex: number;
  correctAnswers: number;
  totalQuestions: number;
  missedInSession: Word[];
  direction: 'en-to-ja' | 'ja-to-en';
  originalRange?: string; // e.g. "1-10"
}

export interface ReviewSession extends LearningSession {
  testName: string;
  initialWords: Word[]; // To compare and see which ones were answered correctly
}

export const DB_NAME = 'LexiCliDB';
export const DB_VERSION = 1;
export const MISSED_WORDS_STORE_NAME = 'missedWords';
