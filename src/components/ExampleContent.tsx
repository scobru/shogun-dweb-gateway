import React from 'react';
import { useShogun } from 'shogun-button-react';
import type { ShogunCore } from 'shogun-core';

/**
 * ExampleContent Component
 * 
 * This is a placeholder component that demonstrates how to use the Shogun SDK
 * after authentication. Replace this with your own application content.
 * 
 * The useShogun hook provides:
 * - isLoggedIn: boolean - whether user is authenticated
 * - userPub: string - user's public key
 * - username: string - user's username/alias
 * - logout: function - logout function
 * - sdk: ShogunCore instance - full SDK access
 */
const ExampleContent: React.FC = () => {
  const { isLoggedIn, userPub, username, sdk } = useShogun();

  if (!isLoggedIn) {
    return (
      <div className="card content-card p-8">
        <div className="card-body">
          <h2 className="text-2xl font-bold mb-4">Welcome to Shogun Starter</h2>
          <p className="text-secondary mb-4">
            Please authenticate using the button above to access the application.
          </p>
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>This is example content. Replace this component with your own application logic.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Example: User Info Card */}
      <div className="card content-card p-8">
        <div className="card-body">
          <h2 className="text-2xl font-bold mb-4">Example: User Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-secondary">Username:</span>
              <p className="font-mono text-lg">{username || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-secondary">Public Key:</span>
              <p className="font-mono text-sm break-all">{userPub}</p>
            </div>
            <div>
              <span className="text-sm text-secondary">SDK Available:</span>
              <p className="font-mono">{sdk ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Example: SDK Usage */}
      <div className="card content-card p-8">
        <div className="card-body">
          <h2 className="text-2xl font-bold mb-4">Example: SDK Access</h2>
          <p className="text-secondary mb-4">
            You can access the Shogun SDK through the <code className="bg-base-300 px-2 py-1 rounded">useShogun</code> hook.
          </p>
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>SDK is ready! You can now use GunDB, authentication, and other Shogun features.</span>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Available SDK Methods:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-secondary">
              <li><code>sdk.gun</code> - GunDB instance for decentralized storage</li>
              <li><code>sdk.auth</code> - Authentication methods</li>
              <li><code>sdk.wallet</code> - Wallet management (if enabled)</li>
              <li><code>sdk.storage</code> - Storage utilities</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Example: Next Steps */}
      <div className="card content-card p-8">
        <div className="card-body">
          <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-secondary">
            <li>Replace this <code className="bg-base-300 px-2 py-1 rounded">ExampleContent</code> component with your own application logic</li>
            <li>Use the <code className="bg-base-300 px-2 py-1 rounded">useShogun</code> hook to access authentication state and SDK</li>
            <li>Build your decentralized application using GunDB and Shogun features</li>
            <li>Customize the theme and styling in <code className="bg-base-300 px-2 py-1 rounded">src/index.css</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ExampleContent;

