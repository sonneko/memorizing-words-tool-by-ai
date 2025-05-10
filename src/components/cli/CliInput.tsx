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
        <input
          ref={ref}
          type="text"
          value={currentValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="flex-grow bg-transparent text-input-foreground focus:outline-none placeholder-muted-foreground"
          autoFocus
          spellCheck="false"
          autoComplete="off"
          {...props}
        />
        {isFocused && <Cursor />}
      </div>
    );
  }
);

CliInput.displayName = 'CliInput';
export default CliInput;
