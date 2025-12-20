// Script legacy - ora usa publish.js per una versione più user-friendly
const { publish } = require("./admin-publish-core");

const myHtml =
  "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><title>LIDO Secure</title><body><h1>Hello Decentralized World!</h1></body></html>";

const APP_NAME = "test-site";

(async () => {
  try {
    const result = await publish(myHtml, APP_NAME);
    console.log(`\n✅ SUCCESS! Sito pubblicato con successo.`);
    console.log(`\n🔑 La tua Pub Key è: ${result.pubKey}`);
    console.log(`\n🌐 Il tuo sito è disponibile su GunDB.`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Errore:`, error.message);
    process.exit(1);
  }
})();
