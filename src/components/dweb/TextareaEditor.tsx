import React, { useRef, useEffect, useCallback, useState } from 'react';

interface TextareaEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A minimalist text editor based on textarea.my
 * Uses a standard textarea for maximum compatibility
 */
const TextareaEditor: React.FC<TextareaEditorProps> = ({
  initialContent = '',
  onChange,
  placeholder = 'Start typing your content here...',
  className = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle content changes with debounce
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange?.(newContent);
  }, [onChange]);

  // Focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(400, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck
        className={`
          w-full min-h-[400px] p-4 
          font-mono text-base leading-relaxed
          bg-base-200 rounded-lg border-0
          outline-none resize-none
          whitespace-pre-wrap
          focus:ring-2 focus:ring-primary/30
          transition-all duration-200
          placeholder:text-base-content/40
        `}
        style={{
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
          tabSize: 4,
        }}
      />
    </div>
  );
};

export default TextareaEditor;
