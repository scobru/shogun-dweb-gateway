import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  ShogunButtonProvider,
} from "shogun-button-react";
import { shogunConnector } from "shogun-button-react";
import type { ShogunCore } from "shogun-core";
import Gun from "gun";
import "gun/sea";
import DWebSaaSApp from "./components/dweb/DWebSaaSApp";
import DWebViewer from "./components/dweb/DWebViewer";
import DWebFileServer from "./components/dweb/DWebFileServer";
import DWebTextareaViewer from "./components/dweb/DWebTextareaViewer";

import "./index.css";
import "shogun-relays";

// Extend window interface for ShogunRelays
declare global {
  interface Window {
    ShogunRelays: {
      forceListUpdate: () => Promise<string[]>;
    };
    shogunDebug?: {
      clearAllData: () => void;
      sdk: ShogunCore;
      gun: any;
      relays: string[];
    };
    gun?: any;
    shogun?: ShogunCore;
  }
}


// Home redirects to DWeb app
const Home: React.FC = () => {
  return <Navigate to="/dweb" replace />;
};

interface ShogunAppProps {
  shogun: ShogunCore;
}

function ShogunApp({ shogun }: ShogunAppProps) {

  const providerOptions = {
    appName: "Shogun Starter App",
    theme: "dark",
    showWebauthn: true,
    showMetamask: true,
    showNostr: true,
    showZkProof: true,
    enableGunDebug: true,
    enableConnectionMonitoring: true,
  };

  const handleLoginSuccess = (result: any) => {
    console.log("Login success:", result);
  };

  const handleError = (error: string | Error) => {
    console.error("Auth error:", error);
  };

  return (
    <Router>
      <ShogunButtonProvider
        core={shogun}
        options={providerOptions}
        onLoginSuccess={handleLoginSuccess}
        onSignupSuccess={handleLoginSuccess}
        onError={handleError}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dweb" element={<DWebSaaSApp />} />
          <Route path="/dweb/view/:username" element={<DWebViewer />} />
          <Route path="/dweb/view/:username/:pagename" element={<DWebViewer />} />
          <Route path="/dweb/file/:username/:pagename/*" element={<DWebFileServer />} />
          <Route path="/dweb/t/:hash" element={<DWebTextareaViewer />} />
          <Route path="*" element={<Navigate to="/dweb" replace />} />
        </Routes>
      </ShogunButtonProvider>
    </Router>
  );
}

function App() {
  const [sdk, setSdk] = useState<ShogunCore | null>(null);
  const [relays, setRelays] = useState<string[]>([]);
  const [isLoadingRelays, setIsLoadingRelays] = useState(true);

  // First effect: fetch relays asynchronously
  useEffect(() => {
    async function fetchRelays() {
      // ⚡ Bolt Optimization: Use cached relays to start immediately (stale-while-revalidate)
      let usedCache = false;
      const CACHE_KEY = "shogun_relays_cache";

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRelays(parsed);
            setIsLoadingRelays(false); // Unblock app immediately
            usedCache = true;
            console.log("⚡ Bolt: Used cached relays for fast startup");
          }
        }
      } catch (e) {
        console.warn("Error reading relay cache", e);
      }

      try {
        if (!usedCache) setIsLoadingRelays(true);

        const fetchedRelays = await window.ShogunRelays.forceListUpdate();

        console.log("Fetched relays:", fetchedRelays);

        // Use fetched relays, or fallback to default if empty
        const peersToUse =
          fetchedRelays && fetchedRelays.length > 0
            ? fetchedRelays
            : ["https://shogun-relay.scobrudot.dev/gun"];

        // Update cache for next time
        localStorage.setItem(CACHE_KEY, JSON.stringify(peersToUse));

        // Only update state if we didn't use cache (to avoid re-init)
        // or if we want to ensure eventual consistency
        if (!usedCache) {
          setRelays(peersToUse);
        } else {
          // If we used cache, we rely on background update for next session
          // to avoid disrupting the current session with a re-init
          console.log(
            "⚡ Bolt: Relays updated in background for next session"
          );
        }
      } catch (error) {
        console.error("Error fetching relays:", error);
        // Fallback to default peer only if we didn't use cache
        if (!usedCache) {
          setRelays(["https://shogun-relay.scobrudot.dev/gun"]);
        }
      } finally {
        setIsLoadingRelays(false);
      }
    }

    fetchRelays();
  }, []);

  // Second effect: initialize ShogunCore only after relays are loaded
  useEffect(() => {
    if (isLoadingRelays || relays.length === 0) {
      return; // Wait for relays to be loaded
    }

    console.log("relays", relays);

    // Use shogunConnector to initialize ShogunCore
    const initShogun = async () => {
      const gun = Gun({
        peers: relays,
        localStorage: false,
        radisk: false,
      });

      const { core: shogunCore } = await shogunConnector({
        appName: "Shogun Starter App",
        // Pass explicit Gun instance
        gunInstance: gun,
        // Authentication method configurations
        web3: { enabled: true },
        webauthn: {
          enabled: true,
          rpName: "Shogun Starter App",
        },
        nostr: { enabled: true },
        zkproof: { enabled: true },
        // UI feature toggles
        showWebauthn: true,
        showNostr: true,
        showMetamask: true,
        showZkProof: true,
        // Advanced features
        enableGunDebug: true,
        enableConnectionMonitoring: true,
        defaultPageSize: 20,
        connectionTimeout: 10000,
        debounceInterval: 100,
      });

      // Add debug methods to window for testing
      if (typeof window !== "undefined") {
        // Wait a bit for Gun to initialize
        setTimeout(() => {
          console.log("ShogunCore after initialization:", shogunCore);
          const gunInstance = shogunCore.gun;
          console.log("Gun instance found:", gunInstance);

          window.shogunDebug = {
            clearAllData: () => {
              if (shogunCore.storage) {
                shogunCore.storage.clearAll();
              }
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.removeItem("gunSessionData");
              }
            },
            sdk: shogunCore,
            gun: gunInstance,
            relays: relays,
          };

          window.gun = gunInstance;
          window.shogun = shogunCore;
          console.log("Debug methods available at window.shogunDebug");
          console.log("Available debug methods:", Object.keys(window.shogunDebug));
          console.log("Initialized with relays:", relays);
        }, 1000);
      }

      setSdk(shogunCore);
    };

    initShogun();
  }, [relays, isLoadingRelays]);


  if (isLoadingRelays || !sdk) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <span className="loading loading-lg"></span>
        <p className="text-secondary">
          {isLoadingRelays ? "Loading relays..." : "Initializing Shogun..."}
        </p>
      </div>
    );
  }

  return <ShogunApp shogun={sdk} />;
}

export default App;

