# GunDB: Problema localStorage e Propagazione Relay

## Il Problema

Quando `localStorage: true` è abilitato in `admin-publish.js`:
- GunDB scrive i dati **solo localmente** nel browser/Node.js
- GunDB **non propaga** automaticamente al relay
- Il relay non riceve i dati perché Gun pensa siano già "salvati"

## Perché Succede?

GunDB ha un sistema di caching intelligente:
1. **Con localStorage**: Gun salva localmente e può pensare che i dati siano già sincronizzati
2. **Senza localStorage**: Gun **deve** comunicare con i peer (relay) per salvare i dati
3. Il problema: Gun può preferire il cache locale invece di propagare al relay

## Soluzione Implementata

### admin-publish.js
```javascript
// localStorage: false - FORZA propagazione al relay
const gun = Gun({ peers: [...], localStorage: false, radisk: false });
```

### index.html
```javascript
// localStorage: true - OK per lettura/cache locale
const gun = Gun({ peers: [...], localStorage: true, radisk: true });
```

## Spiegazione

- **admin-publish.js** (scrittura): `localStorage: false` → **FORZA** invio al relay
- **index.html** (lettura): `localStorage: true` → **OK** per cache locale e lettura

## Alternative (se vuoi mantenere localStorage in admin-publish)

Se per qualche motivo vuoi mantenere localStorage in admin-publish, puoi:

1. **Pulire il cache prima di scrivere**:
```javascript
// Pulisci il cache locale prima di scrivere
gun.get('~' + pair.pub).get('lido-site').put(null);
// Poi scrivi
gun.get('~' + pair.pub).get('lido-site').put({ html: myHtml });
```

2. **Usare due istanze Gun separate**:
```javascript
// Istanza per pubblicazione (senza localStorage)
const gunPublish = Gun({ peers: [...], localStorage: false });
// Istanza per lettura (con localStorage)
const gunRead = Gun({ peers: [...], localStorage: true });
```

3. **Forzare sync manuale** (non sempre funziona):
```javascript
// Non esiste gun.sync(), ma puoi forzare la connessione
gun._.opt.peers.forEach(peer => {
    if (peer.wire) peer.wire.send({ put: {...} });
});
```

## Best Practice

✅ **Scrittura (admin-publish)**: `localStorage: false` → Forza propagazione  
✅ **Lettura (index.html)**: `localStorage: true` → Cache locale OK

