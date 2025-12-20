# DWeb Platform Components

Componenti React per la piattaforma DWeb integrata in Shogun Starter.

## Componenti

### DWebSaaSApp
Interfaccia principale per pubblicare e gestire app decentralizzate.

**Route**: `/dweb`

**Features**:
- Dashboard utente
- Upload e pubblicazione file HTML
- Gestione app pubblicate
- Integrazione con shogun-core per autenticazione

### DWebViewer
Componente per visualizzare app pubblicate dagli utenti.

**Route**: 
- `/dweb/view/:username` (usa 'site' come default)
- `/dweb/view/:username/:pagename`

**Features**:
- Caricamento app da GunDB
- Rendering HTML in iframe isolato
- Gestione errori e loading states

## Uso

I componenti sono già integrati in `App.tsx` con le route configurate. L'autenticazione è gestita automaticamente tramite `ShogunButtonProvider`.

## Struttura Dati GunDB

Le app vengono salvate in:
- `user.get('sites').get(pagename)` - App pubblicata

Il mapping username -> pub key viene salvato in:
- `gun.get('dweb').get('users').get(username)` - Mapping per lookup veloce
