import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { decompressWithStyle } from '../../utils/compress';
import logo from '../../assets/logo.svg';

/**
 * Standalone viewer for textarea-compressed content
 * Route: /dweb/t/:hash
 * 
 * This renders content directly from the URL hash without needing GunDB lookup.
 * Perfect for sharing quick notes and documents.
 * 
 * Based on textarea.my (https://github.com/antonmedv/textarea)
 */
const DWebTextareaViewer: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [content, setContent] = useState<string>('');
  const [style, setStyle] = useState<string | undefined>();
  const [title, setTitle] = useState<string>('DWeb Textarea');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      if (!hash) {
        setError('No content hash provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { content: decompressedContent, style: decompressedStyle } = await decompressWithStyle(hash);
        
        setContent(decompressedContent);
        setStyle(decompressedStyle);
        
        // Extract title from first heading (# Title)
        const titleMatch = decompressedContent.match(/^\n*#(.+)\n/);
        if (titleMatch) {
          setTitle(titleMatch[1].trim());
          document.title = titleMatch[1].trim();
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to decompress content:', err);
        setError(`Failed to decompress content: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadContent();
  }, [hash]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-4">
        <div className="text-error text-xl mb-4">❌ {error}</div>
        <Link to="/dweb" className="btn btn-primary">
          Back to DWeb
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 bg-base-100/80 backdrop-blur-sm border-b border-base-300/30 z-10">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/dweb" className="flex items-center gap-2 text-sm text-base-content/60 hover:text-primary transition-colors">
            <img src={logo} alt="Shogun" className="w-5 h-5" />
            <span>DWeb</span>
          </Link>
          <div className="text-sm text-base-content/50">{title}</div>
        </div>
      </header>

      {/* Content */}
      <article 
        className="max-w-4xl mx-auto px-4 pt-16 pb-8 min-h-screen"
        style={style ? { ...parseStyle(style) } : undefined}
      >
        <pre className="whitespace-pre-wrap font-[system-ui] text-lg leading-relaxed break-words">
          {content}
        </pre>
      </article>
    </div>
  );
};

// Parse CSS style string into React style object
function parseStyle(styleString: string): React.CSSProperties {
  const result: Record<string, string> = {};
  styleString.split(';').forEach(rule => {
    const [property, value] = rule.split(':').map(s => s.trim());
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelProperty] = value;
    }
  });
  return result as React.CSSProperties;
}

export default DWebTextareaViewer;
