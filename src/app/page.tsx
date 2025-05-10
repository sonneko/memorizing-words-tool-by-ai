"use client";

import React, { useEffect } from 'react';
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
    showMenu,
  } = useCliInterface();

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('SW registered: ', registration))
          .catch(registrationError => console.log('SW registration failed: ', registrationError));
      });
    }
  }, []);

  // Handle global click to focus input
  useEffect(() => {
    const focusInput = (event: MouseEvent) => {
      // Check if the click is not on an interactive element like a button inside the output
      if (inputRef.current && event.target && !(event.target as HTMLElement).closest('button, a, input, textarea')) {
         inputRef.current.focus();
      }
    };
    document.addEventListener('click', focusInput);
    return () => {
      document.removeEventListener('click', focusInput);
    };
  }, [inputRef]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono">
      <CliOutput lines={output} />
      {mode !== 'LOADING' && mode !== 'ERROR' && mode !== 'EXITED' && (
        <CliInput
          ref={inputRef}
          currentValue={inputValue}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={(e) => { e.preventDefault(); processCommand(inputValue); }}
          disabled={isLoading || mode === 'EXITED'}
          isFocused={true} // Let CSS handle actual focus state for cursor visibility
        />
      )}
      {mode === 'ERROR' && (
        <div className="p-2 text-destructive">{UI_TEXTS.VOCAB_LOAD_ERROR}</div>
      )}
    </div>
  );
}
