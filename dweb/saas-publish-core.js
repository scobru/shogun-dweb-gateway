const Gun = require("gun");
require("gun/sea");
require("gun/lib/then");

const RELAY_URL = "https://shogun-relay.scobrudot.dev/gun";

/**
 * Pubblica un'app per un utente autenticato
 * @param {object} gunUser - Istanza Gun user autenticata
 * @param {string} htmlContent - Contenuto HTML
 * @param {string} username - Username dell'utente
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function publishApp(gunUser, htmlContent, username) {
  return new Promise((resolve, reject) => {
    if (!gunUser || !gunUser.is) {
      reject(new Error("Utente non autenticato"));
      return;
    }

    const gun = gunUser.back(-1); // Ottieni l'istanza Gun
    
    // Salva l'app sotto l'utente
    const appNode = gunUser.get('site');
    
    appNode.put({
      html: htmlContent,
      publishedAt: Date.now(),
      username: username
    }, (ack) => {
      if (ack.err) {
        reject(new Error(ack.err));
        return;
      }

      // Salva anche un mapping globale username -> user pub key per lookup veloce
      const globalMapping = gun.get('dweb').get('users').get(username);
      globalMapping.put({
        pub: gunUser.is.pub,
        username: username,
        lastUpdated: Date.now()
      }, () => {
        // Non aspettiamo questo ACK, è opzionale
      });

      resolve({ success: true });
    });
  });
}

/**
 * Ottieni l'app pubblicata di un utente per username
 * @param {string} username - Username dell'utente
 * @returns {Promise<{html?: string, pub?: string, error?: string}>}
 */
async function getUserApp(username) {
  return new Promise((resolve) => {
    const gun = new Gun({
      peers: [RELAY_URL],
      localStorage: false,
      radisk: false
    });

    // Prima cerca il mapping username -> pub
    const mappingNode = gun.get('dweb').get('users').get(username);
    
    mappingNode.once((mapping) => {
      if (mapping && mapping.pub) {
        // Trovato il mapping, cerca l'app usando la pub key
        const appNode = gun.get('~' + mapping.pub).get('site');
        appNode.once((data) => {
          if (data && data.html) {
            resolve({ html: data.html, pub: mapping.pub });
          } else {
            resolve({ error: 'App non trovata per questo username' });
          }
        });
      } else {
        // Prova metodo alternativo: cerca direttamente l'utente per alias
        const userNode = gun.user(username);
        userNode.get('site').once((data) => {
          if (data && data.html) {
            resolve({ html: data.html });
          } else {
            resolve({ error: 'App non trovata per questo username' });
          }
        });
      }
    });
  });
}

module.exports = {
  publishApp,
  getUserApp
};
