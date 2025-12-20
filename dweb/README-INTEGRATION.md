# 🔗 Integrazione DWeb in Shogun Starter

Il progetto DWeb è stato integrato in `shogun-starter copy` nella cartella `dweb/`.

## 📁 Struttura

```
shogun-starter copy/
├── dweb/                    # Modulo DWeb
│   ├── saas-app.html       # Interfaccia SaaS principale
│   ├── viewer.html         # Viewer per visualizzare app
│   ├── admin.html          # Admin legacy
│   ├── index.html          # Viewer legacy
│   ├── server.js           # Server HTTP standalone
│   ├── admin-publish-core.js
│   ├── saas-publish-core.js
│   ├── package.json
│   └── ...
├── src/                    # App React principale
├── index.html              # Entry point React
└── ...
```

## 🚀 Uso

### Opzione 1: Server Standalone DWeb

Avvia solo il server DWeb:

```bash
cd dweb
npm install
npm start
```

Accesso:
- http://localhost:3000/dweb - Piattaforma SaaS
- http://localhost:3000/dweb/view/username/pagename - Viewer

### Opzione 2: Integrazione con Vite Dev Server

Per integrare con il dev server Vite, devi configurare un proxy o aggiungere route nel server di sviluppo.

## 🔗 URL Structure

Tutti gli URL DWeb sono prefissati con `/dweb/`:

- `/dweb` - Dashboard SaaS
- `/dweb/admin` - Admin legacy
- `/dweb/view/username/pagename` - Viewer app
- `/dweb/api/publish` - API pubblicazione
- `/dweb/api/pubkey` - API pub key

## 📝 Note

- Le chiavi crittografiche vengono salvate in `dweb/keys.json` (non committare!)
- Il server è standalone e può essere eseguito indipendentemente dall'app React
- I path sono prefissati con `/dweb/` per evitare conflitti con le route React
