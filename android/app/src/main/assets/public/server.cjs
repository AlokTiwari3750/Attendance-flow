var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var DB_FILE = import_path.default.join(process.cwd(), "database.json");
function initDb() {
  if (!import_fs.default.existsSync(DB_FILE)) {
    const initialData = {
      employees: [
        { mobile: "9999508047", name: "Surinder Singh" },
        { mobile: "9871596694", name: "Akash Sharma" },
        { mobile: "9560878291", name: "Dharmendra Kumar" },
        { mobile: "7388612067", name: "Vikash Sharma" },
        { mobile: "9265730667", name: "Raushan Kumar" },
        { mobile: "7351075372", name: "Sanjeev Kumar" },
        { mobile: "7978317842", name: "Soumya Ranjan" },
        { mobile: "9007400280", name: "Parash Nath Chaudhary" },
        { mobile: "7905988561", name: "Ayush Sir" },
        { mobile: "7351503533", name: "VIkas Kumar" },
        { mobile: "9873273427", name: "Amandeep" },
        { mobile: "6392163774", name: "Golu Gautam" },
        { mobile: "8681868193", name: "Mohan raj" },
        { mobile: "8840921885", name: "Atul" }
      ],
      logs: [],
      config: {
        spreadsheetId: "1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c",
        webAppUrl: ""
      }
    };
    try {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to create database.json:", e);
    }
  }
}
initDb();
function readDb() {
  try {
    const content = import_fs.default.readFileSync(DB_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    return {
      employees: [],
      logs: [],
      config: { spreadsheetId: "1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c", webAppUrl: "" }
    };
  }
}
function writeDb(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write database.json:", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "15mb" }));
  app.use(import_express.default.urlencoded({ limit: "15mb", extended: true }));
  app.get("/api/database", (req, res) => {
    res.json(readDb());
  });
  app.post("/api/config", (req, res) => {
    const { spreadsheetId, webAppUrl } = req.body;
    const db = readDb();
    db.config = {
      spreadsheetId: spreadsheetId || db.config.spreadsheetId || "1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c",
      webAppUrl: webAppUrl || ""
    };
    writeDb(db);
    res.json({ status: "success", config: db.config });
  });
  app.get("/api/sync-employees", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL query parameter is required." });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e3);
    try {
      const cleanUrl = String(url).trim();
      const response = await fetch(`${cleanUrl}?action=getEmployees`, {
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      if (contentType.includes("html") || text.trim().startsWith("<")) {
        throw new Error("HTML_RESPONSE_ERROR");
      }
      const data = JSON.parse(text);
      res.json(data);
    } catch (err) {
      console.error("Proxy employee sync failed:", err);
      if (err.name === "AbortError") {
        res.status(504).json({
          error: "Connection timed out after 12 seconds! Your Google Web App is taking too long to respond. Google Apps Scripts can be slow on active wakeups. Please try clicking the button again in a moment."
        });
      } else if (err.message === "HTML_RESPONSE_ERROR" || err.toString().includes("SyntaxError")) {
        res.status(401).json({
          error: 'Authentication Block: The Google Web App returned HTML/Google Login instead of employee JSON. This means your script was published with "Who has access" set to "Only myself". You must redeploy your Web App as "Anyone" so the system can read your employee roster.'
        });
      } else {
        res.status(500).json({
          error: "Could not fetch from Google Web App: " + err.toString()
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  });
  app.post("/api/employees", (req, res) => {
    const { mobile, name } = req.body;
    if (!mobile || !name) {
      return res.status(400).json({ error: "Mobile number and Full Name are required." });
    }
    const db = readDb();
    const exists = db.employees.some((emp) => emp.mobile.trim() === mobile.trim());
    if (exists) {
      return res.status(400).json({ error: "This mobile number is already registered in Employee Register." });
    }
    const newEmp = { mobile: mobile.trim(), name: name.trim() };
    db.employees.push(newEmp);
    writeDb(db);
    res.json({ status: "success", employees: db.employees });
  });
  app.post("/api/logs/checkin", async (req, res) => {
    const log = req.body;
    if (!log.mobile || !log.siteCode) {
      return res.status(400).json({ error: "Missing required parameters." });
    }
    const db = readDb();
    const exists = db.logs.some(
      (l) => l.mobile.trim() === log.mobile.trim() && l.siteCode.toLowerCase().trim() === log.siteCode.toLowerCase().trim() && l.date === log.date
    );
    if (exists) {
      return res.status(400).json({ error: "Your Check-In has already been registered for this site today." });
    }
    db.logs.unshift(log);
    writeDb(db);
    if (db.config.webAppUrl) {
      try {
        console.log(`Forwarding checkin for ${log.employeeName} to spreadsheet Apps Script (background)...`);
        const payload = {
          mobile: log.mobile,
          siteCode: log.siteCode,
          siteName: log.siteName,
          type: "IN",
          image: log.inImage,
          area: log.area,
          pincode: log.pincode,
          state: log.state
        };
        const controller = new AbortController();
        const bTimeoutId = setTimeout(() => controller.abort(), 6e3);
        fetch(db.config.webAppUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        }).then(async (resSync) => {
          const txt = await resSync.text();
          console.log("Apps Script Check-In Response text length:", txt.length);
        }).catch((syncErr) => console.error("Background Apps Script Check-In failed:", syncErr)).finally(() => clearTimeout(bTimeoutId));
      } catch (err) {
        console.error("Failed to setup background Check-In dispatch:", err);
      }
    }
    res.json({ status: "success", logs: db.logs });
  });
  app.post("/api/logs/checkout", async (req, res) => {
    const { mobile, siteCode, date, timeStr, imageStr } = req.body;
    if (!mobile || !siteCode || !date) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    const db = readDb();
    const index = db.logs.findIndex(
      (l) => l.mobile.trim() === mobile.trim() && l.siteCode.toLowerCase().trim() === siteCode.toLowerCase().trim() && l.date === date
    );
    if (index === -1) {
      return res.status(400).json({ error: "No matching Check-In record found for today." });
    }
    if (db.logs[index].outTime) {
      return res.status(400).json({ error: "Your Check-Out has already been registered for today." });
    }
    db.logs[index].outTime = timeStr;
    db.logs[index].outImage = imageStr;
    writeDb(db);
    if (db.config.webAppUrl) {
      try {
        console.log(`Forwarding checkout for ${db.logs[index].employeeName} to spreadsheet Apps Script (background)...`);
        const payload = {
          mobile,
          siteCode,
          siteName: db.logs[index].siteName,
          type: "OUT",
          image: imageStr,
          area: db.logs[index].area,
          pincode: db.logs[index].pincode,
          state: db.logs[index].state
        };
        const controller = new AbortController();
        const bTimeoutId = setTimeout(() => controller.abort(), 6e3);
        fetch(db.config.webAppUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        }).then(async (resSync) => {
          const txt = await resSync.text();
          console.log("Apps Script Check-Out Response text length:", txt.length);
        }).catch((syncErr) => console.error("Background Apps Script Check-Out failed:", syncErr)).finally(() => clearTimeout(bTimeoutId));
      } catch (err) {
        console.error("Failed to setup background Check-Out dispatch:", err);
      }
    }
    res.json({ status: "success", logs: db.logs });
  });
  app.post("/api/logs/clear", (req, res) => {
    const db = readDb();
    db.logs = [];
    writeDb(db);
    res.json({ status: "success", logs: [] });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Orgaearth Server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
