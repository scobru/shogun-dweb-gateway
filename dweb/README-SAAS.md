# 🌐 DWeb Platform - SaaS

Piattaforma SaaS completa per pubblicare app decentralizzate su GunDB. Ogni utente può registrarsi, pubblicare la propria app HTML e renderla accessibile tramite URL personalizzato.

## 🚀 Quick Start

### 1. Installa dipendenze
```bash
npm install
```

### 2. Avvia il server
```bash
npm start
```

### 3. Accedi alla piattaforma
Apri nel browser: `http://localhost:3000/`

## ✨ Caratteristiche

### Per gli Utenti

1. **Registrazione/Login**
   - Registrazione con username e password
   - Login con credenziali
   - Sessioni persistenti

2. **Pubblicazione App**
   - Upload file HTML tramite drag & drop
   - Pubblicazione istantanea su GunDB
   - URL personalizzato: `tuousername.dweb.app` o `/view/tuousername`

3. **Dashboard**
   - Visualizza le tue app pubblicate
   - Link diretto alle app
   - Informazioni sulla data di pubblicazione

### Architettura

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─> / (saas-app.html) - Login/Dashboard
       ├─> /view/username (viewer.html) - Visualizza app
       └─> /admin (admin.html) - Interfaccia legacy
```

### Come Funziona

1. **Registrazione:**
   - L'utente crea un account con username/password
   - GunDB genera automaticamente le chiavi crittografiche
   - Le credenziali sono gestite da GunDB/SEA

2. **Pubblicazione:**
   - L'utente uploada un file HTML
   - Il contenuto viene salvato in: `user.get('site').put({ html: ... })`
   - Viene creato un mapping globale: `dweb.users[username] -> pub key`
   - Questo permette lookup veloce per username

3. **Visualizzazione:**
   - Il viewer cerca il mapping username -> pub key
   - Carica l'app dall'utente usando la pub key
   - Renderizza l'HTML pubblicato

## 🔧 Configurazione Domini Personalizzati

Per abilitare domini personalizzati (es. `username.dweb.app`):

### Opzione 1: Subdomain Routing (Nginx/Caddy)

```nginx
# Nginx config
server {
    server_name *.dweb.app;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Opzione 2: DNS Wildcard

1. Configura un record DNS wildcard: `*.dweb.app` → IP del server
2. Il server deve leggere il subdomain dall'header `Host`
3. Route automaticamente a `/view/subdomain`

### Implementazione Server per Subdomain

```javascript
// Esempio nel server.js
const host = req.headers.host;
const subdomain = host.split('.')[0];

if (subdomain && subdomain !== 'www' && subdomain !== 'dweb') {
  // Redirect a /view/subdomain
  res.writeHead(302, { Location: `/view/${subdomain}` });
  res.end();
}
```

## 📁 Struttura File

```
dweb/
├── saas-app.html         # App principale (login/dashboard)
├── viewer.html           # Viewer per visualizzare app pubblicate
├── saas-publish-core.js  # Logica di pubblicazione SaaS
├── server.js             # Server HTTP con routing
├── admin.html            # Interfaccia legacy (opzionale)
└── README-SAAS.md        # Questo file
```

## 🔐 Sicurezza

- **Autenticazione:** GunDB/SEA gestisce username/password in modo sicuro
- **Firma Crittografica:** Ogni app è firmata con le chiavi dell'utente
- **Accesso:** Solo l'utente proprietario può aggiornare la propria app
- **Pubblico:** Le app pubblicate sono accessibili a tutti (come un sito web)

## 🚀 Deployment

### Variabili d'Ambiente

```bash
RELAY_URL=https://shogun-relay.scobrudot.dev/gun
PLATFORM_DOMAIN=dweb.app
PORT=3000
```

### Docker (esempio)

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🔄 Migrazione da Sistema Legacy

Se hai già un `keys.json` dal sistema legacy:

1. Il sistema SaaS crea nuove credenziali per ogni utente
2. Le app pubblicate con il sistema legacy non sono compatibili
3. Pubblica nuovamente le app usando il nuovo sistema

## 📝 API (per uso avanzato)

### Pubblica App (tramite GunDB)

```javascript
const gun = new Gun({ peers: [RELAY_URL] });
const user = gun.user();

user.auth('username', 'password', () => {
  user.get('site').put({
    html: '<html>...</html>',
    publishedAt: Date.now()
  });
});
```

### Leggi App

```javascript
const mapping = await gun.get('dweb').get('users').get('username').once();
const app = await gun.get('~' + mapping.pub).get('site').once();
console.log(app.html);
```

## 🐛 Troubleshooting

**Problema:** App non trovata dopo pubblicazione
- **Soluzione:** Attendi alcuni secondi per la propagazione GunDB
- **Verifica:** Controlla la console del browser per errori

**Problema:** Login non funziona
- **Soluzione:** Assicurati che il relay GunDB sia raggiungibile
- **Verifica:** Controlla la console per errori di connessione

**Problema:** Mapping username non trovato
- **Soluzione:** Pubblica nuovamente l'app (ricrea il mapping)
- **Alternativa:** Il viewer prova anche lookup diretto per alias

## 📚 Prossimi Sviluppi

- [ ] Integrazione shogun-core per autenticazione avanzata
- [ ] Supporto per domini completamente personalizzati
- [ ] Sistema di pagamento/abbonamenti
- [ ] Dashboard analytics per app
- [ ] Supporto multi-app per utente
- [ ] Template e marketplace
- [ ] CDN caching per performance

---

**Happy Decentralized Publishing! 🌐✨**
