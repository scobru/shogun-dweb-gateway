# Shogun Starter

Un template TypeScript completo per costruire applicazioni decentralizzate con l'ecosistema Shogun. Questo template include autenticazione, integrazione GunDB, piattaforma DWeb e tutti i pacchetti essenziali Shogun pre-configurati.

## Caratteristiche

- **TypeScript** - Supporto completo TypeScript con type checking rigoroso
- **React 18** - React moderno con hooks e componenti funzionali
- **Shogun Authentication** - Metodi di autenticazione multipli (WebAuthn, Web3/MetaMask, Nostr, ZK-Proof)
- **GunDB Integration** - Database peer-to-peer decentralizzato
- **DWeb Platform** - Piattaforma completa per hosting decentralizzato di applicazioni web
- **Shogun Relays** - Scoperta automatica e connessione ai relay
- **Shogun Theme** - Styling consistente con Tailwind CSS v4 e DaisyUI
- **Vite** - Server di sviluppo veloce e build ottimizzate
- **React Router** - Routing client-side per SPA

## Quick Start

### Prerequisiti

- Node.js ≥ 18.0.0
- npm, yarn o pnpm

### Installazione

```bash
# Entra nella directory del progetto
cd shogun-starter

# Installa le dipendenze
yarn install
# oppure
npm install

# Avvia il server di sviluppo
yarn dev
# oppure
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:8080`

### Build per Produzione

```bash
# Build per produzione
yarn build
# oppure
npm run build

# Anteprima build di produzione
yarn preview
# oppure
npm run preview
```

## Struttura del Progetto

```
shogun-starter/
├── src/
│   ├── components/
│   │   ├── dweb/
│   │   │   ├── DWebSaaSApp.tsx      # App principale per pubblicare app decentralizzate
│   │   │   ├── DWebViewer.tsx       # Visualizzatore per app pubblicate
│   │   │   ├── DWebFileServer.tsx   # Server file per risorse statiche
│   │   │   └── README.md            # Documentazione componenti DWeb
│   │   ├── ui/
│   │   │   └── ThemeToggle.tsx      # Componente per cambio tema
│   │   └── ExampleContent.tsx       # Componente di esempio (sostituibile)
│   ├── assets/
│   │   └── logo.svg                 # Logo dell'applicazione
│   ├── App.tsx                      # Componente principale dell'app
│   ├── main.tsx                     # Entry point dell'applicazione
│   ├── polyfills.ts                 # Polyfills Node.js per browser
│   ├── index.css                    # Stili globali e import tema
│   └── vite-env.d.ts                # Tipi TypeScript per Vite
├── public/                          # File statici pubblici
├── dweb/                            # Directory per file DWeb
├── index.html                       # Template HTML
├── vite.config.ts                   # Configurazione Vite
├── tsconfig.json                    # Configurazione TypeScript
├── tailwind.config.js               # Configurazione Tailwind CSS
├── postcss.config.js                # Configurazione PostCSS
├── env.example                      # Esempio file variabili d'ambiente
└── package.json                     # Dipendenze e script
```

## Piattaforma DWeb

Questo starter include una piattaforma completa per hosting decentralizzato di applicazioni web (DWeb). Gli utenti possono:

- **Pubblicare app HTML** - Caricare e pubblicare file HTML come app decentralizzate
- **Gestire app pubblicate** - Visualizzare e gestire tutte le app pubblicate
- **Visualizzare app** - Accedere alle app pubblicate tramite URL dedicati
- **Hosting file statici** - Servire risorse statiche (CSS, JS, immagini) per le app

### Route DWeb

- `/dweb` - Dashboard principale per pubblicare e gestire app
- `/dweb/view/:username` - Visualizza l'app principale di un utente (default: 'site')
- `/dweb/view/:username/:pagename` - Visualizza un'app specifica di un utente
- `/dweb/file/:username/:pagename/*` - Server file per risorse statiche

### Come Funziona

1. **Autenticazione**: Gli utenti si autenticano tramite Shogun (WebAuthn, Web3, Nostr, o ZK-Proof)
2. **Pubblicazione**: Gli utenti caricano file HTML che vengono salvati su GunDB
3. **Mapping**: Il mapping username → public key viene salvato per lookup veloce
4. **Visualizzazione**: Le app vengono caricate da GunDB e renderizzate in iframe isolati
5. **Storage**: I dati sono salvati in modo decentralizzato su GunDB:
   - `user.get('sites').get(pagename)` - App pubblicata
   - `gun.get('dweb').get('users').get(username)` - Mapping username → pub key

## Utilizzo

### Autenticazione

L'autenticazione è gestita automaticamente tramite `ShogunButtonProvider`. Il componente `ShogunButton` è disponibile in tutti i componenti figli:

```tsx
import { useShogun, ShogunButton } from 'shogun-button-react';

const MyComponent = () => {
  const { isLoggedIn, userPub, username, sdk, logout } = useShogun();
  
  if (!isLoggedIn) {
    return <ShogunButton />;
  }
  
  return <div>Benvenuto, {username}!</div>;
};
```

### Utilizzo del Shogun SDK

Accedi al Shogun SDK tramite l'hook `useShogun`:

```tsx
import { useShogun } from 'shogun-button-react';

const MyComponent = () => {
  const { isLoggedIn, userPub, username, sdk, logout } = useShogun();
  
  // Accedi a GunDB
  if (sdk?.gun) {
    const user = sdk.gun.user();
    const sites = user.get('sites');
    
    // Salva dati
    sites.get('myapp').put({
      name: 'My App',
      content: '<html>...</html>',
      publishedAt: Date.now()
    });
    
    // Leggi dati
    sites.get('myapp').once((data) => {
      console.log('App data:', data);
    });
  }
  
  // Accedi ai metodi di autenticazione
  if (sdk?.auth) {
    // Usa i metodi auth...
  }
  
  return <div>...</div>;
};
```

### Configurazione Shogun

Modifica `src/App.tsx` per personalizzare l'inizializzazione di Shogun:

```tsx
const { core: shogunCore } = await shogunConnector({
  appName: "Il Nome della Tua App",
  gunInstance: gun,
  // Metodi di autenticazione
  web3: { enabled: true },
  webauthn: { 
    enabled: true, 
    rpName: "Il Nome della Tua App" 
  },
  nostr: { enabled: true },
  zkproof: { enabled: true },
  // Opzioni UI
  showWebauthn: true,
  showMetamask: true,
  showNostr: true,
  showZkProof: true,
  // Funzionalità avanzate
  enableGunDebug: true,
  enableConnectionMonitoring: true,
  defaultPageSize: 20,
  connectionTimeout: 10000,
  debounceInterval: 100,
});
```

### Configurazione Relay

I relay vengono caricati automaticamente tramite `shogun-relays`. Il sistema:

1. Carica automaticamente la lista dei relay disponibili
2. Usa i relay per connettere GunDB
3. Fallback a relay di default se la lista è vuota

Puoi accedere ai relay tramite `window.ShogunRelays`:

```tsx
// Forza aggiornamento lista relay
const relays = await window.ShogunRelays.forceListUpdate();
console.log('Relay disponibili:', relays);
```

### Variabili d'Ambiente

Crea un file `.env` basato su `env.example`:

```bash
VITE_GUN_TOKEN=""
VITE_APP_TOKEN=""
VITE_GOOGLE_CLIENT_ID=""
VITE_GOOGLE_CLIENT_SECRET=""
VITE_GOOGLE_REDIRECT_URI=""
```

### Styling

Il progetto usa Tailwind CSS v4 con DaisyUI. Personalizza il tema in:

- `src/index.css` - Stili globali e classi personalizzate
- `tailwind.config.js` - Configurazione Tailwind e temi DaisyUI

I temi disponibili sono `dark` e `light`, con toggle tramite `ThemeToggle`.

### Sostituire il Contenuto di Esempio

Il componente `ExampleContent` in `src/components/ExampleContent.tsx` è un placeholder. Sostituiscilo con la logica della tua applicazione o usa direttamente i componenti DWeb.

## Script Disponibili

- `yarn dev` / `npm run dev` - Avvia il server di sviluppo (porta 8080)
- `yarn build` / `npm run build` - Build per produzione
- `yarn preview` / `npm run preview` - Anteprima build di produzione
- `yarn serve` / `npm run serve` - Serve build di produzione (porta 8080)
- `yarn lint` / `npm run lint` - Esegue ESLint

## Pacchetti Integrati

Questo starter include:

- **shogun-core** (^6.4.4) - SDK core per autenticazione e gestione dati
- **shogun-button-react** (^6.4.4) - Componenti React per autenticazione
- **shogun-relays** (^1.1.0) - Scoperta e gestione relay
- **shogun-relay-sdk** (^1.2.7) - SDK per interazione con relay
- **gun** (^0.2020.1241) - Database decentralizzato
- **gun-avatar** (^2.2.4) - Avatar per GunDB
- **react** (^18.2.0) + **react-router-dom** (^7.6.2) - Framework UI
- **tailwindcss** (^4.1.10) + **daisyui** (^5.0.43) - Styling
- **vite** (^5.0.0) - Build tool e dev server

## TypeScript

Il progetto usa TypeScript con type checking rigoroso. Tutti i componenti e le utility sono completamente tipizzati. Il `tsconfig.json` è configurato per sviluppo React moderno con:

- Target ES2020
- Module resolution bundler
- Strict mode abilitato
- Path aliases (`@/*` per `./src/*`)

## Debug

In modalità sviluppo, sono disponibili metodi di debug su `window`:

```tsx
// Accedi al core Shogun
window.shogun

// Accedi all'istanza Gun
window.gun

// Metodi di debug
window.shogunDebug = {
  clearAllData: () => void,  // Pulisce tutti i dati salvati
  sdk: ShogunCore,           // Istanza SDK
  gun: Gun,                  // Istanza GunDB
  relays: string[]           // Lista relay attivi
}
```

## Browser Support

- Chrome ≥ 60
- Firefox ≥ 60
- Safari ≥ 12
- Edge ≥ 79

**Nota**: WebAuthn richiede HTTPS in produzione (funziona su localhost in sviluppo).

## Ringraziamenti

Un ringraziamento speciale a:

- **[textarea.my](https://textarea.my)** ([@antonmedv](https://github.com/antonmedv)) - La tecnologia di compressione URL che consente di salvare intere pagine come hash compressi. Il nostro "Textarea Mode" è ispirato da questo brillante progetto minimalista.

## Licenza

MIT

## Risorse

- [Shogun Documentation](https://shogun-eco.xyz)
- [Shogun Core](https://github.com/scobru/shogun-core)
- [GunDB Documentation](https://gun.eco)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [DaisyUI Documentation](https://daisyui.com)

## Contribuire

Le issue e le pull request sono benvenute! Per cambiamenti importanti, apri prima una issue per discutere cosa vorresti cambiare.

---

Costruito con ❤️ dalla community Shogun
