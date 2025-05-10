# **App Name**: LexiCLI

## Core Features:

- Data Loading & Menu Display: Load vocabulary data from the bundled vocab.json file on startup and display the main menu.
- Learning Session: Conduct learning sessions based on user-defined index ranges and learning direction (English to Japanese, or vice versa).
- Missed Word Review: Review previously missed words stored in IndexedDB, updating the list based on the user's performance during the review.
- Word Search: Search for words in the vocabulary list by partial match in both English and Japanese.
- CLI Interface: Implements an interactive CLI-like experience within the app, mimicking a terminal interface for navigation and input.

## Style Guidelines:

- Base color: Dark grey (#333333) to mimic a terminal background.
- Text color: Light green (#98FF98) for main text, providing readability and a classic CLI feel.
- Accent: Bright cyan (#00FFFF) for prompts and user input areas.
- Monospace font for all text to ensure consistent character width and a true CLI appearance.
- A scrollable output area at the top and a fixed single-line input area at the bottom.
- Subtle blinking cursor in the input area to indicate where the text will be entered.