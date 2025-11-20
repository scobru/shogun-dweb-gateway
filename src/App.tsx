import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  ShogunButtonProvider,
  ShogunButton,
  useShogun,
} from "shogun-button-react";
import { shogunConnector } from "shogun-button-react";
import type { ShogunCore } from "shogun-core";
import Gun from "gun";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import ExampleContent from "./components/ExampleContent";
import logo from "/logo.svg";

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
    sitesData?: any[];
    sites?: string[];
    ringName?: string;
    ringID?: string;
    useIndex?: boolean;
    indexPage?: string;
    useRandom?: boolean;
  }
}

interface MainAppProps {
  shogun?: ShogunCore;
  location?: ReturnType<typeof useLocation>;
}

// Main component that uses the auth context
const MainApp: React.FC<MainAppProps> = () => {
  const { isLoggedIn } = useShogun();

  return (
    <div className="app-shell">
      <header className="navbar-custom">
        <div className="navbar-inner">
          <div className="navbar-title">
            <img src={logo} alt="Shogun Starter" className="w-12 h-12" />
            <div>
              <span className="font-semibold">Shogun Starter</span>
              <p className="navbar-subtitle">
                Decentralized application template
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="app-main">
        <div className="flex justify-center mb-6">
          <div className={`badge-custom ${isLoggedIn ? "success" : "error"}`}>
            <span className="badge-dot" />
            <span>{isLoggedIn ? "Authenticated" : "Not authenticated"}</span>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="card content-card mb-6 p-8">
          <div className="card-body">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Authentication</h2>
              <p className="text-secondary">
                Connect with your preferred method and start building.
              </p>
            </div>
            <div className="flex justify-center">
              <ShogunButton />
            </div>
          </div>
        </div>

        {/* Example Content - Replace this with your app content */}
        <ExampleContent />
      </main>

      {/* Onion widget anchor */}
      <div id="shogun-ring"></div>
    </div>
  );
};

// Wrapper for MainApp that provides access to useLocation
const MainAppWithLocation: React.FC<{ shogun: ShogunCore }> = () => {
  return <MainApp />;
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
          <Route
            path="/"
            element={<MainAppWithLocation shogun={shogun} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
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
      try {
        setIsLoadingRelays(true);
        const fetchedRelays = await window.ShogunRelays.forceListUpdate();

        console.log("Fetched relays:", fetchedRelays);

        // Use fetched relays, or fallback to default if empty
        const peersToUse =
          fetchedRelays && fetchedRelays.length > 0
            ? fetchedRelays
            : ["https://peer.wallie.io/gun"];

        setRelays(peersToUse);
      } catch (error) {
        console.error("Error fetching relays:", error);
        // Fallback to default peer
        setRelays(["https://peer.wallie.io/gun"]);
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

  // Mount Shogun Onion widget (Onion ring) once, after main app is ready
  useEffect(() => {
    // Wait until SDK is initialized so the main layout (and #shogun-ring) is rendered
    if (!sdk) return;

    (async () => {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return;
      }

      try {
        // Ensure Onion CSS from CDN is present
        const ensureOnionCss = () => {
          const existing = document.getElementById("shogun-onion-css");
          if (existing) return;
          const link = document.createElement("link");
          link.id = "shogun-onion-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/shogun-onion@0.1.16/onion.css";
          document.head.appendChild(link);
        };

        ensureOnionCss();

        // Import only sitesData to avoid touching package entry that references CSS assets
        const { default: sitesData } = await import("shogun-onion/sitesData.js");

        // Expose globals expected by the onion widget script
        window.sitesData = sitesData;
        window.sites = sitesData.map((s: any) => s.url);
        window.ringName = "Shogun Network";
        window.ringID = "shogun-ring";
        window.useIndex = true;
        window.indexPage = "#";
        window.useRandom = true;

        // Ensure anchor exists; if not, create a fallback at the end of body
        if (!document.getElementById("shogun-ring")) {
          const anchor = document.createElement("div");
          anchor.id = "shogun-ring";
          document.body.appendChild(anchor);
        }

        // Inject the widget script if not already added
        await new Promise<void>((resolve, reject) => {
          if (
            document.querySelector(
              'script[data-shogun-onion-widget="true"]'
            )
          ) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src =
            "https://unpkg.com/shogun-onion@0.1.16/ring/onionring-widget.js";
          script.async = true;
          script.setAttribute("data-shogun-onion-widget", "true");
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
          document.body.appendChild(script);
        });
      } catch (e) {
        console.error("Failed to mount Shogun Onion widget:", e);
      }
    })();
  }, [sdk]);

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

