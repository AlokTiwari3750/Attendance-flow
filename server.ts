import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const DB_FILE = path.join(process.cwd(), 'database.json');

// Initialize database with default template if not present on container startup
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
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
        spreadsheetId: '1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c',
        webAppUrl: ''
      }
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to create database.json:', e);
    }
  }
}

initDb();

function readDb() {
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return {
      employees: [],
      logs: [],
      config: { spreadsheetId: '1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c', webAppUrl: '' }
    };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large base64 image uploads (selfie payload)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // API Route: Get state of whole database (employees, logs, config)
  app.get('/api/database', (req, res) => {
    res.json(readDb());
  });

  // API Route: Save Google Sheet custom configurations and web app url
  app.post('/api/config', (req, res) => {
    const { spreadsheetId, webAppUrl } = req.body;
    const db = readDb();
    db.config = {
      spreadsheetId: spreadsheetId || db.config.spreadsheetId || '1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c',
      webAppUrl: webAppUrl || ''
    };
    writeDb(db);
    res.json({ status: 'success', config: db.config });
  });

  // API Proxy Route: Fetch employees from Google Apps Script Web App to bypass CORS
  app.get('/api/sync-employees', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

    try {
      const cleanUrl = String(url).trim();
      const response = await fetch(`${cleanUrl}?action=getEmployees`, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (contentType.includes('html') || text.trim().startsWith('<')) {
        throw new Error('HTML_RESPONSE_ERROR');
      }

      const data = JSON.parse(text);
      res.json(data);
    } catch (err: any) {
      console.error('Proxy employee sync failed:', err);
      if (err.name === 'AbortError') {
        res.status(504).json({
          error: 'Connection timed out after 12 seconds! Your Google Web App is taking too long to respond. Google Apps Scripts can be slow on active wakeups. Please try clicking the button again in a moment.'
        });
      } else if (err.message === 'HTML_RESPONSE_ERROR' || err.toString().includes('SyntaxError')) {
        res.status(401).json({
          error: 'Authentication Block: The Google Web App returned HTML/Google Login instead of employee JSON. This means your script was published with "Who has access" set to "Only myself". You must redeploy your Web App as "Anyone" so the system can read your employee roster.'
        });
      } else {
        res.status(500).json({
          error: 'Could not fetch from Google Web App: ' + err.toString()
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  });

  // API Route: Register a new employee globally in core DB
  app.post('/api/employees', (req, res) => {
    const { mobile, name } = req.body;
    if (!mobile || !name) {
      return res.status(400).json({ error: 'Mobile number and Full Name are required.' });
    }
    const db = readDb();
    const exists = db.employees.some((emp: any) => emp.mobile.trim() === mobile.trim());
    if (exists) {
      return res.status(400).json({ error: 'This mobile number is already registered in Employee Register.' });
    }
    
    const newEmp = { mobile: mobile.trim(), name: name.trim() };
    db.employees.push(newEmp);
    writeDb(db);
    res.json({ status: 'success', employees: db.employees });
  });

  // API Route: Submit employee check-in log
  app.post('/api/logs/checkin', async (req, res) => {
    const log = req.body;
    if (!log.mobile || !log.siteCode) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }
    const db = readDb();
    
    // Check duplication on DB
    const exists = db.logs.some((l: any) => 
      l.mobile.trim() === log.mobile.trim() && 
      l.siteCode.toLowerCase().trim() === log.siteCode.toLowerCase().trim() && 
      l.date === log.date
    );
    if (exists) {
      return res.status(400).json({ error: 'Your Check-In has already been registered for this site today.' });
    }

    db.logs.unshift(log); // Add to local db on head of logs
    writeDb(db);

    // If Google Sheet Apps Script URL is set up, dispatch asynchronous background post (non-blocking)
    if (db.config.webAppUrl) {
      try {
        console.log(`Forwarding checkin for ${log.employeeName} to spreadsheet Apps Script (background)...`);
        const payload = {
          mobile: log.mobile,
          siteCode: log.siteCode,
          siteName: log.siteName,
          type: 'IN',
          image: log.inImage,
          area: log.area,
          pincode: log.pincode,
          state: log.state
        };
        const controller = new AbortController();
        const bTimeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
        
        fetch(db.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        .then(async (resSync) => {
          const txt = await resSync.text();
          console.log("Apps Script Check-In Response text length:", txt.length);
        })
        .catch(syncErr => console.error("Background Apps Script Check-In failed:", syncErr))
        .finally(() => clearTimeout(bTimeoutId));
      } catch (err) {
        console.error("Failed to setup background Check-In dispatch:", err);
      }
    }
    
    res.json({ status: 'success', logs: db.logs });
  });

  // API Route: Submit employee check-out update
  app.post('/api/logs/checkout', async (req, res) => {
    const { mobile, siteCode, date, timeStr, imageStr } = req.body;
    if (!mobile || !siteCode || !date) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    const db = readDb();
    
    const index = db.logs.findIndex((l: any) => 
      l.mobile.trim() === mobile.trim() && 
      l.siteCode.toLowerCase().trim() === siteCode.toLowerCase().trim() && 
      l.date === date
    );

    if (index === -1) {
      return res.status(400).json({ error: 'No matching Check-In record found for today.' });
    }

    if (db.logs[index].outTime) {
      return res.status(400).json({ error: 'Your Check-Out has already been registered for today.' });
    }

    db.logs[index].outTime = timeStr;
    db.logs[index].outImage = imageStr;
    writeDb(db);

    // If Google Sheet Apps Script URL is set, dispatch asynchronous background post (non-blocking)
    if (db.config.webAppUrl) {
      try {
        console.log(`Forwarding checkout for ${db.logs[index].employeeName} to spreadsheet Apps Script (background)...`);
        const payload = {
          mobile,
          siteCode,
          siteName: db.logs[index].siteName,
          type: 'OUT',
          image: imageStr,
          area: db.logs[index].area,
          pincode: db.logs[index].pincode,
          state: db.logs[index].state
        };
        const controller = new AbortController();
        const bTimeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        fetch(db.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        .then(async (resSync) => {
          const txt = await resSync.text();
          console.log("Apps Script Check-Out Response text length:", txt.length);
        })
        .catch(syncErr => console.error("Background Apps Script Check-Out failed:", syncErr))
        .finally(() => clearTimeout(bTimeoutId));
      } catch (err) {
        console.error("Failed to setup background Check-Out dispatch:", err);
      }
    }

    res.json({ status: 'success', logs: db.logs });
  });

  // API Route: Clear all local server logs (Admin exclusive simulation)
  app.post('/api/logs/clear', (req, res) => {
    const db = readDb();
    db.logs = [];
    writeDb(db);
    res.json({ status: 'success', logs: [] });
  });

  // Serve static assets/bundle in production, otherwise hook Vite HMR/dev server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orgaearth Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
