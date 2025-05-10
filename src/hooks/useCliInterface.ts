"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Word, OutputLineData, AppMode, LearningSession, ReviewSession } from '@/types';
import { UI_TEXTS, MENU_OPTIONS, PROMPT_SYMBOL } from '@/lib/constants';
import { shuffleArray, parseRange, checkAnswer, generateId, formatWordForDisplay } from '@/lib/utils';
import { useIndexedDB } from './useIndexedDB';
import { useToast } from "@/hooks/use-toast";


const MAX_OUTPUT_LINES = 200; // To prevent performance issues

export const useCliInterface = () => {
  const [output, setOutput] = useState<OutputLineData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<AppMode>('LOADING');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [vocab, setVocab] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentLearningSession, setCurrentLearningSession] = useState<LearningSession | null>(null);
  const [currentReviewSession, setCurrentReviewSession] = useState<ReviewSession | null>(null);
  const [tempTestName, setTempTestName] = useState<string>(''); // For review test name input

  const { db, error: dbError, saveData, loadData, updateTestData, deleteTest, getAllTestNames } = useIndexedDB();
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to add line to output
  const addLine = useCallback((content: string | JSX.Element, type: OutputLineData['type'] = 'system') => {
    setOutput(prev => {
      const newOutput = [...prev, { id: generateId(), type, content, timestamp: Date.now() }];
      if (newOutput.length > MAX_OUTPUT_LINES) {
        return newOutput.slice(newOutput.length - MAX_OUTPUT_LINES);
      }
      return newOutput;
    });
  }, []);
  
  const addPrompt = useCallback((promptText: string) => {
     addLine(promptText, 'prompt');
  }, [addLine]);


  // Load vocabulary
  useEffect(() => {
    const loadVocabulary = async () => {
      setIsLoading(true);
      setMode('LOADING');
      addLine(UI_TEXTS.LOADING_VOCAB);
      try {
        const response = await fetch('/vocab.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: Word[] = await response.json();
        setVocab(data);
        addLine(UI_TEXTS.VOCAB_LOAD_SUCCESS(data.length), 'success');
        setMode('MENU');
      } catch (error) {
        console.error("Failed to load vocabulary:", error);
        addLine(UI_TEXTS.VOCAB_LOAD_ERROR, 'error');
        setMode('ERROR');
      } finally {
        setIsLoading(false);
      }
    };
    loadVocabulary();
  }, [addLine]);

  // Display menu when mode changes to MENU
  useEffect(() => {
    if (mode === 'MENU' && !isLoading) {
      showMenu();
    }
  }, [mode, isLoading, addLine]); // showMenu dep removed as it's defined below based on addLine

  const showMenu = useCallback(() => {
    addLine(UI_TEXTS.MAIN_MENU_HEADER, 'header');
    addLine(UI_TEXTS.MENU_LEARN);
    addLine(UI_TEXTS.MENU_REVIEW);
    addLine(UI_TEXTS.MENU_SEARCH);
    addLine(UI_TEXTS.MENU_EXIT);
    addPrompt(UI_TEXTS.CHOOSE_OPTION);
    setMode('MENU'); // Ensure mode is MENU
  }, [addLine, addPrompt]);

  // Focus input when mode changes or output is added
   useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [output, mode]); // Focus on new output or mode change

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };
  
  const processCommand = useCallback(async (command: string) => {
    addLine(`${PROMPT_SYMBOL}${command}`, 'user');
    setInputValue(''); // Clear input after submission
    if (command.trim() !== "" && (history.length === 0 || history[history.length - 1] !== command)) {
      setHistory(prev => [...prev, command]);
    }
    setHistoryIndex(-1); // Reset history index

    // Quit command for learning/review sessions
    if ((mode === 'LEARNING' || mode === 'REVIEWING') && command.toLowerCase() === 'q') {
      if (mode === 'LEARNING' && currentLearningSession) {
        addLine(UI_TEXTS.SESSION_INTERRUPTED, 'info');
        const { correctAnswers, totalQuestions, missedInSession } = currentLearningSession;
        const askedQuestions = currentLearningSession.currentIndex; // Number of questions asked before quitting
        addLine(UI_TEXTS.SESSION_SUMMARY(correctAnswers, askedQuestions), 'info');
        if (missedInSession.length > 0) {
          setMode('LEARN_SAVE_TESTNAME');
          addPrompt(UI_TEXTS.ENTER_TEST_NAME);
        } else {
          addLine(UI_TEXTS.NO_MISSED_WORDS, 'success');
          setMode('MENU');
        }
        setCurrentLearningSession(prev => prev ? { ...prev, currentIndex: prev.words.length } : null); // Mark as finished
      } else if (mode === 'REVIEWING' && currentReviewSession) {
        addLine(UI_TEXTS.SESSION_INTERRUPTED, 'info');
        const { correctAnswers, totalQuestions, missedInSession, testName, initialWords } = currentReviewSession;
        const askedQuestions = currentReviewSession.currentIndex;
        addLine(UI_TEXTS.SESSION_SUMMARY(correctAnswers, askedQuestions), 'info');
        
        const wordsKeptInTest = initialWords.filter(word => 
            !currentReviewSession.words.slice(0, askedQuestions) // Words asked in this session
                .find(sw => sw.en === word.en && !missedInSession.find(mw => mw.en === sw.en)) // If it was asked AND not missed
        );

        if (db && testName) {
            if (wordsKeptInTest.length === 0) {
                await deleteTest(testName);
                addLine(`Test '${testName}' is now empty and has been removed.`, 'success');
            } else {
                await updateTestData(testName, wordsKeptInTest);
                addLine(UI_TEXTS.REVIEW_UPDATED(testName), 'success');
            }
        }
        setCurrentReviewSession(prev => prev ? { ...prev, currentIndex: prev.words.length } : null);
        setMode('MENU');
      }
      return;
    }


    switch (mode) {
      case 'MENU':
        handleMenuChoice(command);
        break;
      case 'LEARN_RANGE':
        handleLearnRangeInput(command);
        break;
      case 'LEARN_DIRECTION':
        handleLearnDirectionInput(command);
        break;
      case 'LEARNING':
        handleLearningAnswer(command);
        break;
      case 'LEARN_SAVE_TESTNAME':
        await handleSaveMissedWords(command);
        break;
      case 'REVIEW_CHOOSE_TEST':
        await handleReviewChooseTest(command);
        break;
      case 'REVIEWING':
        handleReviewAnswer(command);
        break;
      case 'SEARCH_TERM':
        handleSearchTermInput(command);
        break;
      case 'SEARCH_RESULTS': // Any input returns to menu
        setMode('MENU');
        break;
      default:
        addLine(`Unknown mode or command: ${command}`, 'error');
        setMode('MENU'); // Default to menu
    }
  }, [mode, addLine, addPrompt, vocab, currentLearningSession, currentReviewSession, db, history, saveData, loadData, updateTestData, deleteTest, getAllTestNames, showMenu]);


  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      processCommand(inputValue);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (history.length > 0 && historyIndex !== -1) {
        const newIndex = Math.min(history.length - 1, historyIndex + 1);
        if (newIndex >= historyIndex && historyIndex < history.length -1) {
             setHistoryIndex(newIndex);
             setInputValue(history[newIndex]);
        } else { // at the last item or beyond, clear input
            setHistoryIndex(-1);
            setInputValue("");
        }
      }
    }
  };

  // Menu choice
  const handleMenuChoice = (choice: string) => {
    switch (choice) {
      case MENU_OPTIONS.LEARN:
        setMode('LEARN_RANGE');
        addPrompt(UI_TEXTS.ENTER_RANGE + `(1-${vocab.length})`);
        break;
      case MENU_OPTIONS.REVIEW:
        setMode('REVIEW_CHOOSE_TEST');
        addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
        break;
      case MENU_OPTIONS.SEARCH:
        setMode('SEARCH_TERM');
        addPrompt(UI_TEXTS.ENTER_SEARCH_TERM);
        break;
      case MENU_OPTIONS.EXIT:
        addLine(UI_TEXTS.EXIT_MESSAGE, 'info');
        setMode('EXITED');
        // In a real CLI, this might close. Here, it just signifies end.
        break;
      default:
        addLine(UI_TEXTS.INVALID_OPTION, 'error');
        addPrompt(UI_TEXTS.CHOOSE_OPTION);
    }
  };

  // Learning session setup
  const handleLearnRangeInput = (rangeStr: string) => {
    const range = parseRange(rangeStr, vocab.length);
    if (!range) {
      addLine(UI_TEXTS.INVALID_RANGE + vocab.length, 'error');
      addPrompt(UI_TEXTS.ENTER_RANGE + `(1-${vocab.length})`);
      return;
    }
    const selectedWords = vocab.slice(range[0], range[1] + 1);
    if (selectedWords.length === 0) {
        addLine("Selected range is empty or invalid.", 'error');
        addPrompt(UI_TEXTS.ENTER_RANGE + `(1-${vocab.length})`);
        return;
    }
    setCurrentLearningSession({
      words: shuffleArray(selectedWords),
      currentIndex: 0,
      correctAnswers: 0,
      totalQuestions: selectedWords.length,
      missedInSession: [],
      direction: 'en-to-ja', // Default, will be set next
      originalRange: rangeStr
    });
    setMode('LEARN_DIRECTION');
    addPrompt(UI_TEXTS.CHOOSE_DIRECTION);
  };

  const handleLearnDirectionInput = (directionStr: string) => {
    if (!currentLearningSession) return; // Should not happen
    if (directionStr === '1' || directionStr === '2') {
      const direction: 'en-to-ja' | 'ja-to-en' = directionStr === '1' ? 'en-to-ja' : 'ja-to-en';
      setCurrentLearningSession(prev => prev ? { ...prev, direction } : null);
      setMode('LEARNING');
      askNextLearningQuestion({ ...currentLearningSession, direction });
    } else {
      addLine(UI_TEXTS.INVALID_DIRECTION, 'error');
      addPrompt(UI_TEXTS.CHOOSE_DIRECTION);
    }
  };
  
  const askNextLearningQuestion = (session: LearningSession | null = currentLearningSession) => {
    if (!session || session.currentIndex >= session.words.length) {
      // Session finished
      addLine(UI_TEXTS.SESSION_SUMMARY(session?.correctAnswers ?? 0, session?.totalQuestions ?? 0), 'info');
      if (session && session.missedInSession.length > 0) {
        setMode('LEARN_SAVE_TESTNAME');
        addPrompt(UI_TEXTS.ENTER_TEST_NAME);
      } else {
        addLine(UI_TEXTS.NO_MISSED_WORDS, 'success');
        setMode('MENU');
      }
      return;
    }

    const word = session.words[session.currentIndex];
    const questionText = session.direction === 'en-to-ja' ? word.en : word.ja;
    addLine(`Q: ${questionText}`, 'question');
    addPrompt(UI_TEXTS.QUIZ_PROMPT);
  };

  const handleLearningAnswer = (answer: string) => {
    if (!currentLearningSession) return; // Should not happen

    const word = currentLearningSession.words[currentLearningSession.currentIndex];
    const isCorrect = checkAnswer(answer, word, currentLearningSession.direction);
    let newCorrectAnswers = currentLearningSession.correctAnswers;
    let newMissedInSession = [...currentLearningSession.missedInSession];

    if (isCorrect) {
      addLine(UI_TEXTS.CORRECT, 'success');
      newCorrectAnswers++;
    } else {
      const correctAnswerDisplay = currentLearningSession.direction === 'en-to-ja' ? word.ja : word.en;
      addLine(`${UI_TEXTS.INCORRECT_PREFIX}${correctAnswerDisplay}`, 'error');
      if (!newMissedInSession.find(w => w.en === word.en)) { // Avoid duplicates in missed list
        newMissedInSession.push(word);
      }
    }
    
    const updatedSession = {
      ...currentLearningSession,
      correctAnswers: newCorrectAnswers,
      missedInSession: newMissedInSession,
      currentIndex: currentLearningSession.currentIndex + 1,
    };
    setCurrentLearningSession(updatedSession);
    askNextLearningQuestion(updatedSession);
  };

  const handleSaveMissedWords = async (testNameInput: string) => {
    const name = testNameInput.trim();
    if (!currentLearningSession || currentLearningSession.missedInSession.length === 0) {
      setMode('MENU');
      return;
    }
    if (!name) {
      addLine(UI_TEXTS.TEST_NAME_EMPTY_SKIP, 'info');
      setMode('MENU');
      return;
    }
    if (!db) {
      addLine(UI_TEXTS.INDEXEDDB_NOT_SUPPORTED, 'error');
      setMode('MENU');
      return;
    }
    try {
      addLine(UI_TEXTS.SAVING_MISSED_WORDS, 'info');
      await saveData(name, currentLearningSession.missedInSession);
      addLine(UI_TEXTS.MISSED_WORDS_SAVED(name), 'success');
      toast({ title: "List Saved", description: `Missed words saved as '${name}'.` });
    } catch (e) {
      console.error(e);
      addLine(UI_TEXTS.MISSED_WORDS_SAVE_ERROR, 'error');
      toast({ title: "Save Error", description: UI_TEXTS.MISSED_WORDS_SAVE_ERROR, variant: "destructive" });
    } finally {
      setCurrentLearningSession(null); // Clear session
      setMode('MENU');
    }
  };

  // Review session logic
  const handleReviewChooseTest = async (command: string) => {
    const input = command.trim().toLowerCase();
    if (input === 'menu') {
        setMode('MENU');
        return;
    }
    if (input === 'ls') {
        if (!db) {
            addLine(UI_TEXTS.INDEXEDDB_NOT_SUPPORTED, 'error');
            addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
            return;
        }
        try {
            const testNames = await getAllTestNames();
            if (testNames.length === 0) {
                addLine(UI_TEXTS.NO_TESTS_FOUND, 'info');
            } else {
                addLine(UI_TEXTS.AVAILABLE_TESTS, 'header');
                testNames.forEach(name => addLine(`- ${name}`));
            }
        } catch (e) {
            addLine(UI_TEXTS.LISTING_TESTS_ERROR, 'error');
        }
        addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
        return;
    }
    
    const testName = command.trim();
    if (!testName) {
        addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
        return;
    }
    setTempTestName(testName); // Store the chosen test name
    if (!db) {
      addLine(UI_TEXTS.INDEXEDDB_NOT_SUPPORTED, 'error');
      setMode('MENU');
      return;
    }
    try {
      addLine(UI_TEXTS.LOADING_TEST(testName), 'info');
      const wordsToReview = await loadData(testName);
      if (!wordsToReview || wordsToReview.length === 0) {
        addLine(UI_TEXTS.TEST_NOT_FOUND(testName), 'error');
        addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
        return;
      }
      // For review, default direction is English to Japanese
      const direction: 'en-to-ja' | 'ja-to-en' = 'en-to-ja'; 
      // Could add a step to ask for direction if desired.
      
      setCurrentReviewSession({
        words: shuffleArray(wordsToReview),
        initialWords: [...wordsToReview], // Keep a copy of original words for updating
        currentIndex: 0,
        correctAnswers: 0,
        totalQuestions: wordsToReview.length,
        missedInSession: [],
        direction: direction, 
        testName: testName,
      });
      setMode('REVIEWING');
      askNextReviewQuestion({
        words: shuffleArray(wordsToReview),
        initialWords: [...wordsToReview],
        currentIndex: 0,
        correctAnswers: 0,
        totalQuestions: wordsToReview.length,
        missedInSession: [],
        direction: direction,
        testName: testName,
      });
    } catch (e) {
      console.error(e);
      addLine(UI_TEXTS.INDEXEDDB_ERROR, 'error');
      addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
    }
  };

  const askNextReviewQuestion = (session: ReviewSession | null = currentReviewSession) => {
    if (!session || session.currentIndex >= session.words.length) {
      // Review session finished
      addLine(UI_TEXTS.SESSION_SUMMARY(session?.correctAnswers ?? 0, session?.totalQuestions ?? 0), 'info');
      
      if (session) {
        const { testName, initialWords, missedInSession, correctAnswers, totalQuestions } = session;
        const wordsToKeep = initialWords.filter(initialWord => 
          missedInSession.some(missedWord => missedWord.en === initialWord.en)
        );

        // If all words were answered correctly
        if (correctAnswers === totalQuestions && totalQuestions > 0) {
             if (db && testName) {
                deleteTest(testName)
                    .then(() => {
                        addLine(UI_TEXTS.REVIEW_ALL_CORRECT, 'success');
                        addLine(`Test '${testName}' has been removed as all words were answered correctly.`, 'info');
                        toast({ title: "Test Completed!", description: `Test '${testName}' removed.` });
                    })
                    .catch(e => {
                        addLine(UI_TEXTS.REVIEW_UPDATE_ERROR, 'error');
                        console.error("Error deleting test:", e);
                    });
            }
        } else if (db && testName) { // Some words missed or session incomplete
            if (wordsToKeep.length > 0) {
                updateTestData(testName, wordsToKeep)
                    .then(() => {
                        addLine(UI_TEXTS.REVIEW_UPDATED(testName), 'success');
                        toast({ title: "Test Updated", description: `Test '${testName}' updated.` });
                    })
                    .catch(e => {
                         addLine(UI_TEXTS.REVIEW_UPDATE_ERROR, 'error');
                         console.error("Error updating test data:", e);
                    });
            } else if (initialWords.length > 0) { // All words were in the test, and now none are left to keep
                 deleteTest(testName)
                    .then(() => {
                        addLine(`All words in '${testName}' answered or removed. Test deleted.`, 'success');
                        toast({ title: "Test Cleared!", description: `Test '${testName}' cleared and removed.` });
                    })
                    .catch(e => {
                        addLine(UI_TEXTS.REVIEW_UPDATE_ERROR, 'error');
                        console.error("Error deleting empty test:", e);
                    });
            }
        }
      }
      setCurrentReviewSession(null);
      setMode('MENU');
      return;
    }

    const word = session.words[session.currentIndex];
    const questionText = session.direction === 'en-to-ja' ? word.en : word.ja;
    addLine(`Q: ${questionText}`, 'question');
    addPrompt(UI_TEXTS.QUIZ_PROMPT);
  };

  const handleReviewAnswer = (answer: string) => {
    if (!currentReviewSession) return;

    const word = currentReviewSession.words[currentReviewSession.currentIndex];
    const isCorrect = checkAnswer(answer, word, currentReviewSession.direction);
    let newCorrectAnswers = currentReviewSession.correctAnswers;
    let newMissedInSession = [...currentReviewSession.missedInSession];

    if (isCorrect) {
      addLine(UI_TEXTS.CORRECT, 'success');
      newCorrectAnswers++;
      // Word answered correctly, it will be removed from the list to keep at the end of session.
    } else {
      const correctAnswerDisplay = currentReviewSession.direction === 'en-to-ja' ? word.ja : word.en;
      addLine(`${UI_TEXTS.INCORRECT_PREFIX}${correctAnswerDisplay}`, 'error');
      if (!newMissedInSession.find(w => w.en === word.en)) {
        newMissedInSession.push(word); // This word remains in the test
      }
    }
    
    const updatedSession = {
      ...currentReviewSession,
      correctAnswers: newCorrectAnswers,
      missedInSession: newMissedInSession, 
      currentIndex: currentReviewSession.currentIndex + 1,
    };
    setCurrentReviewSession(updatedSession);
    askNextReviewQuestion(updatedSession);
  };

  // Search logic
  const handleSearchTermInput = (term: string) => {
    const searchTerm = term.trim().toLowerCase();
    if (!searchTerm) {
      addPrompt(UI_TEXTS.ENTER_SEARCH_TERM);
      return;
    }
    addLine(UI_TEXTS.SEARCHING, 'info');
    const results = vocab.filter(word => 
      word.en.toLowerCase().includes(searchTerm) || 
      word.ja.toLowerCase().includes(searchTerm)
    );

    if (results.length > 0) {
      addLine(UI_TEXTS.SEARCH_RESULTS_HEADER, 'header');
      results.forEach(word => addLine(formatWordForDisplay(word)));
    } else {
      addLine(UI_TEXTS.NO_SEARCH_RESULTS, 'info');
    }
    addPrompt(UI_TEXTS.PRESS_ANY_KEY_CONTINUE);
    setMode('SEARCH_RESULTS');
  };
  
  // Effect for DB errors
  useEffect(() => {
    if (dbError) {
      addLine(`Database Error: ${dbError}`, 'error');
      toast({ title: "Database Error", description: dbError, variant: "destructive" });
    }
  }, [dbError, addLine, toast]);


  return {
    output,
    inputValue,
    mode,
    isLoading,
    inputRef,
    handleInputChange,
    processCommand,
    handleKeyDown,
    showMenu // Expose for initial call if needed
  };
};
