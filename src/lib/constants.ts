export const APP_NAME = "LexiCLI";
export const PROMPT_SYMBOL = "> ";

export const MENU_OPTIONS = {
  LEARN: "1",
  REVIEW: "2",
  SEARCH: "3",
  LOAD_VOCAB: "4",
  EXIT: "5",
};

export const UI_TEXTS = {
  WELCOME: `Welcome to ${APP_NAME}!`,
  LOADING_VOCAB: "Loading vocabulary...",
  VOCAB_LOAD_SUCCESS: (count: number) => `${count} words loaded successfully.`,
  VOCAB_LOAD_ERROR: "Error loading vocabulary. The application cannot start.",
  MAIN_MENU_HEADER: "Main Menu:",
  MENU_LEARN: `${MENU_OPTIONS.LEARN}. 学習セッション (Learn new words)`,
  MENU_REVIEW: `${MENU_OPTIONS.REVIEW}. 間違えた単語レビュー (Review missed words)`,
  MENU_SEARCH: `${MENU_OPTIONS.SEARCH}. 単語検索 (Search words)`,
  MENU_LOAD_VOCAB: `${MENU_OPTIONS.LOAD_VOCAB}. 単語ファイル読込 (Load vocabulary file)`,
  MENU_EXIT: `${MENU_OPTIONS.EXIT}. 終了 (Exit)`,
  CHOOSE_OPTION: "Choose an option: ",
  INVALID_OPTION: "Invalid option. Please try again.",
  ENTER_RANGE: "Enter index range (e.g., 1-100, or 'all'): ",
  INVALID_RANGE: "Invalid range. Please use format 'start-end' (e.g. 1-50) or 'all'. Max range is ",
  CHOOSE_DIRECTION: "Choose learning direction (1: English -> Japanese, 2: Japanese -> English): ",
  INVALID_DIRECTION: "Invalid direction. Please enter 1 or 2.",
  STARTING_SESSION: "Starting session...",
  QUIZ_PROMPT: "Your answer ('q' to quit): ",
  CORRECT: "Correct!",
  INCORRECT_PREFIX: "Incorrect. Correct answer: ",
  SESSION_INTERRUPTED: "Session interrupted.",
  SESSION_SUMMARY: (correct: number, total: number) =>
    `Session finished. Correct: ${correct}/${total} (${((correct / total) * 100 || 0).toFixed(1)}%).`,
  NO_MISSED_WORDS: "No words missed in this session!",
  ENTER_TEST_NAME: "Enter a name for this missed words list (or press Enter to skip saving): ",
  TEST_NAME_EMPTY_SKIP: "Skipped saving missed words.",
  SAVING_MISSED_WORDS: "Saving missed words...",
  MISSED_WORDS_SAVED: (name: string) => `Missed words saved as '${name}'.`,
  MISSED_WORDS_SAVE_ERROR: "Error saving missed words.",
  CHOOSE_REVIEW_TEST: "Enter the name of the test to review (or 'ls' to list tests, 'menu' to return): ",
  AVAILABLE_TESTS: "Available tests:",
  NO_TESTS_FOUND: "No saved tests found.",
  TEST_NOT_FOUND: (name: string) => `Test '${name}' not found or is empty.`,
  LOADING_TEST: (name: string) => `Loading test '${name}'...`,
  REVIEW_ALL_CORRECT: "All words in this review test were answered correctly! Test list updated.",
  REVIEW_UPDATED: (name:string) => `Test '${name}' updated. Correctly answered words removed.`,
  REVIEW_UPDATE_ERROR: "Error updating review test.",
  ENTER_SEARCH_TERM: "Enter search term: ",
  SEARCHING: "Searching...",
  SEARCH_RESULTS_HEADER: "Search Results:",
  NO_SEARCH_RESULTS: "No words found matching your search.",
  PRESS_ANY_KEY_CONTINUE: "Press Enter to continue...",
  EXIT_MESSAGE: "Thank you for using LexiCLI! Closing session.",
  INDEXEDDB_NOT_SUPPORTED: "IndexedDB is not supported in your browser. Progress and custom vocabulary may not be saved.",
  INDEXEDDB_ERROR: "An error occurred with the database.",
  LISTING_TESTS_ERROR: "Could not retrieve test list.",
  LOADING_FROM_INDEXEDDB: "Attempting to load vocabulary from local storage...",
  LOADED_FROM_INDEXEDDB_SUCCESS: (count: number) => `Loaded ${count} words from local storage.`,
  INDEXEDDB_EMPTY_FALLBACK_FETCH: "No vocabulary found in local storage or error occurred. Attempting to fetch default vocabulary...",
  FETCH_FALLBACK_SUCCESS_SAVED_INDEXEDDB: "Default vocabulary loaded and saved to local storage.",
  FETCH_FALLBACK_FAIL: "Failed to load default vocabulary. You can try loading a file with 'loadvocab' command.",
  PROMPT_LOAD_VOCAB_FILE: "Please select a '.json' vocabulary file.",
  VOCAB_FILE_SELECTED: (fileName: string) => `Selected file: ${fileName}. Processing...`,
  VOCAB_FILE_LOAD_SUCCESS: (count: number) => `Successfully loaded and saved ${count} words from file.`,
  VOCAB_FILE_LOAD_INVALID: "Invalid file format. The file must be a JSON array of {'ja': string, 'en': string} objects.",
  VOCAB_FILE_LOAD_ERROR: (errorMsg: string) => `Error loading vocabulary file: ${errorMsg}`,
  VOCAB_FILE_NO_FILE_SELECTED: "No file selected. Returning to menu.",
};
