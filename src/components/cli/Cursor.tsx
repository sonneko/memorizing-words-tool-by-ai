"use client";

import { cn } from "@/lib/utils";

interface CursorProps {
  className?: string;
}

const Cursor: React.FC<CursorProps> = ({ className }) => {
  return (
    <span
      className={cn(
        "inline-block h-[1.1em] w-[0.5em] bg-primary align-text-bottom blinking-cursor",
        className
      )}
      aria-hidden="true"
    />
  );
};

export default Cursor;
