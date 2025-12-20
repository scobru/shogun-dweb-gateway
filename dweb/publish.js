#!/usr/bin/env node
/**
 * DWeb Publisher - Script CLI semplificato
 * 
 * Uso:
 *   node publish.js [file.html]
 *   node publish.js                    (usa l'HTML hardcoded)
 */

const fs = require("fs");
const path = require("path");
const { publish } = require("./admin-publish-core");

const APP_NAME = "test-site";

async function main() {
  const args = process.argv.slice(2);
  
  let htmlContent;
  let fileName = "content.html";

  if (args.length > 0) {
    // Leggi il file fornito come argomento
    const filePath = args[0];
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Errore: File non trovato: ${filePath}`);
      process.exit(1);
    }

    if (!filePath.endsWith('.html') && !filePath.endsWith('.htm')) {
      console.error(`❌ Errore: Il file deve essere un file HTML (.html o .htm)`);
      process.exit(1);
    }

    htmlContent = fs.readFileSync(filePath, "utf8");
    fileName = path.basename(filePath);
    console.log(`📄 File caricato: ${fileName} (${(htmlContent.length / 1024).toFixed(2)} KB)`);
  } else {
    // Usa contenuto di default
    htmlContent = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><title>DWeb Site</title></head><body><h1>Hello Decentralized World!</h1><p>Pubblicato con DWeb Publisher</p></body></html>`;
    console.log(`📄 Usando contenuto di default`);
  }

  try {
    const result = await publish(htmlContent, APP_NAME);
    console.log(`\n✅ SUCCESS! Sito pubblicato con successo.`);
    console.log(`\n🔑 La tua Pub Key è: ${result.pubKey}`);
    console.log(`\n🌐 Il tuo sito è disponibile su GunDB.`);
  } catch (error) {
    console.error(`\n❌ Errore durante la pubblicazione:`, error.message);
    process.exit(1);
  }
}

main();
