
"use client";
import type React from 'react';
import { useRef, ChangeEvent, KeyboardEvent, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface DigitInputProps {
  count: number;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function DigitInput({ count, values, onChange, disabled = false, ariaLabel = "Enter digit" }: DigitInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(count).fill(null));

  useEffect(() => {
    // Ensure inputRefs array has the correct length
    inputRefs.current = inputRefs.current.slice(0, count);
  }, [count]);
  
  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const newValues = [...values];
    const char = event.target.value.slice(-1); // Get last char in case of paste

    if (/^[0-9]$/.test(char) || char === '') {
      newValues[index] = char;
      onChange(newValues);

      if (char !== '' && index < count - 1 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && values[index] === '' && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < count - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex space-x-2 justify-center">
      {Array.from({ length: count }).map((_, index) => (
        <Input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="tel" // Use "tel" for numeric keyboard on mobile
          maxLength={1}
          value={values[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-2xl font-bold rounded-md shadow-inner bg-input focus:bg-background focus:ring-primary"
          aria-label={`${ariaLabel} ${index + 1}`}
          pattern="[0-9]*"
          inputMode="numeric"
        />
      ))}
    </div>
  );
}
