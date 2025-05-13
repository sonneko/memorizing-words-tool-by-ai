# Words-CLI - CLI Word Learning PWA

**Words-CLI** is a Command Line Interface (CLI) style Progressive Web Application (PWA) designed for learning vocabulary, primarily Japanese-English words. It offers an offline-first experience, allowing users to study words, review missed ones, and load custom vocabulary sets.

**Note:** This application was primarily developed with the assistance of AI, aiming to showcase modern web development practices, PWA capabilities, and interactive CLI-like experiences in the browser.

## Key Features

- **Learn Mode:** Study words from the vocabulary, with options to select a range of words and the direction of learning (e.g., English to Japanese or Japanese to English).
- **Review Mode:** Practice words that were previously answered incorrectly. Missed words from learning sessions can be saved into named lists for targeted review.
- **Search Functionality:** Quickly find words within the loaded vocabulary.
- **Custom Vocabulary:** Load your own vocabulary lists from `.json` files. Loaded vocabularies are persisted in the browser's IndexedDB for offline access.
- **Offline First:** Thanks to PWA technologies and IndexedDB, the app works offline once the initial resources and vocabulary are cached.
- **CLI-like Interface:** All interactions happen through a terminal-like interface directly in your browser.
- **Responsive Design:** Adapts to various screen sizes.

## Getting Started

### Prerequisites

- Node.js (v18.x or later recommended, ideally v20.x)
- npm (comes with Node.js)
- A modern web browser (Chrome, Edge, Firefox, Safari)

### Installation

1.  **Clone the repository (if applicable):**
    ```bash
    # If you have the source code
    # git clone <repository-url>
    # cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    npm ci # Recommended for consistent installs
    ```

## Running Locally

-   **Development Mode:**
    Starts the Next.js development server with Fast Refresh.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.

-   **Build for Production (Static Site Generation):**
    This command builds the application into static HTML, CSS, and JavaScript files in the `out/` directory.
    ```bash
    npm run build
    ```

-   **Start Production Server (for serving static files):**
    While `npm run build` with `output: 'export'` generates static files, you might want to serve them locally to test.
    ```bash
    npm run start
    ```
    This will typically serve the static build from the `out/` directory.

## How to Use Words-CLI

Once the application is running in your browser:

1.  **Main Menu:**
    You'll be greeted with the main menu. Type the number corresponding to your desired action and press Enter.

    -   `1` or `learn`: Start a learning session.
    -   `2` or `review`: Review a saved list of missed words.
    -   `3` or `search`: Search the vocabulary.
    -   `4` or `loadvocab`: Load a custom vocabulary file.
    -   `5` or `exit`: Close the application session.

2.  **Learning Session (`learn`):**
    -   You'll be prompted to enter a range of words to study (e.g., `1-50`, or `all` for the entire vocabulary).
    -   Next, choose the learning direction (e.g., English to Japanese).
    -   Words will be presented one by one. Type your answer and press Enter.
    -   Type `q` and press Enter at any time during the quiz to quit the session.
    -   After the session, if you missed any words, you'll be prompted to save them as a named test list for later review.

3.  **Review Session (`review`):**
    -   You'll be prompted to enter the name of a test list to review.
    -   Type `ls` to list all available saved test names.
    -   Type `menu` to return to the main menu.
    -   The review session works similarly to the learning session. Correctly answered words are removed from the list (or the list is deleted if all words are answered correctly).
    -   Type `q` and press Enter to quit.

4.  **Search Words (`search`):**
    -   Enter a term to search for in both English and Japanese words.
    -   Results will be displayed. Press Enter to return to the main menu.

5.  **Load Vocabulary (`loadvocab`):**
    -   This command will trigger your browser's file selection dialog.
    -   Choose a `.json` file containing your vocabulary. The vocabulary is saved to IndexedDB and will be used as the main vocabulary source.
    -   **File Format:** The JSON file must be an array of objects, where each object has `ja` (Japanese) and `en` (English) string properties:
        ```json
        [
          {"ja": "こんにちは", "en": "hello"},
          {"ja": "ありがとう", "en": "thank you"},
          {"ja": "猫", "en": "cat"}
        ]
        ```

6.  **Navigating Input History:**
    -   Use the `ArrowUp` key to cycle backwards through your previous commands.
    -   Use the `ArrowDown` key to cycle forwards through your previous commands or clear the input.

## PWA Installation

Words-CLI is a Progressive Web App. You can "install" it to your device for a more app-like experience:

-   **Desktop:** Look for an install icon in your browser's address bar (often a computer with a down arrow) or an option in the browser menu (e.g., "Install LexiCLI..." or "Add to Home Screen").
-   **Mobile:** Your browser will typically show a prompt to "Add to Home Screen" or provide an option in its menu.

Installed PWAs can run in their own window and often have better offline support.

## Tech Stack

-   Next.js (React Framework)
-   React
-   TypeScript
-   Tailwind CSS
-   ShadCN UI (for UI components, adapted for CLI look)
-   IndexedDB (for client-side storage of vocabulary and test lists)
-   Service Workers (for PWA offline capabilities)

This project serves as a demonstration of building interactive web applications with modern frontend technologies.

---

This README.md is writen by AI and improved by a person. This application is developed to show AI's possibility on code-writing.
