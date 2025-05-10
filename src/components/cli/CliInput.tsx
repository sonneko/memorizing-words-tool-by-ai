
"use client";

import React, { forwardRef } from 'react';
import Cursor from './Cursor';
import { PROMPT_SYMBOL } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CliInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  promptSymbol?: string;
  onInputChange: (value: string) => void;
  currentValue: string;
  isFocused?: boolean;
}

const CliInput = forwardRef<HTMLInputElement, CliInputProps>(
  ({ promptSymbol = PROMPT_SYMBOL, onInputChange, currentValue, isFocused = true, className, ...props }, ref) => {
    return (
      <div className={cn("flex items-center p-2 border-t border-border", className)}>
        <span className="text-primary mr-1">{promptSymbol}</span>
        {isFocused && <Cursor className="mr-1" />} {/* Moved cursor here and added margin */}
        <input
          ref={ref}
          type="text"
          value={currentValue}
          onChange={(e) => onInputChange(e.target.value)}
          // Added pl-0.5 for a small space after the custom cursor if it's very close
          className="flex-grow bg-transparent text-input-foreground focus:outline-none placeholder-muted-foreground pl-0.5" 
          autoFocus
          spellCheck="false"
          autoComplete="off"
          // To hide native browser caret if desired:
          // style={{ caretColor: 'transparent' }} 
          // Or use Tailwind: caret-transparent (if Tailwind v3.3+)
          {...props}
        />
      </div>
    );
  }
);

CliInput.displayName = 'CliInput';
export default CliInput;
