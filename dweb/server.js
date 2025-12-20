const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { publish, getPubKey } = require("./admin-publish-core");

const PORT = 3000;
const APP_NAME = "test-site";
const DWEB_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  const host = req.headers.host || '';

  // Supporto subdomain routing (es. username.dweb.app)
  if (host.includes('.') && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    const parts = host.split('.');
    const subdomain = parts[0];
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'dweb' && subdomain !== 'app') {
      if (pathname === '/' || pathname === '') {
        res.writeHead(302, { Location: `/dweb/view/${subdomain}` });
        res.end();
        return;
      }
    }
  }

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // API: Pubblica HTML
  if (pathname === "/dweb/api/publish" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { html, fileName } = JSON.parse(body);

        if (!html) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "HTML content is required" }));
          return;
        }

        console.log(`📤 Richiesta pubblicazione ricevuta (${fileName || "no-name"})`);
        const result = await publish(html, APP_NAME);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            pubKey: result.pubKey,
            message: "Pubblicazione completata con successo",
          })
        );
      } catch (error) {
        console.error("❌ Errore pubblicazione:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // API: Ottieni pub key
  if (pathname === "/dweb/api/pubkey" && req.method === "GET") {
    try {
      const pubKey = await getPubKey();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ pubKey }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Routing per DWeb
  let filePath;
  
  // Viewer: /dweb/view/username o /dweb/view/username/pagename
  if (pathname.startsWith("/dweb/view/")) {
    filePath = path.join(DWEB_DIR, "viewer.html");
  }
  // Index legacy: /dweb/index.html
  else if (pathname === "/dweb/index.html") {
    filePath = path.join(DWEB_DIR, "index.html");
  }
  // SaaS App: /dweb o /dweb/app
  else if (pathname === "/dweb" || pathname === "/dweb/" || pathname === "/dweb/app" || pathname === "/dweb/dashboard") {
    filePath = path.join(DWEB_DIR, "saas-app.html");
  }
  // Admin legacy: /dweb/admin
  else if (pathname === "/dweb/admin") {
    filePath = path.join(DWEB_DIR, "admin.html");
  }
  // File statici dentro dweb
  else if (pathname.startsWith("/dweb/")) {
    filePath = path.join(DWEB_DIR, pathname.replace("/dweb", ""));
  }
  // Altrimenti 404 o passa alla app React
  else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 - File non trovato</h1>");
    return;
  }

  const ext = path.parse(filePath).ext;
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 - File non trovato</h1>");
      } else {
        res.writeHead(500);
        res.end(`Errore del server: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server DWeb Platform avviato!`);
  console.log(`\n📱 Piattaforma SaaS:`);
  console.log(`   http://localhost:${PORT}/dweb`);
  console.log(`\n📱 Dashboard (legacy):`);
  console.log(`   http://localhost:${PORT}/dweb/admin`);
  console.log(`\n🌐 Viewer:`);
  console.log(`   http://localhost:${PORT}/dweb/view/username/pagename`);
  console.log(`\n💡 Premi Ctrl+C per fermare il server\n`);
});
