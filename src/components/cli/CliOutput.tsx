"use client";

import React, { useRef, useEffect } from 'react';
import type { OutputLineData } from '@/types';
import { cn } from '@/lib/utils';

interface CliOutputProps {
  lines: OutputLineData[];
}

const CliOutput: React.FC<CliOutputProps> = ({ lines }) => {
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const getLineStyle = (type: OutputLineData['type']) => {
    switch (type) {
      case 'error':
        return 'text-destructive';
      case 'success':
        return 'text-green-400'; // Custom success color, can be themed
      case 'info':
        return 'text-blue-400'; // Custom info color
      case 'prompt':
      case 'user': // User input shown in primary color for emphasis
        return 'text-primary';
      case 'question':
        return 'text-yellow-400'; // Custom question color
      case 'header':
        return 'font-bold text-foreground mb-1';
      case 'system':
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="flex-grow overflow-y-auto p-2 space-y-1 whitespace-pre-wrap break-words">
      {lines.map((line) => (
        <div key={line.id} className={cn("flex", line.type === 'user' ? 'pl-0' : '')}>
          {line.type !== 'user' && line.type !== 'prompt' && <span className="mr-2 opacity-60">{'>'}</span>}
          <div className={cn(getLineStyle(line.type), 'flex-1')}>
            {line.content}
          </div>
        </div>
      ))}
      <div ref={outputEndRef} />
    </div>
  );
};

export default CliOutput;
