import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useShogun } from 'shogun-button-react';

/**
 * Component to serve files from GunDB directory structure
 * Route: /dweb/file/:username/:pagename/:filepath
 */
const DWebFileServer: React.FC = () => {
  const { username, pagename, filepath } = useParams<{ username: string; pagename: string; filepath: string }>();
  const { sdk } = useShogun() as any;
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(null);
  const [contentType, setContentType] = useState<string>('application/octet-stream');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!username || !pagename || !filepath) {
      setError('Missing parameters');
      setIsLoading(false);
      return;
    }

    const loadFile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
        if (!gunInstance) {
          throw new Error('GunDB not available');
        }

        // Cerca il mapping username -> pub
        const mappingNode = gunInstance.get('dweb').get('users').get(username);
        
        mappingNode.once((mapping: any) => {
          if (!mapping || !mapping.pub) {
            setError('User not found');
            setIsLoading(false);
            return;
          }

          // Carica i dati dell'app
          const appNode = gunInstance.get('~' + mapping.pub).get('sites').get(pagename);
          
          appNode.once((data: any) => {
            if (!data || !data.files) {
              setError('App not found or no files structure');
              setIsLoading(false);
              return;
            }

            // Decodifica il filepath
            const decodedPath = decodeURIComponent(filepath);
            
            // Cerca il file nella struttura
            const fileData = data.files[decodedPath] || 
                           Object.entries(data.files).find(([key]) => key.endsWith(decodedPath))?.[1];

            if (!fileData) {
              setError('File not found in directory structure');
              setIsLoading(false);
              return;
            }

            // Determina content type
            const detectedType = fileData.type || getContentTypeFromPath(decodedPath);
            setContentType(detectedType);

            // Gestisci il contenuto in base all'encoding
            if (fileData.encoding === 'base64') {
              // Decodifica base64
              const binaryString = atob(fileData.content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              setFileContent(bytes.buffer);
            } else {
              // Testo normale
              setFileContent(fileData.content);
            }

            setIsLoading(false);
          });
        });
      } catch (err: any) {
        setError(err.message || 'Error loading file');
        setIsLoading(false);
      }
    };

    loadFile();
  }, [username, pagename, filepath, sdk]);

  // Determina content type dal path
  const getContentTypeFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'webp': 'image/webp',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  // Renderizza il contenuto
  useEffect(() => {
    if (!fileContent || isLoading) return;

    // Per file binari, crea un blob URL
    if (fileContent instanceof ArrayBuffer) {
      const blob = new Blob([fileContent], { type: contentType });
      const url = URL.createObjectURL(blob);
      
      // Reindirizza al blob URL
      window.location.href = url;
      
      return () => URL.revokeObjectURL(url);
    } else {
      // Per file di testo, servili direttamente
      // Questo componente non renderizza, ma serve il file
      // In realtà dovremmo usare un approccio diverso per servire file
    }
  }, [fileContent, contentType, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <div className="text-error">❌ {error}</div>
      </div>
    );
  }

  // Per file di testo, servili come risposta HTTP
  // In React, dobbiamo usare un approccio diverso
  // Per ora, mostriamo il contenuto se è testo
  if (typeof fileContent === 'string') {
    if (contentType.startsWith('text/') || contentType.includes('javascript') || contentType.includes('json')) {
      return (
        <pre style={{ 
          margin: 0, 
          padding: '1rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          {fileContent}
        </pre>
      );
    }
  }

  return null;
};

export default DWebFileServer;

