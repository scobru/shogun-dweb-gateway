# 🌐 DWeb Platform

Sistema SaaS per pubblicare siti web decentralizzati su GunDB.

**Nota**: Questo progetto è ora integrato in `shogun-starter copy`. 

## 🚀 Quick Start

### Avvia il server DWeb

```bash
cd dweb
npm install
npm start
```

### URL

- **Piattaforma SaaS**: http://localhost:3000/dweb
- **Admin (legacy)**: http://localhost:3000/dweb/admin
- **Viewer**: http://localhost:3000/dweb/view/username/pagename

## 📁 Struttura

I file sono organizzati nella cartella `dweb/`:

- `saas-app.html` - Interfaccia SaaS principale (login/dashboard)
- `viewer.html` - Viewer per visualizzare app pubblicate
- `admin.html` - Interfaccia admin legacy
- `server.js` - Server HTTP per servire le pagine
- `admin-publish-core.js` - Logica core di pubblicazione
- `saas-publish-core.js` - Logica SaaS di pubblicazione

## 🔗 Integrazione con Shogun Starter

Questo modulo è integrato in shogun-starter copy e può essere usato insieme all'app React principale. I path sono prefissati con `/dweb/` per evitare conflitti.
