
"use client";

import React, { useEffect, useRef } from 'react';
import CliOutput from '@/components/cli/CliOutput';
import CliInput from '@/components/cli/CliInput';
import { useCliInterface } from '@/hooks/useCliInterface';
import { UI_TEXTS } from '@/lib/constants';

export default function HomePage() {
  const {
    output,
    inputValue,
    mode,
    isLoading,
    inputRef,
    handleInputChange,
    processCommand,
    handleKeyDown,
    isFileLoadRequested,
    clearFileLoadRequest,
    processLoadedVocabData,
  } = useCliInterface();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('SW registered: ', registration))
          .catch(registrationError => console.log('SW registration failed: ', registrationError));
      });
    }
  }, []);

  useEffect(() => {
    const focusInput = (event: MouseEvent) => {
      if (inputRef.current && event.target && !(event.target as HTMLElement).closest('button, a, input, textarea')) {
         inputRef.current.focus();
      }
    };
    document.addEventListener('click', focusInput);
    return () => {
      document.removeEventListener('click', focusInput);
    };
  }, [inputRef]);

  useEffect(() => {
    if (isFileLoadRequested && fileInputRef.current) {
      fileInputRef.current.click();
      clearFileLoadRequest(); 
    }
  }, [isFileLoadRequested, clearFileLoadRequest]);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          await processLoadedVocabData(text, file.name);
        } else {
          console.error("File content is not a string.");
          // Potentially call a method from useCliInterface to add an error line to output
          // addLine(UI_TEXTS.VOCAB_FILE_LOAD_ERROR("File content could not be read as text."), 'error');
        }
      };
      reader.onerror = () => {
          console.error("Error reading file.");
          // addLine(UI_TEXTS.VOCAB_FILE_LOAD_ERROR("Could not read the selected file."), 'error');
      }
      reader.readAsText(file);
      if (event.target) event.target.value = ''; // Reset file input
    } else {
        // If no file was selected (e.g., user clicked cancel)
        // Add a message or handle as needed, e.g., return to menu
        // This might be handled by processCommand setting mode to MENU if LOAD_VOCAB_FILE gets any input
        processCommand(UI_TEXTS.VOCAB_FILE_NO_FILE_SELECTED); // Send a "command" to potentially reset state
    }
  };


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono text-sm">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileSelected}
      />
      <CliOutput lines={output} />
      {mode !== 'LOADING' && mode !== 'ERROR' && mode !== 'EXITED' && (
        <CliInput
          ref={inputRef}
          currentValue={inputValue}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={(e) => { e.preventDefault(); processCommand(inputValue); }}
          disabled={isLoading || mode === 'EXITED'}
          isFocused={true}
        />
      )}
      {mode === 'ERROR' && !isLoading && ( // Ensure not to show vocab load error if it's another type of error state
        <div className="p-2 text-destructive">{UI_TEXTS.VOCAB_LOAD_ERROR}</div>
      )}
    </div>
  );
}
