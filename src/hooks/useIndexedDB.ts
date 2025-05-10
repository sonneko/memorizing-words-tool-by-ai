import { useState, useEffect, useCallback } from 'react';
import type { Word } from '@/types';
import { DB_NAME, DB_VERSION, MISSED_WORDS_STORE_NAME, VOCAB_STORE_NAME, MAIN_VOCAB_KEY } from '@/types';

export const useIndexedDB = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        setError("IndexedDB not supported.");
        reject(new Error("IndexedDB not supported."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        setError(`IndexedDB error: ${request.error?.message}`);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        const database = request.result;
        setDb(database);
        resolve(database);
      };

      request.onupgradeneeded = (event) => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MISSED_WORDS_STORE_NAME)) {
          database.createObjectStore(MISSED_WORDS_STORE_NAME, { keyPath: 'testName' });
        }
        if (!database.objectStoreNames.contains(VOCAB_STORE_NAME)) {
          // For storing the main vocabulary, we can use a fixed key.
          database.createObjectStore(VOCAB_STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }, []);

  useEffect(() => {
    initDB().catch(err => console.error("Failed to initialize DB:", err));
  }, [initDB]);

  const saveData = useCallback(async (testName: string, words: Word[]): Promise<void> => {
    if (!db) {
      setError("DB not initialized.");
      throw new Error("DB not initialized.");
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MISSED_WORDS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(MISSED_WORDS_STORE_NAME);
      
      const getRequest = store.get(testName);

      getRequest.onsuccess = () => {
        let currentWords: Word[] = getRequest.result ? getRequest.result.words : [];
        
        const wordMap = new Map<string, Word>();
        currentWords.forEach(word => wordMap.set(word.en.toLowerCase(), word));
        words.forEach(word => wordMap.set(word.en.toLowerCase(), word));
        
        const mergedWords = Array.from(wordMap.values());

        const putRequest = store.put({ testName, words: mergedWords });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => {
          setError(`Failed to save data: ${putRequest.error?.message}`);
          reject(putRequest.error);
        };
      };
      getRequest.onerror = () => {
        setError(`Failed to get existing data: ${getRequest.error?.message}`);
        reject(getRequest.error);
      }
    });
  }, [db]);


  const loadData = useCallback(async (testName: string): Promise<Word[] | null> => {
    let currentDb = db;
    if (!currentDb) {
      try {
        currentDb = await initDB();
      } catch (initError) {
        setError("DB not initialized and re-initialization failed for loadData.");
        throw new Error("DB not initialized and re-initialization failed for loadData.");
      }
    }
    if (!currentDb) { // Should not happen if initDB resolves, but as a safeguard
        setError("DB is null after initDB for loadData.");
        throw new Error("DB is null after initDB for loadData.");
    }
    return new Promise((resolve, reject) => {
      const transaction = currentDb!.transaction([MISSED_WORDS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(MISSED_WORDS_STORE_NAME);
      const request = store.get(testName);
      request.onsuccess = () => resolve(request.result ? request.result.words : null);
      request.onerror = () => {
        setError(`Failed to load data: ${request.error?.message}`);
        reject(request.error);
      };
    });
  }, [db, initDB]);

  const updateTestData = useCallback(async (testName: string, updatedWords: Word[]): Promise<void> => {
    if (!db) {
      setError("DB not initialized.");
      throw new Error("DB not initialized.");
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MISSED_WORDS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(MISSED_WORDS_STORE_NAME);
      const request = store.put({ testName, words: updatedWords });
      request.onsuccess = () => resolve();
      request.onerror = () => {
        setError(`Failed to update data: ${request.error?.message}`);
        reject(request.error);
      };
    });
  }, [db]);

  const deleteTest = useCallback(async (testName: string): Promise<void> => {
    if (!db) {
      setError("DB not initialized.");
      throw new Error("DB not initialized.");
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MISSED_WORDS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(MISSED_WORDS_STORE_NAME);
        const request = store.delete(testName);
        request.onsuccess = () => resolve();
        request.onerror = () => {
            setError(`Failed to delete test: ${request.error?.message}`);
            reject(request.error);
        };
    });
  }, [db]);
  
  const getAllTestNames = useCallback(async (): Promise<string[]> => {
    let currentDb = db;
    if (!currentDb) {
      try {
        currentDb = await initDB();
      } catch (initError) {
        setError("DB not initialized and re-initialization failed for getAllTestNames.");
        throw new Error("DB not initialized and re-initialization failed for getAllTestNames.");
      }
    }
    if (!currentDb) {
        setError("DB is null after initDB for getAllTestNames.");
        throw new Error("DB is null after initDB for getAllTestNames.");
    }
    return new Promise((resolve, reject) => {
        const transaction = currentDb!.transaction([MISSED_WORDS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(MISSED_WORDS_STORE_NAME);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => {
            setError(`Failed to get all test names: ${request.error?.message}`);
            reject(request.error);
        };
    });
  }, [db, initDB]);

  const saveVocabulary = useCallback(async (words: Word[]): Promise<void> => {
    if (!db) {
      setError("DB not initialized for saving vocabulary.");
      throw new Error("DB not initialized for saving vocabulary.");
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VOCAB_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VOCAB_STORE_NAME);
      const request = store.put({ key: MAIN_VOCAB_KEY, words });
      request.onsuccess = () => resolve();
      request.onerror = () => {
        setError(`Failed to save vocabulary: ${request.error?.message}`);
        reject(request.error);
      };
    });
  }, [db]);

  const loadMainVocabulary = useCallback(async (): Promise<Word[] | null> => {
    let currentDb = db;
    if (!currentDb) {
      try {
        currentDb = await initDB();
      } catch (initError) {
        setError("DB not initialized and re-initialization failed for loadMainVocabulary.");
        throw new Error("DB not initialized and re-initialization failed for loadMainVocabulary.");
      }
    }
    if (!currentDb) {
        setError("DB is null after initDB for loadMainVocabulary.");
        throw new Error("DB is null after initDB for loadMainVocabulary.");
    }
    return new Promise((resolve, reject) => {
      const transaction = currentDb!.transaction([VOCAB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(VOCAB_STORE_NAME);
      const request = store.get(MAIN_VOCAB_KEY);
      request.onsuccess = () => resolve(request.result ? request.result.words : null);
      request.onerror = () => {
        setError(`Failed to load main vocabulary: ${request.error?.message}`);
        reject(request.error);
      };
    });
  }, [db, initDB]);


  return { db, error, initDB, saveData, loadData, updateTestData, deleteTest, getAllTestNames, saveVocabulary, loadMainVocabulary };
};
