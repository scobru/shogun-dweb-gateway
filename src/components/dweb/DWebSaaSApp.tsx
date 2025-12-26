import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShogun, ShogunButton } from 'shogun-button-react';
import logo from '../../assets/logo.svg';
import TextareaEditor from './TextareaEditor';
import { compress } from '../../utils/compress';

type PublishMode = 'gundb' | 'relay' | 'deals' | 'textarea';

interface PublishedApp {
  pageName: string;
  publishedAt: number;
  fileName: string;
  ipfsHash?: string;
  textareaHash?: string;
  publishMode?: PublishMode;
}

const DWebSaaSApp: React.FC = () => {
  const { isLoggedIn, userPub, username, sdk } = useShogun() as any;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDirectory, setIsDirectory] = useState(false);
  const [pageName, setPageName] = useState('');
  const [publishedApps, setPublishedApps] = useState<PublishedApp[]>([]);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [publishMode, setPublishMode] = useState<PublishMode>('gundb');
  const [relayUrl, setRelayUrl] = useState('https://shogun-relay.scobrudot.dev');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>('');
  const [textareaContent, setTextareaContent] = useState<string>('');

  // Helper to get userPub and username, even if not yet available from hook
  const getActualUserInfo = () => {
    if (userPub && username) {
      return { userPub, username };
    }
    // Fallback: retrieve directly from GunDB
    const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
    if (gunInstance) {
      const gunUser = gunInstance.user();
      const pub = gunUser?.is?.pub;
      // Prefer alias, otherwise use full pub key, or shortened version without dots
      let displayName: string | null = null;
      if (gunUser?.is?.alias) {
        displayName = gunUser.is.alias;
      } else if (pub) {
        // Use full pub key if no alias, or shortened version (first 8 + last 4 chars)
        displayName = pub.length > 12 ? `${pub.slice(0, 8)}${pub.slice(-4)}` : pub;
      }
      if (pub) {
        return { userPub: pub, username: displayName || username || 'user' };
      }
    }
    return { userPub: null, username: null };
  };

  // Carica authToken da localStorage al mount
  useEffect(() => {
    const savedToken = localStorage.getItem('dweb_auth_token');
    if (savedToken) {
      setAuthToken(savedToken);
    }
  }, []);

  // Load user apps when logged in
  useEffect(() => {
    if (!isLoggedIn || !userPub) {
      // If not logged in, reset the list
      setPublishedApps([]);
      return;
    }

    // Wait for Gun to be available and user to be authenticated
    const checkAndLoad = () => {
      const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
      if (gunInstance) {
        const user = gunInstance.user();
        // Verify that the user is actually authenticated
        if (user && user.is) {
          loadUserApps();
        } else {
          // If Gun is available but user is not authenticated, retry after a bit
          setTimeout(checkAndLoad, 500);
        }
      } else {
        // Retry after a bit if Gun is not yet available
        setTimeout(checkAndLoad, 500);
      }
    };
    
    checkAndLoad();
  }, [isLoggedIn, sdk, userPub]);

  const loadUserApps = () => {
    if (!userPub) return;

    // Ottieni Gun da SDK o da window come fallback
    const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
    if (!gunInstance) return;

    const user = gunInstance.user();
    
    // Verifica che l'utente sia autenticato
    if (!user || !user.is) {
      console.warn('User not authenticated, cannot load apps');
      return;
    }
    
    // Get all sites for the current user
    const sitesNode = user.get('sites');

    console.log('🔄 [LOAD] Caricamento app utente...', { userPub });
    
    // Usa .on() per subscription persistente che funziona anche dopo refresh
    // GunDB mantiene la subscription attiva e carica i dati quando disponibili
    sitesNode.map().on((data: any, key: string) => {
      if (!key) {
        console.log('⚠️ [LOAD] Chiave vuota, skip');
        return; // Skip if no key
      }

      console.log(`📥 [LOAD] Dati ricevuti per "${key}":`, {
        hasHtml: !!data?.html,
        hasIpfsHash: !!data?.ipfsHash,
        publishMode: data?.publishMode,
        publishedAt: data?.publishedAt
      });

      setPublishedApps(prevApps => {
        if (data && (data.html || data.ipfsHash || data.textareaHash)) {
          // App esiste o è stata aggiornata
          const app: PublishedApp = {
            pageName: key,
            publishedAt: data.publishedAt || Date.now(),
            fileName: data.fileName || `${key}.html`,
            ipfsHash: data.ipfsHash,
            textareaHash: data.textareaHash,
            publishMode: data.publishMode || 'gundb'
          };

          console.log(`✅ [LOAD] App "${key}" aggiunta/aggiornata:`, app);

          const existingIndex = prevApps.findIndex(app => app.pageName === key);
          const updatedApps = [...prevApps];
          
          if (existingIndex >= 0) {
            updatedApps[existingIndex] = app;
            console.log(`🔄 [LOAD] App "${key}" aggiornata nella lista`);
          } else {
            updatedApps.push(app);
            console.log(`➕ [LOAD] App "${key}" aggiunta alla lista`);
          }

          // Sort by published date (newest first)
          updatedApps.sort((a, b) => b.publishedAt - a.publishedAt);
          console.log(`📋 [LOAD] Lista aggiornata, totale app: ${updatedApps.length}`);
          return updatedApps;
        } else {
          // Se i dati sono null/undefined, significa che l'app è stata eliminata
          console.log(`🗑️ [LOAD] App "${key}" eliminata (dati null/undefined)`);
          return prevApps.filter(app => app.pageName !== key);
        }
      });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if it's a directory upload (webkitdirectory)
    const isDir = files.length > 0 && files.some(f => (f as any).webkitRelativePath?.includes('/'));
    
    // Find HTML file(s)
    const htmlFiles = files.filter(f => f.name.endsWith('.html') || f.name.endsWith('.htm'));
    
    if (htmlFiles.length === 0) {
      setStatus({ message: 'Error: At least one HTML file is required', type: 'error' });
      return;
    }

    // If single file mode (old behavior)
    if (files.length === 1 && !isDir) {
      const file = files[0];
      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        setStatus({ message: 'Error: Select an HTML file or a folder with HTML files', type: 'error' });
        return;
      }
      setSelectedFile(file);
      setSelectedFiles([]);
      setIsDirectory(false);
      const defaultPageName = file.name.replace(/\.(html|htm)$/i, '').trim();
      setPageName(defaultPageName);
    } else {
      // Multi-file or directory mode
      setSelectedFile(htmlFiles[0]); // Main HTML file
      setSelectedFiles(files);
      setIsDirectory(isDir);
      const mainHtml = htmlFiles[0];
      const defaultPageName = mainHtml.name.replace(/\.(html|htm)$/i, '').trim();
      setPageName(defaultPageName);
    }
  };

  const handlePublish = async () => {
    // Different validation for each mode
    if (publishMode === 'deals') {
      // Deals mode: requires only CID (user enters it manually)
      if (!ipfsHash || !ipfsHash.trim()) {
        setStatus({ message: 'Error: Enter a valid IPFS CID', type: 'error' });
        return;
      }
    } else if (publishMode === 'relay') {
      // Relay mode: requires file (we'll do automatic upload)
      if (!selectedFile) {
        setStatus({ message: 'Error: Select an HTML file to upload to the relay', type: 'error' });
        return;
      }
    } else if (publishMode === 'textarea') {
      // Textarea mode: requires content
      if (!textareaContent || !textareaContent.trim()) {
        setStatus({ message: 'Error: Write some content in the editor', type: 'error' });
        return;
      }
    } else {
      // GunDB mode: requires file
      if (!selectedFile) {
        setStatus({ message: 'Error: Select an HTML file', type: 'error' });
        return;
      }
    }

    // Use getActualUserInfo to retrieve userPub and username
    const actualUserInfo = getActualUserInfo();
    const actualUserPub = actualUserInfo.userPub || userPub;
    const actualUsername = actualUserInfo.username || username;

    if (!actualUserPub) {
      setStatus({ message: 'Error: User not authenticated. Make sure you have logged in.', type: 'error' });
      return;
    }

    setStatus({ message: 'Publishing...', type: 'info' });

    try {
      // Sanitize page name
      const sanitizedPageName = pageName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
      
      if (!sanitizedPageName) {
        setStatus({ message: 'Error: Invalid page name', type: 'error' });
        return;
      }

      // Get Gun from SDK or from window as fallback
      const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
      if (!gunInstance) {
        setStatus({ 
          message: 'Error: GunDB not available. Wait a few seconds and try again.', 
          type: 'error' 
        });
        console.error('Gun instance not available:', {
          hasSDK: !!sdk,
          hasSDKGun: !!sdk?.gun,
          hasWindowShogun: !!(window as any).shogun,
          hasWindowShogunGun: !!(window as any).shogun?.gun,
          hasWindowGun: !!(window as any).gun
        });
        return;
      }

      const user = gunInstance.user();
      
      // Verify authentication
      if (!user.is) {
        setStatus({ message: 'Error: User not authenticated correctly', type: 'error' });
        return;
      }

      const sitesNode = user.get('sites');
      const pageNode = sitesNode.get(sanitizedPageName);

      // Prepara i dati da salvare in base alla modalità
      let dataToSave: any = {
        publishedAt: Date.now(),
        pageName: sanitizedPageName,
        publishMode: publishMode
      };

      if (publishMode === 'relay') {
        // Relay mode: upload to relay and get CID automatically
        const filesToUpload = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []);
        
        console.log('📤 [RELAY] Starting upload to IPFS relay...', {
          relayUrl,
          fileCount: filesToUpload.length,
          isDirectory: isDirectory,
          mainFile: selectedFile?.name,
          hasAuthToken: !!authToken
        });
        setStatus({ message: `Uploading ${filesToUpload.length > 1 ? `${filesToUpload.length} files` : 'file'} to IPFS relay...`, type: 'info' });
        
        const uploadHeaders: Record<string, string> = {};
        if (authToken) {
          uploadHeaders['Authorization'] = `Bearer ${authToken}`;
          console.log('🔐 [RELAY] Auth token presente');
        }

        try {
          const formData = new FormData();
          let uploadEndpoint: string;
          
          // If multiple files or directory, use directory upload endpoint
          if (filesToUpload.length > 1 || isDirectory) {
            uploadEndpoint = `${relayUrl}/api/v1/ipfs/upload-directory`;
            
            // Add all files to FormData maintaining directory structure
            filesToUpload.forEach((file) => {
              // Use webkitRelativePath if available (directory upload), otherwise use name
              const filePath = isDirectory && (file as any).webkitRelativePath 
                ? (file as any).webkitRelativePath 
                : file.name;
              
              // Append file with path as fieldname to maintain structure
              formData.append('files', file, filePath);
            });
            
            console.log('📁 [RELAY] Using directory upload endpoint for', filesToUpload.length, 'files');
          } else {
            // Single file upload
            uploadEndpoint = `${relayUrl}/api/v1/ipfs/upload`;
            formData.append('file', filesToUpload[0]);
            console.log('📄 [RELAY] Using single file upload endpoint');
          }

          console.log('🌐 [RELAY] Invio richiesta a:', uploadEndpoint);
          const uploadResponse = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: uploadHeaders,
            body: formData,
          });

          console.log('📥 [RELAY] Risposta ricevuta:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            ok: uploadResponse.ok
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ [RELAY] Errore upload:', errorText);
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: `Upload fallito: ${uploadResponse.status} - ${errorText}` };
            }
            throw new Error(errorData.error || `Upload fallito: ${uploadResponse.status}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log('✅ [RELAY] Risposta JSON:', uploadResult);

          if (!uploadResult.success) {
            console.error('❌ [RELAY] Upload fallito nella risposta:', uploadResult);
            throw new Error(uploadResult.error || 'Upload fallito');
          }

          // Estrai CID dalla risposta
          // Per directory: directoryCid o cid
          // Per singolo file: file.hash, file.cid, o cid
          const cid = uploadResult.directoryCid || uploadResult.cid || uploadResult.file?.hash || uploadResult.file?.cid || uploadResult.hash;
          console.log('🔍 [RELAY] CID estratto:', cid);
          
          if (!cid) {
            console.error('❌ [RELAY] CID not found in complete response:', uploadResult);
            throw new Error('CID not found in relay response');
          }

          // Save with automatically obtained CID
          dataToSave.ipfsHash = cid;
          dataToSave.fileName = filesToUpload.length > 1 
            ? `${sanitizedPageName} (${filesToUpload.length} files)` 
            : selectedFile!.name;
          dataToSave.isDirectory = isDirectory || filesToUpload.length > 1;
          dataToSave.fileCount = filesToUpload.length;
          if (filesToUpload.length > 1) {
            dataToSave.files = uploadResult.files || filesToUpload.map(f => ({
              name: f.name,
              path: isDirectory && (f as any).webkitRelativePath ? (f as any).webkitRelativePath : f.name,
              size: f.size,
              type: f.type
            }));
          }
          console.log('💾 [RELAY] Data ready for saving to GunDB:', dataToSave);
          // We don't save HTML in GunDB, only the IPFS reference
        } catch (uploadError: any) {
          console.error('❌ [RELAY] Error during upload:', uploadError);
          setStatus({ message: `Relay upload error: ${uploadError.message}`, type: 'error' });
          return;
        }
      } else if (publishMode === 'deals') {
        // Deals mode: save only IPFS CID (entered manually by user)
        console.log('💎 [DEALS] Deals mode, CID entered:', ipfsHash);
        if (!ipfsHash || !ipfsHash.trim()) {
          setStatus({ message: 'Error: Enter a valid IPFS CID', type: 'error' });
          return;
        }
        dataToSave.ipfsHash = ipfsHash.trim();
        dataToSave.fileName = selectedFile ? selectedFile.name : `${sanitizedPageName}.html`;
        console.log('💾 [DEALS] Data ready for saving to GunDB:', dataToSave);
      } else if (publishMode === 'textarea') {
        // Textarea mode: compress content and save hash
        console.log('✨ [TEXTAREA] Textarea mode, compressing content...');
        try {
          const compressedHash = await compress(textareaContent);
          dataToSave.textareaHash = compressedHash;
          dataToSave.fileName = `${sanitizedPageName}.txt`;
          dataToSave.contentLength = textareaContent.length;
          dataToSave.compressedLength = compressedHash.length;
          console.log('💾 [TEXTAREA] Data ready for saving to GunDB:', {
            originalLength: textareaContent.length,
            compressedLength: compressedHash.length,
            compressionRatio: ((1 - compressedHash.length / textareaContent.length) * 100).toFixed(1) + '%'
          });
        } catch (compressError: any) {
          console.error('❌ [TEXTAREA] Compression error:', compressError);
          setStatus({ message: `Compression error: ${compressError.message}`, type: 'error' });
          return;
        }
      } else {
        // GunDB mode: save HTML and all other files
        const filesToSave = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []);
        
        console.log('🗄️ [GUNDB] GunDB mode, reading files...', {
          fileCount: filesToSave.length,
          isDirectory: isDirectory,
          mainFile: selectedFile?.name
        });
        
        // Read main HTML file
        const mainHtmlFile = filesToSave.find(f => f.name.endsWith('.html') || f.name.endsWith('.htm')) || filesToSave[0];
        const fileContent = await mainHtmlFile.text();
        console.log('📄 [GUNDB] Main HTML file read, content size:', fileContent.length, 'characters');
        
        // Encode HTML in base64 to avoid GunDB/SEA parsing issues with URLs in the HTML
        // GunDB tries to parse URLs as keys, causing errors like "Cannot set properties of undefined"
        const htmlBase64 = btoa(unescape(encodeURIComponent(fileContent)));
        dataToSave.html = htmlBase64;
        dataToSave.htmlEncoding = 'base64'; // Flag to indicate HTML is base64 encoded
        dataToSave.fileName = mainHtmlFile.name;
        dataToSave.isDirectory = isDirectory || filesToSave.length > 1;
        dataToSave.fileCount = filesToSave.length;
        
        // If multiple files, save all files as a structure
        if (filesToSave.length > 1) {
          const filesData: any = {};
          for (const file of filesToSave) {
            // Sanitize path to avoid issues with GunDB/SEA parsing
            // Remove any special characters that might cause issues
            let path = isDirectory && (file as any).webkitRelativePath 
              ? (file as any).webkitRelativePath 
              : file.name;
            
            // Ensure path doesn't contain problematic characters for GunDB
            // Replace any URL-like patterns or special characters
            path = path.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._\/-]/g, '_');
            
            // Read file content based on type
            if (file.type.startsWith('text/') || file.name.endsWith('.html') || file.name.endsWith('.htm') || 
                file.name.endsWith('.css') || file.name.endsWith('.js') || file.name.endsWith('.json')) {
              const content = await file.text();
              filesData[path] = {
                content: content,
                type: file.type,
                size: file.size,
                originalPath: isDirectory && (file as any).webkitRelativePath ? (file as any).webkitRelativePath : file.name
              };
            } else {
              // For binary files, convert to base64
              const arrayBuffer = await file.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
              filesData[path] = {
                content: base64,
                type: file.type,
                size: file.size,
                encoding: 'base64',
                originalPath: isDirectory && (file as any).webkitRelativePath ? (file as any).webkitRelativePath : file.name
              };
            }
          }
          dataToSave.files = filesData;
          console.log('💾 [GUNDB] All files structure saved:', Object.keys(filesData));
        }
        
        console.log('💾 [GUNDB] Dati pronti per salvataggio in GunDB:', {
          ...dataToSave,
          html: `[${fileContent.length} caratteri]`,
          filesCount: filesToSave.length > 1 ? Object.keys(dataToSave.files || {}).length : 0
        });
      }

      console.log(`💾 [${publishMode.toUpperCase()}] Salvataggio in GunDB...`, {
        pageName: sanitizedPageName,
        dataToSave: {
          ...dataToSave,
          html: dataToSave.html ? `[${dataToSave.html.length} caratteri]` : undefined
        }
      });

      // Salva i dati in GunDB
      // Wrap in a try-catch to handle any GunDB/SEA parsing errors
      try {
        pageNode.put(dataToSave);
      } catch (error: any) {
        console.error('❌ [GUNDB] Errore durante il salvataggio:', error);
        // Se fallisce, prova a salvare senza la struttura files complessa
        if (dataToSave.files && Object.keys(dataToSave.files).length > 0) {
          console.log('🔄 [GUNDB] Tentativo salvataggio semplificato...');
          const simplifiedData = {
            ...dataToSave,
            files: undefined, // Rimuovi temporaneamente la struttura files
            filesNote: 'Files structure removed due to parsing error'
          };
          try {
            pageNode.put(simplifiedData);
            setStatus({ 
              message: 'App salvata (senza struttura files - potrebbe essere un problema con URL esterni nell\'HTML)', 
              type: 'info' 
            });
            return;
          } catch (retryError: any) {
            console.error('❌ [GUNDB] Errore anche con dati semplificati:', retryError);
            setStatus({ 
              message: `Errore salvataggio GunDB: ${retryError.message}. Prova a pubblicare in modalità Relay invece.`, 
              type: 'error' 
            });
            return;
          }
        } else {
          throw error;
        }
      }
      console.log(`📤 [${publishMode.toUpperCase()}] Dati inviati a GunDB con put()`);

      // Save user mapping immediatamente
      saveUserMapping(actualUsername, actualUserPub);

      // Build success message with IPFS hash if present
      let successMessage = `✅ App published! Visit: /dweb/view/${actualUsername}/${sanitizedPageName}`;
      if (dataToSave.ipfsHash) {
        successMessage += ` | 📦 IPFS Hash: ${dataToSave.ipfsHash}`;
      }
      
      setStatus({ 
        message: successMessage, 
        type: 'success' 
      });
      
      // Reset form immediatamente
      setSelectedFile(null);
      setSelectedFiles([]);
      setIsDirectory(false);
      setPageName('');
      setIpfsHash('');
      
      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
        fileInput.removeAttribute('webkitdirectory');
        fileInput.removeAttribute('multiple');
      }

      // Aggiungi manualmente alla lista IMMEDIATAMENTE (ottimistico)
      console.log('➕ [GUNDB] Aggiunta ottimistica app alla lista');
      setPublishedApps(prevApps => {
        const exists = prevApps.some(app => app.pageName === sanitizedPageName);
        if (!exists) {
          const newApp: PublishedApp = {
            pageName: sanitizedPageName,
            publishedAt: dataToSave.publishedAt || Date.now(),
            fileName: dataToSave.fileName || `${sanitizedPageName}.html`,
            ipfsHash: dataToSave.ipfsHash,
            textareaHash: dataToSave.textareaHash,
            publishMode: dataToSave.publishMode || 'gundb'
          };
          console.log('➕ [GUNDB] App aggiunta ottimisticamente:', newApp);
          return [...prevApps, newApp].sort((a, b) => b.publishedAt - a.publishedAt);
        }
        return prevApps;
      });

      // Verifica che i dati siano stati salvati e aggiorna la lista
      const verifyAndRefresh = () => {
        console.log(`🔍 [${publishMode.toUpperCase()}] Verifica salvataggio...`);
        pageNode.once((savedData: any) => {
          console.log(`📥 [${publishMode.toUpperCase()}] Dati ricevuti da GunDB:`, savedData);
          
          if (savedData && (savedData.html || savedData.ipfsHash || savedData.textareaHash)) {
            console.log(`✅ [${publishMode.toUpperCase()}] Dati confermati salvati correttamente`);
            
            // Aggiorna la lista con i dati reali da GunDB
            setPublishedApps(prevApps => {
              const existingIndex = prevApps.findIndex(app => app.pageName === sanitizedPageName);
              const updatedApp: PublishedApp = {
                pageName: sanitizedPageName,
                publishedAt: savedData.publishedAt || dataToSave.publishedAt || Date.now(),
                fileName: savedData.fileName || dataToSave.fileName || `${sanitizedPageName}.html`,
                ipfsHash: savedData.ipfsHash || dataToSave.ipfsHash,
                textareaHash: savedData.textareaHash || dataToSave.textareaHash,
                publishMode: savedData.publishMode || dataToSave.publishMode || 'gundb'
              };
              
              const updatedApps = [...prevApps];
              if (existingIndex >= 0) {
                updatedApps[existingIndex] = updatedApp;
                console.log(`🔄 [GUNDB] App "${sanitizedPageName}" aggiornata con dati reali`);
              } else {
                updatedApps.push(updatedApp);
                console.log(`➕ [GUNDB] App "${sanitizedPageName}" aggiunta con dati reali`);
              }
              
              return updatedApps.sort((a, b) => b.publishedAt - a.publishedAt);
            });
          } else {
            console.warn(`⚠️ [${publishMode.toUpperCase()}] Dati non ancora disponibili, riprovo tra 500ms...`);
            // Riprova dopo un breve delay
            setTimeout(verifyAndRefresh, 500);
          }
        });
      };

      // Inizia la verifica dopo un breve delay per dare tempo a GunDB di salvare
      setTimeout(() => {
        verifyAndRefresh();
      }, 300);

      // Forza anche un refresh completo della subscription dopo un delay
      setTimeout(() => {
        console.log('🔄 [GUNDB] Refresh completo lista app...');
        loadUserApps();
      }, 1000);

      // Secondo refresh dopo un delay più lungo per assicurarsi che tutto sia sincronizzato
      setTimeout(() => {
        console.log('🔄 [GUNDB] Secondo refresh lista per sincronizzazione finale...');
        loadUserApps();
      }, 2500);

    } catch (error: any) {
      setStatus({ message: 'Error: ' + error.message, type: 'error' });
    }
  };

  const saveUserMapping = (username: string, pub: string) => {
    const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
    if (!gunInstance) return;

    try {
      const globalMapping = gunInstance.get('dweb').get('users').get(username);
      
      globalMapping.get('pub').put(pub);
      setTimeout(() => {
        globalMapping.get('username').put(username);
      }, 50);
      setTimeout(() => {
        globalMapping.get('lastUpdated').put(Date.now());
      }, 100);
    } catch (error) {
      console.error('Error saving mapping:', error);
    }
  };

  const handleDeleteApp = async (appPageName: string) => {
    if (!confirm(`Are you sure you want to delete the app "${appPageName}"? This action cannot be undone.`)) {
      return;
    }

    const actualUserInfo = getActualUserInfo();
    const actualUserPub = actualUserInfo.userPub || userPub;

    if (!actualUserPub) {
      setStatus({ message: 'Error: User not authenticated', type: 'error' });
      return;
    }

    setStatus({ message: 'Deleting...', type: 'info' });

    try {
      const gunInstance = sdk?.gun || (window as any).shogun?.gun || (window as any).gun;
      if (!gunInstance) {
        setStatus({ message: 'Error: GunDB not available', type: 'error' });
        return;
      }

      const user = gunInstance.user();
      if (!user.is) {
        setStatus({ message: 'Error: User not authenticated correctly', type: 'error' });
        return;
      }

      const sitesNode = user.get('sites');
      const pageNode = sitesNode.get(appPageName);

      // Delete the node using put(null)
      pageNode.put(null, (ack: any) => {
        if (ack?.err) {
          setStatus({ message: 'Deletion error: ' + ack.err, type: 'error' });
          return;
        }

        setStatus({ 
          message: `✅ App "${appPageName}" deleted successfully`, 
          type: 'success' 
        });

        // The list will update automatically via GunDB subscription
        setTimeout(() => {
          setStatus(null);
        }, 3000);
      });

    } catch (error: any) {
      setStatus({ message: 'Error: ' + error.message, type: 'error' });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-base-100">
        <header className="border-b border-base-300/50 bg-base-100/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Shogun Logo" className="w-8 h-8" />
                <div>
                  <span className="text-lg font-semibold">DWeb Gateway</span>
                  <p className="text-sm text-base-content/60">
                    Publish your decentralized apps
                  </p>
                </div>
              </div>
              <Link to="/" className="btn btn-ghost btn-sm">
                Home
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Shogun Logo" className="w-16 h-16" />
            </div>
            <h2 className="text-3xl font-semibold mb-3">DWeb</h2>
            <p className="text-base-content/60 mb-8">
              Sign in to publish and manage your decentralized apps
            </p>
            <div className="flex justify-center">
              <ShogunButton />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-base-300/50 bg-base-100/50">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Shogun Logo" className="w-6 h-6 opacity-70" />
                <span className="text-sm text-base-content/60">
                  Powered by <span className="font-semibold text-primary">Shogun</span>
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-base-content/50">
                <a 
                  href="https://shogun.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Documentation
                </a>
                <a 
                  href="https://github.com/shogun-dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  GitHub
                </a>
                <span className="text-base-content/30">•</span>
                <span className="text-xs">© {new Date().getFullYear()} Shogun</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Get actual username for display
  const displayUsername = username || getActualUserInfo().username || 'user';

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-base-300/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Shogun Logo" className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-semibold mb-1">Dweb Gateway</h1>
                <p className="text-base-content/60 text-sm">Publish your decentralized apps</p>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {displayUsername}
            </div>
          </div>
        </div>

        {/* Published Apps */}
        <div className="mb-12">
          <h2 className="text-xl font-medium mb-6 text-base-content/90">Your Published Apps</h2>
          {publishedApps.length === 0 ? (
            <p className="text-base-content/50 text-sm py-8">No apps published yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedApps.map((app) => (
                <div 
                  key={app.pageName} 
                  className="group relative rounded-xl border border-base-300/40 bg-base-100 p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <Link 
                      to={`/dweb/view/${displayUsername}/${app.pageName}`}
                      target="_blank"
                      className="text-primary font-medium hover:underline text-base leading-tight flex-1 pr-2"
                    >
                      {app.pageName}.{displayUsername}.dweb.app
                    </Link>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-error/10 text-error hover:text-error"
                      onClick={() => handleDeleteApp(app.pageName)}
                      title={`Delete ${app.pageName}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-xs text-base-content/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>File: {app.fileName}</span>
                      <span className="text-base-content/30">•</span>
                      <span className="text-base-content/50">{new Date(app.publishedAt).toLocaleDateString()}</span>
                    </div>
                    
                    {app.publishMode && (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                          app.publishMode === 'gundb' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          app.publishMode === 'relay' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          app.publishMode === 'textarea' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {app.publishMode === 'gundb' && '🗄️ GunDB'}
                          {app.publishMode === 'relay' && '🌐 IPFS Relay'}
                          {app.publishMode === 'deals' && '💎 IPFS Deal'}
                          {app.publishMode === 'textarea' && '✨ Textarea'}
                        </span>
                      </div>
                    )}
                    
                    {app.ipfsHash && (app.publishMode === 'relay' || app.publishMode === 'deals') && (
                      <div className="mt-3 pt-3 border-t border-base-300/30">
                        <div className="text-xs font-medium text-base-content/70 mb-1.5">📦 IPFS Hash</div>
                        <div className="text-xs font-mono break-all text-base-content/50 bg-base-200/50 p-2 rounded">
                          {app.ipfsHash}
                        </div>
                        <div className="text-xs text-base-content/40 mt-1.5">
                          Available via IPFS gateway
                        </div>
                      </div>
                    )}
                    
                    {app.textareaHash && app.publishMode === 'textarea' && (
                      <div className="mt-3 pt-3 border-t border-base-300/30">
                        <div className="text-xs font-medium text-base-content/70 mb-1.5">🔗 Direct Link</div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`/dweb/t/${app.textareaHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate max-w-[200px]"
                            title={`/dweb/t/${app.textareaHash}`}
                          >
                            /dweb/t/{app.textareaHash.substring(0, 20)}...
                          </a>
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/dweb/t/${app.textareaHash}`);
                            }}
                            title="Copy direct link"
                          >
                            📋
                          </button>
                        </div>
                        <div className="text-xs text-base-content/40 mt-1.5">
                          Share without GunDB lookup (like textarea.my)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Publish Section */}
      <div className="rounded-xl border border-base-300/40 bg-base-100 p-8">
        <h2 className="text-xl font-medium mb-6 text-base-content/90">📤 Publish a New App</h2>
        
        {/* Mode Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-base-content/70 mb-3">
            Publication mode:
          </label>
          <div className="flex gap-2 flex-wrap mb-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                publishMode === 'gundb' 
                  ? 'bg-primary text-primary-content shadow-sm' 
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
              onClick={() => {
                setPublishMode('gundb');
                setIpfsHash('');
              }}
            >
              1️⃣ GunDB Direct
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                publishMode === 'relay' 
                  ? 'bg-primary text-primary-content shadow-sm' 
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
              onClick={() => {
                setPublishMode('relay');
                setIpfsHash('');
              }}
            >
              2️⃣ IPFS Relay
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                publishMode === 'deals' 
                  ? 'bg-primary text-primary-content shadow-sm' 
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
              onClick={() => {
                setPublishMode('deals');
                setSelectedFile(null);
                setSelectedFiles([]);
                setIsDirectory(false);
              }}
            >
              3️⃣ IPFS Deals
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                publishMode === 'textarea' 
                  ? 'bg-primary text-primary-content shadow-sm' 
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
              onClick={() => {
                setPublishMode('textarea');
                setSelectedFile(null);
                setSelectedFiles([]);
                setIsDirectory(false);
                setIpfsHash('');
              }}
            >
              4️⃣ Textarea
            </button>
          </div>
          <p className="text-xs text-base-content/50 mt-2">
            {publishMode === 'gundb' && 'Save HTML and assets directly to GunDB (supports folders with HTML, CSS, JS)'}
            {publishMode === 'relay' && 'Automatic upload of files/folder to IPFS relay (supports multi-file sites)'}
            {publishMode === 'deals' && 'Paste the IPFS CID obtained from the Deals app'}
            {publishMode === 'textarea' && '✨ Write directly in the editor - content saved as compressed URL (inspired by textarea.my)'}
          </p>
        </div>

        {/* Relay Settings */}
        {publishMode === 'relay' && (
          <div className="mb-6 p-5 rounded-lg bg-base-200/50 border border-base-300/30">
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              Relay URL:
            </label>
            <input
              type="text"
              className="input input-bordered w-full mb-4 bg-base-100"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="https://shogun-relay.scobrudot.dev"
            />
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              Auth Token (optional):
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="password"
                className="input input-bordered flex-1 bg-base-100"
                value={authToken || ''}
                onChange={(e) => {
                  const token = e.target.value;
                  setAuthToken(token);
                  if (token) {
                    localStorage.setItem('dweb_auth_token', token);
                  } else {
                    localStorage.removeItem('dweb_auth_token');
                  }
                }}
                placeholder="Token for protected relay (optional)"
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setAuthToken(null);
                  localStorage.removeItem('dweb_auth_token');
                }}
              >
                Clear
              </button>
            </div>
            <p className="text-xs text-base-content/50">
              💡 The file will be automatically uploaded to the relay when you publish. The IPFS CID will be saved automatically.
            </p>
          </div>
        )}

        {/* Deals Settings */}
        {publishMode === 'deals' && (
          <div className="mb-6 p-5 rounded-lg bg-base-200/50 border border-base-300/30">
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              IPFS CID (Hash):
            </label>
            <input
              type="text"
              className="input input-bordered w-full font-mono bg-base-100 mb-3"
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
              placeholder="QmXxxxxx... or bafyxxxxx..."
            />
            <p className="text-xs text-base-content/50">
              💡 Go to the Deals app to upload the file and create a deal, then paste the received CID here
            </p>
          </div>
        )}
        
        {/* Textarea Editor */}
        {publishMode === 'textarea' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-base-content/70 mb-3">
              ✍️ Write your content:
            </label>
            <TextareaEditor 
              initialContent={textareaContent}
              onChange={setTextareaContent}
              placeholder="Start typing... Your content will be compressed and saved.\n\nTip: Start with # Title to set the page title."
              className="mb-4"
            />
            <p className="text-xs text-base-content/50">
              💡 Content is compressed using deflate and stored as a compact hash. Inspired by <a href="https://github.com/antonmedv/textarea" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">textarea.my</a>
            </p>
          </div>
        )}

        {publishMode !== 'deals' && publishMode !== 'textarea' && (
          <>
            <div 
              className="border-2 border-dashed border-primary/40 rounded-xl p-12 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 mb-4"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <div className="text-5xl mb-4 opacity-60">📄</div>
              <div className="text-base font-medium text-primary mb-1.5">
                Drag your HTML file or folder here or click to select
              </div>
              <div className="text-sm text-base-content/50">Supports single HTML file or folder with HTML, CSS, JS files</div>
            </div>
            
            <div className="flex gap-2 mb-6 justify-center">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.removeAttribute('webkitdirectory');
                    fileInput.removeAttribute('multiple');
                    fileInput.accept = '.html,.htm';
                    fileInput.click();
                  }
                }}
              >
                📄 Select HTML File
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.setAttribute('webkitdirectory', '');
                    fileInput.setAttribute('multiple', '');
                    fileInput.removeAttribute('accept');
                    fileInput.click();
                  }
                }}
              >
                📁 Select Folder
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.removeAttribute('webkitdirectory');
                    fileInput.setAttribute('multiple', '');
                    fileInput.accept = '.html,.htm,.css,.js,.json,.png,.jpg,.jpeg,.gif,.svg,.ico,.webp';
                    fileInput.click();
                  }
                }}
              >
                📎 Select Multiple Files
              </button>
            </div>
          </>
        )}
        
        <input 
          type="file" 
          id="fileInput" 
          accept=".html,.htm" 
          className="hidden"
          onChange={handleFileSelect}
        />

        {(selectedFile || selectedFiles.length > 0 || publishMode === 'deals' || publishMode === 'relay' || (publishMode === 'textarea' && textareaContent)) && (
          <div className="mt-6 p-5 rounded-lg bg-base-200/50 border border-base-300/30">
            {selectedFiles.length > 1 ? (
              <div className="font-medium mb-4 text-base-content/90">
                <div className="mb-2">
                  📁 {isDirectory ? 'Folder' : 'Multiple files'} selected: <span className="text-base-content/50">{selectedFiles.length} files</span>
                </div>
                <div className="text-sm font-normal text-base-content/70 max-h-40 overflow-y-auto">
                  {selectedFiles.slice(0, 10).map((f, i) => (
                    <div key={i} className="font-mono text-xs py-1">
                      {isDirectory && (f as any).webkitRelativePath ? (f as any).webkitRelativePath : f.name}
                      <span className="text-base-content/50 ml-2">({(f.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                  {selectedFiles.length > 10 && (
                    <div className="text-base-content/50 italic">... and {selectedFiles.length - 10} more files</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-base-content/60">
                  Main HTML: <span className="font-mono">{selectedFile?.name}</span>
                </div>
              </div>
            ) : selectedFile && (
              <div className="font-medium mb-4 text-base-content/90">
                File: <span className="font-mono text-sm">{selectedFile.name}</span> <span className="text-base-content/50">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-base-content/70 mb-2">
                Page name (URL):
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-base-100"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="e.g. my-app"
              />
              <p className="text-xs text-base-content/50 mt-2">
                URL: <code className="bg-base-200 px-1.5 py-0.5 rounded text-xs">{pageName || 'name'}.{displayUsername}.dweb.app</code>
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary" onClick={handlePublish}>
                🚀 Publish App
              </button>
              <button className="btn btn-ghost" onClick={() => {
                setSelectedFile(null);
                setSelectedFiles([]);
                setIsDirectory(false);
                setPageName('');
                setIpfsHash('');
                const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                if (fileInput) {
                  fileInput.value = '';
                  fileInput.removeAttribute('webkitdirectory');
                  fileInput.removeAttribute('multiple');
                }
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className={`alert mt-6 ${status.type === 'success' ? 'alert-success' : status.type === 'error' ? 'alert-error' : 'alert-info'}`}>
            <span>{status.message}</span>
          </div>
        )}
      </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-base-300/50 bg-base-100/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Shogun Logo" className="w-6 h-6 opacity-70" />
              <span className="text-sm text-base-content/60">
                Powered by <span className="font-semibold text-primary">Shogun</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-base-content/50">
              <a 
                href="https://shogun.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Documentazione
              </a>
              <a 
                href="https://github.com/shogun-dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <span className="text-base-content/30">•</span>
              <span className="text-xs">© {new Date().getFullYear()} Shogun</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DWebSaaSApp;
