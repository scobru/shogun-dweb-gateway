const fs = require("fs");
const Gun = require("gun");
require("gun/sea");
require("gun/lib/then");

const RELAY_URL = "https://shogun-relay.scobrudot.dev/gun";
const KEYS_FILE = "keys.json";

/**
 * Carica o genera le chiavi crittografiche
 */
async function loadOrGenerateKeys() {
  let pair;

  if (fs.existsSync(KEYS_FILE)) {
    try {
      const savedKeys = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
      pair = savedKeys;
      console.log("✓ Chiavi recuperate da", KEYS_FILE);
    } catch (err) {
      console.log("⚠ Errore nel leggere", KEYS_FILE + ", genero nuove chiavi...");
      pair = await Gun.SEA.pair();
      fs.writeFileSync(KEYS_FILE, JSON.stringify(pair, null, 2));
      console.log("✓ Nuove chiavi salvate in", KEYS_FILE);
    }
  } else {
    pair = await Gun.SEA.pair();
    fs.writeFileSync(KEYS_FILE, JSON.stringify(pair, null, 2));
    console.log("✓ Nuove chiavi generate e salvate in", KEYS_FILE);
  }

  return pair;
}

/**
 * Pubblica HTML su GunDB
 * @param {string} htmlContent - Il contenuto HTML da pubblicare
 * @param {string} appName - Il nome dell'app (default: "test-site")
 * @returns {Promise<{pubKey: string}>}
 */
async function publish(htmlContent, appName = "test-site") {
  console.log("Generazione/Recupero chiavi crittografiche (SEA)...");

  const pair = await loadOrGenerateKeys();

  console.log("\n!!! IMPORTANTE: SALVA QUESTE CHIAVI IN UN POSTO SICURO !!!");
  console.log("Se le perdi, non potrai più aggiornare il sito.");
  console.log("Chiavi salvate in:", KEYS_FILE);
  console.log("-------------------------------------------------------");
  console.log("LA TUA PUB KEY:", pair.pub);
  console.log("-------------------------------------------------------\n");

  const gun = new Gun({
    peers: [RELAY_URL],
    localStorage: false,
    radisk: false,
  });

  const user = gun.user();

  return new Promise((resolve, reject) => {
    user.auth(pair, async (ack) => {
      if (ack.err) {
        reject(new Error("ERRORE durante autenticazione: " + ack.err));
        return;
      }

      if (!user.is) {
        reject(new Error("ERRORE: utente non autenticato correttamente"));
        return;
      }

      const userPub = user.is.pub || pair.pub;
      console.log("✓ Autenticato! User pub:", userPub);

      if (userPub !== pair.pub) {
        console.warn("⚠ ATTENZIONE: La pub key dell'utente non corrisponde alla pair.pub!");
      }

      console.log("Pubblicazione in corso...");

      user.get(appName).put({ html: htmlContent }, (putAck) => {
        if (putAck.err) {
          reject(new Error("ERRORE durante pubblicazione: " + putAck.err));
          return;
        }

        console.log("✓ SUCCESS! Dati pubblicati.");

        // Verifica che i dati siano accessibili
        const testNode = gun.get("~" + userPub).get(appName);
        testNode.once((data) => {
          if (data && data.html) {
            console.log("✓ Dati verificati! Lunghezza HTML:", data.html.length, "caratteri");
          }
        });

        // Aspetta un po' per la propagazione
        setTimeout(() => {
          resolve({ pubKey: userPub });
          gun._.opt.peers = {}; // Disconnetti
        }, 2000);
      });
    });
  });
}

/**
 * Ottieni la pub key corrente (senza pubblicare)
 */
async function getPubKey() {
  if (fs.existsSync(KEYS_FILE)) {
    try {
      const savedKeys = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
      return savedKeys.pub;
    } catch (err) {
      return null;
    }
  }
  return null;
}

module.exports = {
  publish,
  getPubKey,
  loadOrGenerateKeys
};
