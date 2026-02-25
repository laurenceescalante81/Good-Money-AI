import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  const adminPath = path.resolve(process.cwd(), "server", "templates", "admin.html");
  app.get("/admin", (_req: Request, res: Response) => {
    res.sendFile(adminPath);
  });

  const adviserPath = path.resolve(process.cwd(), "server", "templates", "adviser.html");
  app.get("/adviser", (_req: Request, res: Response) => {
    res.sendFile(adviserPath);
  });

  const studioPath = path.resolve(process.cwd(), "Studio.html");
  app.get("/studio", (_req: Request, res: Response) => {
    res.sendFile(studioPath);
  });

  const distDir = path.resolve(process.cwd(), "dist");
  const hasWebBuild = fs.existsSync(path.join(distDir, "index.html"));

  if (hasWebBuild) {
    log("Web build found in dist/ — serving Expo web app");
  }

  const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|discord|slack|preview|fetch|curl|wget|GPTBot|ChatGPT|Claude|Anthropic|Google-Extended|CCBot|PerplexityBot|Bytespider|Baiduspider|YandexBot|DuckDuckBot|archive\.org|Applebot|bingbot|Googlebot/i;

  const BOT_ACCESS_KEY = process.env.BOT_ACCESS_KEY || "pzt2uvkunF2oUNmRi109XkAA9WD7cbxc";

  function isBot(req: Request): boolean {
    const ua = req.header("user-agent") || "";
    return BOT_UA.test(ua);
  }

  function hasBotAccess(req: Request): boolean {
    const key = (req.query as any).key || req.header("x-bot-key") || "";
    return key === BOT_ACCESS_KEY;
  }

  function getBaseUrl(req: Request): string {
    const proto = req.header("x-forwarded-proto") || req.protocol || "https";
    const host = req.header("x-forwarded-host") || req.get("host") || "goodmoneyai.app";
    return `${proto}://${host}`;
  }

  function serveBotHtml(req: Request, res: Response) {
    const baseUrl = getBaseUrl(req);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Good Money – Australian Financial Planning App</title>
<meta name="description" content="Good Money is a personal financial planning app built for Australians. Track your mortgage, superannuation, insurance, budget, and savings goals — all in one place. Earn rewards while building your financial future." />
<meta name="keywords" content="Australian finance app, mortgage tracker, superannuation, budget planner, savings goals, insurance management, financial planning Australia, AUD, retirement planning" />
<link rel="canonical" href="${baseUrl}/" />

<meta property="og:type" content="website" />
<meta property="og:url" content="${baseUrl}/" />
<meta property="og:title" content="Good Money – Australian Financial Planning App" />
<meta property="og:description" content="Track mortgage, super, insurance, budget & savings. Earn rewards while planning your financial future. Built for Australians." />
<meta property="og:image" content="${baseUrl}/assets/images/logo.jpeg" />
<meta property="og:site_name" content="Good Money" />
<meta property="og:locale" content="en_AU" />

<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Good Money – Australian Financial Planning App" />
<meta name="twitter:description" content="Track mortgage, super, insurance, budget & savings. Earn rewards while planning your financial future." />
<meta name="twitter:image" content="${baseUrl}/assets/images/logo.jpeg" />

<meta name="robots" content="index, follow" />
</head>
<body>
<h1>Good Money – Australian Financial Planning App</h1>
<p>Good Money is a comprehensive personal financial planning app built specifically for Australians. It helps you take control of your finances across four key pillars.</p>

<h2>Key Features</h2>
<ul>
<li><strong>Mortgage Tracker</strong> – Track your home loan, see P&amp;I or interest-only repayments, monitor LVR and equity, and calculate the impact of extra repayments.</li>
<li><strong>Superannuation</strong> – Monitor your super balance, employer SG contributions (currently 11.5%), and see retirement projections to age 67.</li>
<li><strong>Insurance Management</strong> – Manage all your policies (home, car, health, life, income protection), track premiums, and get renewal reminders.</li>
<li><strong>Budget &amp; Savings</strong> – Track income and expenses in Australian categories (groceries, petrol, rent, utilities), set savings goals, and monitor spending trends.</li>
<li><strong>Open Banking</strong> – Connect Australian bank accounts via Basiq to see live balances and import transactions.</li>
<li><strong>Investor Risk Profile</strong> – Complete a 20-question questionnaire based on Australian fact find standards to discover your risk profile (Defensive to High Growth).</li>
<li><strong>Wealth Projections</strong> – Visualise your net wealth growth over 5, 10, 20, or 30 years across property equity, super, and savings.</li>
<li><strong>Rewards &amp; Gamification</strong> – Earn Good Coins by completing financial missions, daily check-ins, and building streaks. Redeem for cashback and gift cards.</li>
</ul>

<h2>For Financial Advisers</h2>
<p>Good Money includes a dedicated adviser portal for managing clients, viewing engagement reports, and accessing comprehensive fact find data.</p>

<h2>Australian-Specific</h2>
<p>All currency in AUD. Supports major Australian super funds (AustralianSuper, Rest, UniSuper, Hostplus, HESTA, Cbus), major banks (CBA, ANZ, NAB, Westpac, Macquarie), and Australian insurance and budget categories.</p>

<p>Visit <a href="${baseUrl}/">${baseUrl}</a> to get started.</p>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  }

  app.get("/robots.txt", (_req: Request, res: Response) => {
    const baseUrl = getBaseUrl(_req);
    res.setHeader("Content-Type", "text/plain");
    res.send(`User-agent: *
Disallow: /api/
Disallow: /admin
Disallow: /adviser
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`);
  });

  app.get("/sitemap.xml", (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const now = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/adviser</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>`);
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path === "/manifest" || req.path === "/") {
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    if (req.path === "/" && (isBot(req) || (req.query as any).key)) {
      if (!hasBotAccess(req)) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(403).send("<!DOCTYPE html><html><head><title>Access Denied</title></head><body><h1>403 – Access Denied</h1><p>A valid access key is required to view this content. Append <code>?key=YOUR_KEY</code> to the URL.</p></body></html>");
      }
      return serveBotHtml(req, res);
    }

    if (req.path === "/" && hasWebBuild) {
      return res.sendFile(path.join(distDir, "index.html"));
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  if (hasWebBuild) {
    app.use(express.static(distDir));
  }

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  if (hasWebBuild) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/admin") || req.path.startsWith("/adviser")) {
        return next();
      }
      if (req.method === "GET" && req.accepts("html")) {
        return res.sendFile(path.join(distDir, "index.html"));
      }
      next();
    });
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
