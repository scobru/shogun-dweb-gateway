import React, { useRef, useEffect, useCallback, useState } from 'react';

interface TextareaEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A minimalist text editor based on textarea.my
 * Uses contenteditable with plaintext-only mode for clean editing
 */
const TextareaEditor: React.FC<TextareaEditorProps> = ({
  initialContent = '',
  onChange,
  placeholder = 'Start typing your content here...',
  className = ''
}) => {
  const articleRef = useRef<HTMLElement>(null);
  const [isEmpty, setIsEmpty] = useState(!initialContent);

  // Debounce function
  const debounce = useCallback((fn: Function, ms: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }, []);

  // Handle content changes
  const handleInput = useCallback(
    debounce(() => {
      if (articleRef.current) {
        const content = articleRef.current.textContent || '';
        setIsEmpty(!content.trim());
        onChange?.(content);
      }
    }, 300),
    [onChange]
  );

  // Set initial content
  useEffect(() => {
    if (articleRef.current && initialContent) {
      articleRef.current.textContent = initialContent;
      setIsEmpty(!initialContent.trim());
    }
  }, [initialContent]);

  // Focus on mount
  useEffect(() => {
    if (articleRef.current) {
      articleRef.current.focus();
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <article
        ref={articleRef}
        contentEditable="plaintext-only"
        onInput={handleInput}
        spellCheck
        className={`
          w-full min-h-[400px] p-4 
          font-mono text-base leading-relaxed
          bg-base-200 rounded-lg
          outline-none
          whitespace-pre-wrap break-words
          [tab-size:4]
          focus:ring-2 focus:ring-primary/30
          transition-all duration-200
        `}
        style={{
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}
      />
      {isEmpty && (
        <div className="absolute top-4 left-4 text-base-content/40 pointer-events-none font-mono">
          {placeholder}
        </div>
      )}
    </div>
  );
};

export default TextareaEditor;
