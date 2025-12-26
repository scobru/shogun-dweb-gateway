import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShogun } from 'shogun-button-react';
import { ShogunRelaySDK } from 'shogun-relay-sdk';
import { decompress } from '../../utils/compress';

const DWebViewer: React.FC = () => {
  const { username, pagename } = useParams<{ username: string; pagename?: string }>();
  const { sdk } = useShogun() as any;
  const [appHtml, setAppHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const appFoundRef = useRef(false);

  const pageName = pagename || 'site';

  useEffect(() => {
    if (!username) {
      setError('Username non specificato');
      setIsLoading(false);
      return;
    }

    // Aspetta che Gun sia disponibile
    const checkAndLoad = () => {
      const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
      if (gunInstance) {
        loadApp(gunInstance);
      } else {
        // Riprova dopo un po' se non è ancora disponibile
        setTimeout(checkAndLoad, 500);
      }
    };

    checkAndLoad();

    // Cleanup
    return () => {
      appFoundRef.current = false;
    };
  }, [username, pageName, sdk]);

  // Carica HTML da IPFS usando relay SDK
  const loadFromIPFS = async (ipfsHash: string, isDirectory: boolean = false, mainHtmlPath: string = 'index.html') => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🌐 [VIEWER] Caricamento da IPFS usando relay SDK, hash:', ipfsHash, isDirectory ? `(directory, path: ${mainHtmlPath})` : '');

      // Usa il relay SDK per caricare il file
      // Prova prima con il relay principale, poi con fallback a gateway IPFS pubblici
      const relayUrls = [
        'https://shogun-relay.scobrudot.dev',
        // Aggiungi altri relay se disponibili
      ];
      
      // Gateway IPFS pubblici come fallback per directory
      const publicGateways = [
        'https://ipfs.io',
        'https://gateway.pinata.cloud',
        'https://cloudflare-ipfs.com',
      ];

      // Recupera auth token da localStorage se disponibile
      const authToken = localStorage.getItem('dweb_auth_token');

      let htmlContent = null;
      let lastError: any = null;

      for (const relayUrl of relayUrls) {
        try {
          console.log(`🔄 [VIEWER] Tentativo con relay: ${relayUrl}`);
          
          let text: string;
          
          // Crea istanza SDK per questo relay
          const sdk = new ShogunRelaySDK({
            baseURL: relayUrl,
            token: authToken || undefined,
            timeout: 30000,
          });

          if (isDirectory) {
            // Per directory, usa il nuovo metodo catFromDirectory dell'SDK
            try {
              console.log(`📁 [VIEWER] Tentativo caricamento directory via SDK: ${ipfsHash}/${mainHtmlPath}`);
              
              const buffer = await (sdk.ipfs as any).catFromDirectory(ipfsHash, mainHtmlPath) as any;
              
              // Converti ArrayBuffer in stringa HTML
              if (buffer instanceof ArrayBuffer) {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(buffer);
              } else if (buffer instanceof Uint8Array) {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(buffer);
              } else if (typeof buffer === 'string') {
                text = buffer;
              } else {
                const uint8Array = new Uint8Array(buffer);
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(uint8Array);
              }
              
              // Modifica l'HTML per risolvere i path relativi
              text = rewriteRelativePaths(text, ipfsHash, relayUrl);
              console.log(`✅ [VIEWER] File caricato da directory via SDK`);
            } catch (apiError: any) {
              // Fallback: prova a caricare direttamente il CID (potrebbe essere un file singolo)
              console.log(`⚠️ [VIEWER] API directory fallita, provo CID diretto...`, apiError.message);
              
              const buffer = await sdk.ipfs.cat(ipfsHash) as any;
              
              if (buffer instanceof ArrayBuffer) {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(buffer);
              } else if (buffer instanceof Uint8Array) {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(buffer);
              } else if (typeof buffer === 'string') {
                text = buffer;
              } else {
                const uint8Array = new Uint8Array(buffer);
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(uint8Array);
              }
              
              // Non riscrivere i path se è un file singolo
              console.log(`✅ [VIEWER] File caricato come file singolo`);
            }
          } else {
            // Per file singoli, usa il relay SDK
            const sdk = new ShogunRelaySDK({
              baseURL: relayUrl,
              token: authToken || undefined,
              timeout: 30000,
            });
            
            // Usa il metodo cat per recuperare il file
            const buffer = await sdk.ipfs.cat(ipfsHash) as any;
            
            // Converti ArrayBuffer in stringa HTML
            if (buffer instanceof ArrayBuffer) {
              const decoder = new TextDecoder('utf-8');
              text = decoder.decode(buffer);
            } else if (buffer instanceof Uint8Array) {
              const decoder = new TextDecoder('utf-8');
              text = decoder.decode(buffer);
            } else if (typeof buffer === 'string') {
              text = buffer;
            } else {
              // Fallback: prova a convertire in qualsiasi modo
              try {
                const uint8Array = new Uint8Array(buffer);
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(uint8Array);
              } catch (e) {
                throw new Error('Unable to decode file content');
              }
            }
          }

          htmlContent = text;
          console.log(`✅ [VIEWER] File caricato con successo da relay: ${relayUrl}`);
          break;
        } catch (err: any) {
          console.warn(`⚠️ [VIEWER] Errore con relay ${relayUrl}:`, err);
          lastError = err;
          continue;
        }
      }

      // Se i relay falliscono e è una directory, prova con gateway IPFS pubblici
      if (!htmlContent && isDirectory) {
        console.log('🔄 [VIEWER] Tentativo con gateway IPFS pubblici...');
        for (const gatewayUrl of publicGateways) {
          try {
            const url = `${gatewayUrl}/ipfs/${ipfsHash}/${mainHtmlPath}`;
            console.log(`🌐 [VIEWER] Tentativo con gateway pubblico: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            htmlContent = await response.text();
            
            // Modifica l'HTML per risolvere i path relativi usando il gateway pubblico
            htmlContent = rewriteRelativePaths(htmlContent, ipfsHash, gatewayUrl);
            
            console.log(`✅ [VIEWER] File caricato con successo da gateway pubblico: ${gatewayUrl}`);
            break;
          } catch (err: any) {
            console.warn(`⚠️ [VIEWER] Errore con gateway pubblico ${gatewayUrl}:`, err);
            lastError = err;
            continue;
          }
        }
      }

      if (htmlContent) {
        setAppHtml(htmlContent);
        setIsLoading(false);
        setError(null);
      } else {
        setIsLoading(false);
        const errorMsg = lastError?.message || 'Unknown error';
        setError(`Unable to load file from IPFS (${ipfsHash.slice(0, 16)}...). Error: ${errorMsg}`);
        console.error('❌ [VIEWER] All relays and gateways failed:', lastError);
      }
    } catch (error: any) {
      setIsLoading(false);
      setError('Error loading from IPFS: ' + error.message);
      console.error('❌ [VIEWER] General IPFS loading error:', error);
    }
  };

  // Riscrive i path relativi nell'HTML per puntare a IPFS
  const rewriteRelativePaths = (html: string, directoryCid: string, relayUrl: string): string => {
    // Crea un parser DOM temporaneo per modificare l'HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Modifica i tag <link> per CSS
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('data:')) {
        // Path relativo, risolvilo usando il directory CID
        // Rimuovi eventuali slash iniziali
        const cleanPath = href.replace(/^\/+/, '');
        const newHref = `${relayUrl}/ipfs/${directoryCid}/${cleanPath}`;
        link.setAttribute('href', newHref);
        console.log(`🔗 [VIEWER] Riscritto CSS path: ${href} -> ${newHref}`);
      }
    });

    // Modifica i tag <script> per JS
    doc.querySelectorAll('script[src]').forEach((script) => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        // Path relativo, risolvilo usando il directory CID
        const cleanPath = src.replace(/^\/+/, '');
        const newSrc = `${relayUrl}/ipfs/${directoryCid}/${cleanPath}`;
        script.setAttribute('src', newSrc);
        console.log(`🔗 [VIEWER] Riscritto JS path: ${src} -> ${newSrc}`);
      }
    });

    // Modifica i tag <img> per immagini
    doc.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        const cleanPath = src.replace(/^\/+/, '');
        const newSrc = `${relayUrl}/ipfs/${directoryCid}/${cleanPath}`;
        img.setAttribute('src', newSrc);
        console.log(`🔗 [VIEWER] Riscritto IMG path: ${src} -> ${newSrc}`);
      }
    });

    // Ritorna l'HTML modificato
    return doc.documentElement.outerHTML;
  };

  // Riscrive i path relativi per file salvati in GunDB usando data URLs
  const rewriteGunDBPaths = (html: string, files: any): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Converte il contenuto del file in data URL
    const getFileDataUrl = (fileData: any, mimeType: string): string => {
      if (!fileData || !fileData.content) return '';
      
      if (fileData.encoding === 'base64') {
        // File binario codificato in base64
        return `data:${mimeType};base64,${fileData.content}`;
      } else {
        // File di testo
        const encoded = encodeURIComponent(fileData.content);
        return `data:${mimeType};charset=utf-8,${encoded}`;
      }
    };

    // Determina MIME type dal path
    const getMimeType = (path: string): string => {
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

    // Modifica i tag <link> per CSS
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('data:')) {
        const cleanPath = href.replace(/^\/+/, '');
        // Verifica se il file esiste nella struttura
        const fileKey = files[cleanPath] ? cleanPath : Object.keys(files).find(key => key.endsWith(cleanPath));
        if (fileKey && files[fileKey]) {
          const mimeType = getMimeType(fileKey);
          const dataUrl = getFileDataUrl(files[fileKey], mimeType);
          if (dataUrl) {
            link.setAttribute('href', dataUrl);
            console.log(`🔗 [VIEWER] Riscritto CSS path (GunDB): ${href} -> data URL`);
          }
        }
      }
    });

    // Modifica i tag <script> per JS
    doc.querySelectorAll('script[src]').forEach((script) => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        const cleanPath = src.replace(/^\/+/, '');
        const fileKey = files[cleanPath] ? cleanPath : Object.keys(files).find(key => key.endsWith(cleanPath));
        if (fileKey && files[fileKey]) {
          const mimeType = getMimeType(fileKey);
          const dataUrl = getFileDataUrl(files[fileKey], mimeType);
          if (dataUrl) {
            script.setAttribute('src', dataUrl);
            console.log(`🔗 [VIEWER] Riscritto JS path (GunDB): ${src} -> data URL`);
          }
        }
      }
    });

    // Modifica i tag <img> per immagini
    doc.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        const cleanPath = src.replace(/^\/+/, '');
        const fileKey = files[cleanPath] ? cleanPath : Object.keys(files).find(key => key.endsWith(cleanPath));
        if (fileKey && files[fileKey]) {
          const mimeType = getMimeType(fileKey);
          const dataUrl = getFileDataUrl(files[fileKey], mimeType);
          if (dataUrl) {
            img.setAttribute('src', dataUrl);
            console.log(`🔗 [VIEWER] Riscritto IMG path (GunDB): ${src} -> data URL`);
          }
        }
      }
    });

    return doc.documentElement.outerHTML;
  };

  const loadApp = (gunInstance: any) => {
    if (!gunInstance || !username) {
      setError('GunDB not available');
      setIsLoading(false);
      return;
    }

    appFoundRef.current = false;
    setIsLoading(true);
    setError(null);

    const gun = gunInstance;
    
    // Cerca il mapping username -> pub
    const mappingNode = gun.get('dweb').get('users').get(username);
    
    mappingNode.once((mapping: any) => {
      if (mapping && mapping.pub) {
        // Trovato mapping, cerca l'app usando la pub key
        const appNode = gun.get('~' + mapping.pub).get('sites').get(pageName);
        
        appNode.on((data: any) => {
          if (data && !appFoundRef.current) {
            appFoundRef.current = true;
            
            console.log('📥 [VIEWER] Dati ricevuti:', {
              hasHtml: !!data.html,
              hasIpfsHash: !!data.ipfsHash,
              publishMode: data.publishMode
            });
            
            // Controlla il publishMode per decidere da dove caricare
            const publishMode = data.publishMode || 'gundb';
            
            if (publishMode === 'gundb') {
              // Modalità GunDB: usa HTML diretto da GunDB
              if (data.html) {
                console.log('🗄️ [VIEWER] Caricamento da GunDB (modalità gundb)');
                let htmlContent: string;
                
                // Decode HTML if it's base64 encoded (to avoid GunDB parsing issues with URLs)
                if (data.htmlEncoding === 'base64') {
                  try {
                    htmlContent = decodeURIComponent(escape(atob(data.html)));
                    console.log('📄 [VIEWER] HTML decodificato da base64');
                  } catch (e) {
                    console.error('❌ [VIEWER] Errore decodifica base64:', e);
                    htmlContent = data.html; // Fallback to raw content
                  }
                } else {
                  htmlContent = data.html;
                }
                
                // Se ci sono multipli file, riscrivi i path relativi per puntare ai file salvati in GunDB
                if (data.isDirectory && data.files && Object.keys(data.files).length > 1) {
                  htmlContent = rewriteGunDBPaths(htmlContent, data.files);
                }
                
                setAppHtml(htmlContent);
                setIsLoading(false);
                setError(null);
              } else {
                console.error('❌ [VIEWER] Modalità GunDB ma HTML non trovato');
                setIsLoading(false);
                setError('HTML non trovato in GunDB per questa app');
              }
            } else if (publishMode === 'textarea') {
              // Modalità Textarea: decomprime hash e mostra contenuto
              if (data.textareaHash) {
                console.log('✨ [VIEWER] Caricamento da textarea (modalità textarea)');
                decompress(data.textareaHash).then((decompressedContent) => {
                  // Wrap content in basic HTML to display
                  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { color-scheme: light dark; background-color: #fff; color: #161616; }
    @media (prefers-color-scheme: dark) {
      html { background-color: #000; color: #fff; }
    }
    article {
      padding: 18px max(18px, calc(50vw - 400px));
      width: 100%;
      min-height: 100vh;
      font: 18px / 1.5 system-ui;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <article>${decompressedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</article>
</body>
</html>`;
                  setAppHtml(htmlContent);
                  setIsLoading(false);
                  setError(null);
                }).catch((e: any) => {
                  console.error('❌ [VIEWER] Errore decompressione textarea:', e);
                  setIsLoading(false);
                  setError('Errore nella decompressione del contenuto textarea: ' + e.message);
                });
              } else {
                console.error('❌ [VIEWER] Modalità textarea ma hash non trovato');
                setIsLoading(false);
                setError('Hash textarea non trovato per questa app');
              }
            } else if (publishMode === 'relay' || publishMode === 'deals') {
              // Modalità IPFS (relay o deals): carica da IPFS gateway
              if (data.ipfsHash) {
                const isDirectory = data.isDirectory || false;
                const mainHtmlPath = data.files && data.files.length > 0 
                  ? data.files.find((f: any) => f.name.endsWith('.html') || f.name.endsWith('.htm'))?.path || 'index.html'
                  : 'index.html';
                console.log(`🌐 [VIEWER] Caricamento da IPFS (modalità ${publishMode}), hash: ${data.ipfsHash}`, isDirectory ? `(directory)` : '');
                loadFromIPFS(data.ipfsHash, isDirectory, mainHtmlPath);
              } else {
                console.error(`❌ [VIEWER] Modalità ${publishMode} ma IPFS hash non trovato`);
                setIsLoading(false);
                setError(`IPFS hash non trovato per modalità ${publishMode}`);
              }
            } else {
              // Fallback: se non c'è publishMode, usa la logica vecchia
              // (per compatibilità con app pubblicate prima)
              if (data.ipfsHash) {
                const isDirectory = data.isDirectory || false;
                const mainHtmlPath = data.files && data.files.length > 0 
                  ? data.files.find((f: any) => f.name.endsWith('.html') || f.name.endsWith('.htm'))?.path || 'index.html'
                  : 'index.html';
                console.log('🌐 [VIEWER] Fallback: caricamento da IPFS (hash presente)', isDirectory ? `(directory)` : '');
                loadFromIPFS(data.ipfsHash, isDirectory, mainHtmlPath);
              } else if (data.html) {
                console.log('🗄️ [VIEWER] Fallback: caricamento da GunDB (HTML presente)');
                setAppHtml(data.html);
                setIsLoading(false);
                setError(null);
              } else {
                console.error('❌ [VIEWER] Nessun dato disponibile (né HTML né IPFS hash)');
                setIsLoading(false);
                setError('Nessun contenuto disponibile per questa app');
              }
            }
          }
        });
      }
      
      // Fallback: ricerca diretta (anche se mapping trovato)
      const fallbackTimeout = setTimeout(() => {
        if (!appFoundRef.current) {
          gun.user(username).get('sites').get(pageName).on((data: any) => {
            if (data && !appFoundRef.current) {
              appFoundRef.current = true;
              
              console.log('📥 [VIEWER] Dati ricevuti (fallback):', {
                hasHtml: !!data.html,
                hasIpfsHash: !!data.ipfsHash,
                publishMode: data.publishMode
              });
              
              // Controlla il publishMode per decidere da dove caricare
              const publishMode = data.publishMode || 'gundb';
              
              if (publishMode === 'gundb') {
                // Modalità GunDB: usa HTML diretto da GunDB
                if (data.html) {
                  console.log('🗄️ [VIEWER] Caricamento da GunDB (modalità gundb, fallback)');
                  let htmlContent: string;
                  
                  // Decode HTML if it's base64 encoded
                  if (data.htmlEncoding === 'base64') {
                    try {
                      htmlContent = decodeURIComponent(escape(atob(data.html)));
                    } catch (e) {
                      htmlContent = data.html;
                    }
                  } else {
                    htmlContent = data.html;
                  }
                  
                  // Se ci sono multipli file, riscrivi i path relativi
                  if (data.isDirectory && data.files && Object.keys(data.files).length > 1) {
                    htmlContent = rewriteGunDBPaths(htmlContent, data.files);
                  }
                  
                  setAppHtml(htmlContent);
                  setIsLoading(false);
                  setError(null);
                } else {
                  console.error('❌ [VIEWER] Modalità GunDB ma HTML non trovato (fallback)');
                  setIsLoading(false);
                  setError('HTML non trovato in GunDB per questa app');
                }
              } else if (publishMode === 'relay' || publishMode === 'deals') {
                // Modalità IPFS (relay o deals): carica da IPFS gateway
                if (data.ipfsHash) {
                  const isDirectory = data.isDirectory || false;
                  const mainHtmlPath = data.files && data.files.length > 0 
                    ? data.files.find((f: any) => f.name.endsWith('.html') || f.name.endsWith('.htm'))?.path || 'index.html'
                    : 'index.html';
                  console.log(`🌐 [VIEWER] Caricamento da IPFS (modalità ${publishMode}, fallback), hash: ${data.ipfsHash}`, isDirectory ? `(directory)` : '');
                  loadFromIPFS(data.ipfsHash, isDirectory, mainHtmlPath);
                } else {
                  console.error(`❌ [VIEWER] Modalità ${publishMode} ma IPFS hash non trovato (fallback)`);
                  setIsLoading(false);
                  setError(`IPFS hash non trovato per modalità ${publishMode}`);
                }
              } else {
                // Fallback: se non c'è publishMode, usa la logica vecchia
                if (data.ipfsHash) {
                  const isDirectory = data.isDirectory || false;
                  const mainHtmlPath = data.files && data.files.length > 0 
                    ? data.files.find((f: any) => f.name.endsWith('.html') || f.name.endsWith('.htm'))?.path || 'index.html'
                    : 'index.html';
                  console.log('🌐 [VIEWER] Fallback: caricamento da IPFS (hash presente)', isDirectory ? `(directory)` : '');
                  loadFromIPFS(data.ipfsHash, isDirectory, mainHtmlPath);
                } else if (data.html) {
                  console.log('🗄️ [VIEWER] Fallback: caricamento da GunDB (HTML presente)');
                  let htmlContent: string;
                  
                  // Decode HTML if it's base64 encoded
                  if (data.htmlEncoding === 'base64') {
                    try {
                      htmlContent = decodeURIComponent(escape(atob(data.html)));
                    } catch (e) {
                      htmlContent = data.html;
                    }
                  } else {
                    htmlContent = data.html;
                  }
                  
                  // Se ci sono multipli file, riscrivi i path relativi
                  if (data.isDirectory && data.files && Object.keys(data.files).length > 1) {
                    htmlContent = rewriteGunDBPaths(htmlContent, data.files);
                  }
                  
                  setAppHtml(htmlContent);
                  setIsLoading(false);
                  setError(null);
                } else {
                  console.error('❌ [VIEWER] Nessun dato disponibile (fallback)');
                  setIsLoading(false);
                  setError('Nessun contenuto disponibile per questa app');
                }
              }
            }
          });
        }
      }, 2000);

      // Timeout finale
      const finalTimeout = setTimeout(() => {
        if (!appFoundRef.current) {
          setIsLoading(false);
          setError(`App "${pageName}" non trovata per username: "${username}". Verifica che l'app sia stata pubblicata e che l'username sia corretto.`);
          console.error('App not found after all attempts:', { username, pageName, mapping });
        }
      }, 10000);

      // Cleanup function
      return () => {
        clearTimeout(fallbackTimeout);
        clearTimeout(finalTimeout);
      };
    });
  };

  // Renderizza HTML in iframe quando disponibile
  useEffect(() => {
    if (appHtml && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(appHtml);
        doc.close();
      }
    }
  }, [appHtml]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 bg-black text-green-400 font-mono">
        <span className="loading loading-lg"></span>
        <p>Loading app "{pageName}" by "{username}"...</p>
        <p className="text-sm text-gray-500">Relay: shogun-relay.scobrudot.dev</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 bg-black text-red-400 font-mono p-8 text-center">
        <div className="text-2xl mb-4">❌ {error}</div>
        <p className="text-sm text-gray-400">
          Verify that the username and page name are correct and that the app has been published.
        </p>
        <Link to="/dweb" className="btn btn-primary mt-4">Back to Dashboard</Link>
      </div>
    );
  }

  // Renderizza l'HTML in un iframe con isolamento completo
  return (
    <div className="w-full h-screen bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title={`App ${username}/${pageName}`}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        style={{ backgroundColor: 'white' }}
      />
    </div>
  );
};

export default DWebViewer;
