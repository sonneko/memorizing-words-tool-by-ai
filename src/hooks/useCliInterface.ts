
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
  const [tempTestName, setTempTestName] = useState<string>('');

  const { db, error: dbError, saveData, loadData, updateTestData, deleteTest, getAllTestNames, saveVocabulary, loadMainVocabulary } = useIndexedDB();
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isFileLoadRequested, setIsFileLoadRequested] = useState(false);


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

  const loadInitialVocabulary = useCallback(async () => {
    setIsLoading(true);
    setMode('LOADING');
    addLine(UI_TEXTS.LOADING_VOCAB);

    if (db) {
      try {
        addLine(UI_TEXTS.LOADING_FROM_INDEXEDDB);
        const storedVocab = await loadMainVocabulary();
        if (storedVocab && storedVocab.length > 0) {
          setVocab(storedVocab);
          addLine(UI_TEXTS.LOADED_FROM_INDEXEDDB_SUCCESS(storedVocab.length), 'success');
          setMode('MENU');
          setIsLoading(false);
          return;
        } else {
          addLine(UI_TEXTS.INDEXEDDB_EMPTY_FALLBACK_FETCH);
        }
      } catch (e: any) {
        console.error("Failed to load vocab from IndexedDB:", e);
        addLine(UI_TEXTS.INDEXEDDB_EMPTY_FALLBACK_FETCH + (e.message ? ` (${e.message})` : ''), 'error');
      }
    } else {
       addLine("Database not ready, attempting to fetch default vocabulary...");
    }

    try {
      const response = await fetch('/vocab.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: Word[] = await response.json();
      setVocab(data);
      addLine(UI_TEXTS.VOCAB_LOAD_SUCCESS(data.length), 'success');
      if (db) {
        try {
          await saveVocabulary(data);
          addLine(UI_TEXTS.FETCH_FALLBACK_SUCCESS_SAVED_INDEXEDDB, 'info');
        } catch (saveError: any) {
          console.error("Failed to save fetched vocab to IndexedDB:", saveError);
          addLine(`Info: Could not save fetched vocabulary to local storage. (${saveError.message})`, 'info');
        }
      }
      setMode('MENU');
    } catch (error: any) {
      console.error("Failed to load vocabulary from fetch:", error);
      addLine(UI_TEXTS.VOCAB_LOAD_ERROR + (error.message ? ` (${error.message})` : ''), 'error');
      addLine("You can try loading a vocabulary file using the 'loadvocab' command.", "info");
      setMode('MENU'); // Go to menu to allow loadvocab command
    } finally {
      setIsLoading(false);
    }
  }, [addLine, db, loadMainVocabulary, saveVocabulary]);

  useEffect(() => {
    if (db) {
      loadInitialVocabulary();
    }
  }, [db, loadInitialVocabulary]);


  const showMenu = useCallback(() => {
    addLine(UI_TEXTS.MAIN_MENU_HEADER, 'header');
    addLine(UI_TEXTS.MENU_LEARN);
    addLine(UI_TEXTS.MENU_REVIEW);
    addLine(UI_TEXTS.MENU_SEARCH);
    addLine(UI_TEXTS.MENU_LOAD_VOCAB);
    addLine(UI_TEXTS.MENU_EXIT);
    addPrompt(UI_TEXTS.CHOOSE_OPTION);
    setMode('MENU');
  }, [addLine, addPrompt]);

  useEffect(() => {
    if (mode === 'MENU' && !isLoading) {
      showMenu();
    }
  }, [mode, isLoading, showMenu]);

   useEffect(() => {
    if (inputRef.current && (mode !== 'LOADING' && mode !== 'EXITED')) {
      inputRef.current.focus();
    }
  }, [output, mode]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };
  
  const processCommand = useCallback(async (command: string) => {
    addLine(`${PROMPT_SYMBOL}${command}`, 'user');
    setInputValue('');
    if (command.trim() !== "" && (history.length === 0 || history[history.length - 1] !== command)) {
      setHistory(prev => [...prev, command]);
    }
    setHistoryIndex(-1);

    if ((mode === 'LEARNING' || mode === 'REVIEWING') && command.toLowerCase() === 'q') {
      if (mode === 'LEARNING' && currentLearningSession) {
        addLine(UI_TEXTS.SESSION_INTERRUPTED, 'info');
        const { correctAnswers, currentIndex, missedInSession } = currentLearningSession;
        addLine(UI_TEXTS.SESSION_SUMMARY(correctAnswers, currentIndex), 'info');
        if (missedInSession.length > 0) {
          setMode('LEARN_SAVE_TESTNAME');
          addPrompt(UI_TEXTS.ENTER_TEST_NAME);
        } else {
          addLine(UI_TEXTS.NO_MISSED_WORDS, 'success');
          setMode('MENU');
        }
        setCurrentLearningSession(prev => prev ? { ...prev, currentIndex: prev.words.length } : null);
      } else if (mode === 'REVIEWING' && currentReviewSession) {
        addLine(UI_TEXTS.SESSION_INTERRUPTED, 'info');
        const { correctAnswers, currentIndex, missedInSession, testName, initialWords } = currentReviewSession;
        addLine(UI_TEXTS.SESSION_SUMMARY(correctAnswers, currentIndex), 'info');
        
        const wordsKeptInTest = initialWords.filter(word => 
            !currentReviewSession.words.slice(0, currentIndex)
                .find(sw => sw.en === word.en && !missedInSession.find(mw => mw.en === sw.en))
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
      case 'SEARCH_RESULTS':
      case 'LOAD_VOCAB_FILE': // Any input here might be a cancel, or handled by file input
        setMode('MENU'); // Default to menu
        break;
      default:
        addLine(`Unknown mode or command: ${command}`, 'error');
        setMode('MENU');
    }
  }, [mode, addLine, addPrompt, vocab, currentLearningSession, currentReviewSession, db, history, saveData, loadData, updateTestData, deleteTest, getAllTestNames, showMenu, saveVocabulary]);


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
        } else {
            setHistoryIndex(-1);
            setInputValue("");
        }
      }
    }
  };

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
      case MENU_OPTIONS.LOAD_VOCAB:
        setMode('LOAD_VOCAB_FILE');
        setIsFileLoadRequested(true);
        addPrompt(UI_TEXTS.PROMPT_LOAD_VOCAB_FILE);
        break;
      case MENU_OPTIONS.EXIT:
        addLine(UI_TEXTS.EXIT_MESSAGE, 'info');
        setMode('EXITED');
        break;
      default:
        addLine(UI_TEXTS.INVALID_OPTION, 'error');
        addPrompt(UI_TEXTS.CHOOSE_OPTION);
    }
  };

  const handleLearnRangeInput = (rangeStr: string) => {
    if (vocab.length === 0) {
        addLine("Vocabulary is empty. Please load a vocabulary file first using 'loadvocab'.", 'error');
        setMode('MENU');
        return;
    }
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
      direction: 'en-to-ja',
      originalRange: rangeStr
    });
    setMode('LEARN_DIRECTION');
    addPrompt(UI_TEXTS.CHOOSE_DIRECTION);
  };

  const handleLearnDirectionInput = (directionStr: string) => {
    if (!currentLearningSession) return;
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
    if (!currentLearningSession) return;

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
      if (!newMissedInSession.find(w => w.en === word.en)) {
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
    } catch (e: any) {
      console.error(e);
      addLine(UI_TEXTS.MISSED_WORDS_SAVE_ERROR + (e.message ? ` (${e.message})` : ''), 'error');
      toast({ title: "Save Error", description: UI_TEXTS.MISSED_WORDS_SAVE_ERROR, variant: "destructive" });
    } finally {
      setCurrentLearningSession(null);
      setMode('MENU');
    }
  };

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
        } catch (e: any) {
            addLine(UI_TEXTS.LISTING_TESTS_ERROR + (e.message ? ` (${e.message})` : ''), 'error');
        }
        addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
        return;
    }
    
    const testName = command.trim();
    if (!testName) {
        addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
        return;
    }
    setTempTestName(testName);
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
      const direction: 'en-to-ja' | 'ja-to-en' = 'en-to-ja'; 
      
      const newReviewSession = {
        words: shuffleArray(wordsToReview),
        initialWords: [...wordsToReview],
        currentIndex: 0,
        correctAnswers: 0,
        totalQuestions: wordsToReview.length,
        missedInSession: [],
        direction: direction, 
        testName: testName,
      };
      setCurrentReviewSession(newReviewSession);
      setMode('REVIEWING');
      askNextReviewQuestion(newReviewSession);
    } catch (e: any) {
      console.error(e);
      addLine(UI_TEXTS.INDEXEDDB_ERROR + (e.message ? ` (${e.message})` : ''), 'error');
      addPrompt(UI_TEXTS.CHOOSE_REVIEW_TEST);
    }
  };

  const askNextReviewQuestion = (session: ReviewSession | null = currentReviewSession) => {
    if (!session || session.currentIndex >= session.words.length) {
      addLine(UI_TEXTS.SESSION_SUMMARY(session?.correctAnswers ?? 0, session?.totalQuestions ?? 0), 'info');
      
      if (session) {
        const { testName, initialWords, missedInSession, correctAnswers, totalQuestions } = session;
        const wordsToKeep = initialWords.filter(initialWord => 
          missedInSession.some(missedWord => missedWord.en === initialWord.en)
        );

        if (correctAnswers === totalQuestions && totalQuestions > 0) {
             if (db && testName) {
                deleteTest(testName)
                    .then(() => {
                        addLine(UI_TEXTS.REVIEW_ALL_CORRECT, 'success');
                        addLine(`Test '${testName}' has been removed as all words were answered correctly.`, 'info');
                        toast({ title: "Test Completed!", description: `Test '${testName}' removed.` });
                    })
                    .catch((e: any) => {
                        addLine(UI_TEXTS.REVIEW_UPDATE_ERROR + (e.message ? ` (${e.message})` : ''), 'error');
                        console.error("Error deleting test:", e);
                    });
            }
        } else if (db && testName) {
            if (wordsToKeep.length > 0) {
                updateTestData(testName, wordsToKeep)
                    .then(() => {
                        addLine(UI_TEXTS.REVIEW_UPDATED(testName), 'success');
                        toast({ title: "Test Updated", description: `Test '${testName}' updated.` });
                    })
                    .catch((e: any) => {
                         addLine(UI_TEXTS.REVIEW_UPDATE_ERROR + (e.message ? ` (${e.message})` : ''), 'error');
                         console.error("Error updating test data:", e);
                    });
            } else if (initialWords.length > 0) {
                 deleteTest(testName)
                    .then(() => {
                        addLine(`All words in '${testName}' answered or removed. Test deleted.`, 'success');
                        toast({ title: "Test Cleared!", description: `Test '${testName}' cleared and removed.` });
                    })
                    .catch((e: any) => {
                        addLine(UI_TEXTS.REVIEW_UPDATE_ERROR + (e.message ? ` (${e.message})` : ''), 'error');
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
    } else {
      const correctAnswerDisplay = currentReviewSession.direction === 'en-to-ja' ? word.ja : word.en;
      addLine(`${UI_TEXTS.INCORRECT_PREFIX}${correctAnswerDisplay}`, 'error');
      if (!newMissedInSession.find(w => w.en === word.en)) {
        newMissedInSession.push(word);
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

  const handleSearchTermInput = (term: string) => {
    const searchTerm = term.trim().toLowerCase();
    if (!searchTerm) {
      addPrompt(UI_TEXTS.ENTER_SEARCH_TERM);
      return;
    }
    addLine(UI_TEXTS.SEARCHING, 'info');
    if (vocab.length === 0) {
        addLine("Vocabulary is empty. Cannot perform search.", 'info');
        addPrompt(UI_TEXTS.PRESS_ANY_KEY_CONTINUE);
        setMode('SEARCH_RESULTS');
        return;
    }
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

  const processLoadedVocabData = async (fileContent: string, fileName: string) => {
    addLine(UI_TEXTS.VOCAB_FILE_SELECTED(fileName));
    try {
      const parsedData = JSON.parse(fileContent);
      if (Array.isArray(parsedData) && parsedData.every(item => typeof item.ja === 'string' && typeof item.en === 'string')) {
        if (!db) {
          addLine(UI_TEXTS.INDEXEDDB_NOT_SUPPORTED, 'error');
          addLine(UI_TEXTS.VOCAB_FILE_LOAD_ERROR("Database not available to save vocabulary."), 'error');
          setMode('MENU');
          return;
        }
        await saveVocabulary(parsedData);
        setVocab(parsedData);
        addLine(UI_TEXTS.VOCAB_FILE_LOAD_SUCCESS(parsedData.length), 'success');
        toast({ title: "Vocabulary Loaded", description: `Loaded ${parsedData.length} words from ${fileName}.` });
      } else {
        throw new Error("Invalid JSON structure.");
      }
    } catch (error: any) {
      console.error("Error processing vocab file:", error);
      addLine(UI_TEXTS.VOCAB_FILE_LOAD_INVALID + (error.message ? ` (${error.message})` : ''), 'error');
      toast({ title: "Load Error", description: UI_TEXTS.VOCAB_FILE_LOAD_INVALID, variant: "destructive" });
    } finally {
      setMode('MENU');
    }
  };

  
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
    showMenu,
    isFileLoadRequested,
    clearFileLoadRequest: () => setIsFileLoadRequested(false),
    processLoadedVocabData,
  };
};
