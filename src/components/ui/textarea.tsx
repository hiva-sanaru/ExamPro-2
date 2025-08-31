
"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, onChange, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => internalRef.current!);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (internalRef.current) {
      internalRef.current.style.height = 'auto';
      internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
    }
    if (onChange) {
      onChange(e);
    }
  };
  
  React.useLayoutEffect(() => {
    if (internalRef.current) {
      internalRef.current.style.height = 'auto';
      internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
    }
  }, [props.value]);


  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'resize-none', // Disable manual resizing
        className
      )}
      ref={internalRef}
      rows={1}
      onInput={handleInput} // Use onInput to ensure height adjustment happens correctly
      onChange={onChange} // Also keep onChange for form libraries
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
