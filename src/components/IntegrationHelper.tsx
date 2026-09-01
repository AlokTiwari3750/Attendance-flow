/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Copy, Check, FileCode, Landmark } from 'lucide-react';

export function IntegrationHelper() {
  const [activeSubTab, setActiveSubTab] = useState<'html' | 'gs'>('html');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const htmlCode = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Lucide Icons mapping for modern layouts -->
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #container {
      background-color: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      max-width: 420px;
      width: 100%;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    h2 {
      color: #0f172a;
      margin-top: 0;
      font-size: 20px;
      font-weight: 700;
    }
    #camera-container {
      position: relative;
      width: 100%;
      max-width: 320px;
      margin: 15px auto;
      border-radius: 10px;
      overflow: hidden;
      background-color: #020617;
      aspect-ratio: 4 / 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video, #capturedImage {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    canvas { display: none; }
    
    /* Location display panel */
    .locality-panel {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 12px;
      text-align: left;
      font-size: 13px;
    }
    .locality-panel div {
      margin-bottom: 4px;
    }
    .locality-title {
      font-weight: bold;
      color: #0ea5e9;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    input {
      width: calc(100% - 22px);
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 15px;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #0ea5e9;
      outline: none;
    }
    .button-group, .capture-group {
      display: flex;
      justify-content: space-around;
      gap: 10px;
      margin-top: 10px;
    }
    button {
      flex: 1;
      padding: 11px 18px;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: bold;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s, opacity 0.2s;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    #captureButton { background-color: #0284c7; }
    #captureButton:hover:not(:disabled) { background-color: #0369a1; }
    #recaptureButton { background-color: #64748b; }
    #recaptureButton:hover:not(:disabled) { background-color: #475569; }
    #inButton { background-color: #16a34a; }
    #inButton:hover:not(:disabled) { background-color: #15803d; }
    #outButton { background-color: #dc2626; }
    #outButton:hover:not(:disabled) { background-color: #b91c1c; }
    
    #status { margin-top: 15px; font-weight: bold; min-height: 20px; font-size: 14px; }
    #spinner {
      display: none;
      margin: 10px auto;
      width: 25px;
      height: 25px;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #0284c7;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="container">
    <h2>Attendance Capture</h2>
    
    <!-- Camera view -->
    <div id="camera-container">
      <video id="video" autoplay playsinline muted></video>
      <canvas id="canvas"></canvas>
      <img id="capturedImage" style="display:none;" alt="Captured attendance face"/>
    </div>
    
    <div class="capture-group">
      <button id="captureButton">📸 Capture Face</button>
      <button id="recaptureButton" style="display:none;">🔁 Re-Capture</button>
    </div>

    <!-- Live GPS Location Panel -->
    <div class="locality-panel">
      <span class="locality-title">📍 Live Geolocation (India Only)</span>
      <div style="margin-top: 5px; font-weight: 500;" id="geoStatus">Detecting GPS Location...</div>
      <div id="geoDetails" style="display:none;">
        <div><b>Area:</b> <span id="labelArea">-</span></div>
        <div><b>PIN Code:</b> <span id="labelPincode">-</span></div>
        <div><b>State:</b> <span id="labelState">-</span></div>
      </div>
    </div>
    
    <input type="tel" id="mobile" placeholder="Enter Mobile Number" required>
    <input type="text" id="siteName" placeholder="Enter Site Name" required>
    <input type="text" id="siteCode" placeholder="Enter Site Code" required>
    
    <div class="button-group">
      <button id="inButton">Check-In</button>
      <button id="outButton">Check-Out</button>
    </div>
    
    <div id="spinner"></div>
    <p id="status"></p>
  </div>

  <script>
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const capturedImage = document.getElementById('capturedImage');
    const captureButton = document.getElementById('captureButton');
    const recaptureButton = document.getElementById('recaptureButton');
    const inButton = document.getElementById('inButton');
    const outButton = document.getElementById('outButton');
    const mobileInput = document.getElementById('mobile');
    const siteNameInput = document.getElementById('siteName');
    const siteCodeInput = document.getElementById('siteCode');
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');

    // Geo label references
    const geoStatus = document.getElementById('geoStatus');
    const geoDetails = document.getElementById('geoDetails');
    const labelArea = document.getElementById('labelArea');
    const labelPincode = document.getElementById('labelPincode');
    const labelState = document.getElementById('labelState');

    let localStream = null;
    let capturedDataURL = null;

    // Location Storage Variables
    let currentArea = "";
    let currentPincode = "";
    let currentState = "";

    // 1. GPS Tracking & Auto Reverse Geocoding
    function getLiveGeolocation() {
      if (!navigator.geolocation) {
        geoStatus.textContent = "GPS Not supported by your device.";
        geoStatus.style.color = "red";
        return;
      }

      geoStatus.textContent = "Accessing satellites...";
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          geoStatus.textContent = "Resolving Address...";
          try {
            // Reverse Geocode via OSM Nominatim API
            const url = \`https://nominatim.openstreetmap.org/reverse?lat=\${lat}&lon=\${lon}&format=json&accept-language=en\`;
            const resp = await fetch(url, { headers: { 'User-Agent': 'AttendGPS/1.0' } });
            
            if (!resp.ok) throw new Error("Reverse geocode failed");
            
            const data = await resp.json();
            const addr = data.address || {};
            
            currentPincode = addr.postcode || "";
            currentState = addr.state || addr.state_district || "";
            currentArea = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.county || addr.city || "";

            // Display values
            labelArea.textContent = currentArea || "Locality Isolated";
            labelPincode.textContent = currentPincode || "N/A";
            labelState.textContent = currentState || "N/A";

            geoStatus.textContent = "📍 Core GPS Geolocation Active";
            geoStatus.style.color = "green";
            geoDetails.style.display = "block";
            
            // Indian Pincode Fallback check (if Nominatim misses PIN code but gets GPS)
            if (!currentPincode && currentArea) {
              geoStatus.textContent = "GPS Safe (PIN bypassed)";
            }
          } catch (e) {
            console.error(e);
            geoStatus.textContent = "Error parsing address details.";
            geoStatus.style.color = "orange";
          }
        },
        (error) => {
          geoStatus.textContent = "Permit GPS to auto-fetch Location. Check browser settings.";
          geoStatus.style.color = "red";
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }

    // Camera start karne ka function
    async function startCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        video.srcObject = localStream;
        statusDiv.textContent = '';
      } catch (err) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'Error: Camera Access Blocked. Grant privileges.';
        console.error("Camera error:", err);
      }
    }

    // Camera stop function
    function stopCamera() {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    }

    // Capture Image
    function captureImage() {
      if (!localStream) return;
      const width = video.videoWidth || 320;
      const height = video.videoHeight || 240;

      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, width, height);
      
      capturedDataURL = canvas.toDataURL('image/jpeg', 0.85);
      capturedImage.src = capturedDataURL;
      
      capturedImage.style.display = 'block';
      video.style.display = 'none';
      
      captureButton.style.display = 'none';
      recaptureButton.style.display = 'inline-block';
      
      stopCamera();
    }

    // Re-capture
    function recaptureImage() {
      capturedImage.style.display = 'none';
      video.style.display = 'block';
      capturedDataURL = null;
      
      captureButton.style.display = 'inline-block';
      recaptureButton.style.display = 'none';
      
      startCamera();
    }

    // Submit Data with Location Parameters
    function captureAndSubmit(type) {
      const mobile = mobileInput.value.trim();
      const siteName = siteNameInput.value.trim();
      const siteCode = siteCodeInput.value.trim();

      if (!mobile || !siteName || !siteCode) {
        alert('Please fill all fields (Mobile, Site Name, Site Code).');
        return;
      }
      if (!capturedDataURL) {
        alert('Please capture face image first.');
        return;
      }

      setLoading(true);
      
      // Included GPS fields in JSON submission
      const data = { 
        image: capturedDataURL, 
        mobile, 
        siteName, 
        siteCode, 
        type,
        area: currentArea,
        pincode: currentPincode,
        state: currentState
      };

      // Google Apps Script Connection
      google.script.run
        .withSuccessHandler(response => {
          setLoading(false);
          statusDiv.style.color = response.status === 'success' ? '#16a34a' : '#dc2626';
          statusDiv.textContent = response.message;
          
          if (response.status === 'success') {
            mobileInput.value = '';
            siteNameInput.value = '';
            siteCodeInput.value = '';
            recaptureImage();
          }
        })
        .withFailureHandler(error => {
          setLoading(false);
          statusDiv.style.color = '#dc2626';
          statusDiv.textContent = 'Script Error: ' + error.message;
        })
        .processAttendance(data);
    }

    function setLoading(isLoading) {
      spinner.style.display = isLoading ? 'block' : 'none';
      statusDiv.textContent = isLoading ? 'Submitting Details...' : '';
      statusDiv.style.color = '#0f172a';
      
      inButton.disabled = isLoading;
      outButton.disabled = isLoading;
      captureButton.disabled = isLoading;
      recaptureButton.disabled = isLoading;
    }

    // Setup Listeners
    captureButton.addEventListener('click', captureImage);
    recaptureButton.addEventListener('click', recaptureImage);
    inButton.addEventListener('click', () => captureAndSubmit('IN'));
    outButton.addEventListener('click', () => captureAndSubmit('OUT'));
    
    // Page load hooks
    window.addEventListener('load', () => {
      startCamera();
      getLiveGeolocation(); // Fetch India Location on load
    });
  </script>
</body>
</html>`;

  const gsCode = `const FOLDER_ID = '1w7mTfivlvdrDk7gy4ekp0G8DyLix6Xrt';
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const LOG_SHEET_NAME = 'Attendance';
const DB_SHEET_NAME = 'Employees DB';

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getEmployees') {
    try {
      const dbSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DB_SHEET_NAME);
      const data = dbSheet.getDataRange().getValues();
      const emps = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][1]) {
          emps.push({
            mobile: data[i][0].toString().trim(),
            name: data[i][1].toString().trim()
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', employees: emps }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Web Attendance with GPS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function processAttendance(data) {
  try {
    // Extract state, pincode, area fields submitted from frontend
    const { mobile, siteCode, siteName, type, image, area, pincode, state } = data;
    
    // Base64 image data extract mapping
    const imageData = image.split(',')[1];
    const fileName = "attendance_" + mobile + "_" + new Date().getTime() + ".jpg";
    const blob = Utilities.newBlob(
      Utilities.base64Decode(imageData),
      'image/jpeg',
      fileName
    );

    // Drive folder file creation
    const driveFolder = DriveApp.getFolderById(FOLDER_ID);
    const imageFile = driveFolder.createFile(blob);
    const imageUrl = imageFile.getUrl();

    // Fetch employee display name
    const employeeName = getEmployeeName(mobile);
    if (!employeeName) {
      return { status: 'error', message: 'Mobile number not found in Employee DB.' };
    }

    const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
    const now = new Date();
    
    // Timezone safe strings
    const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
    const dataRows = logSheet.getDataRange().getValues();

    // Walk array backwards to verify existing record entries on matching day
    for (let i = dataRows.length - 1; i >= 1; i--) {
      const row = dataRows[i];
      if (!row[0]) continue;
      
      const recordDateStr = Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd");
      const recordMobile = row[2];
      const recordSiteCode = row[4];

      if (
        recordMobile.toString().trim() === mobile.toString().trim() &&
        recordSiteCode.toString().toLowerCase().trim() === siteCode.toLowerCase().trim() &&
        recordDateStr === todayStr
      ) {
        
        if (type === 'IN') {
          return { status: 'error', message: 'Already Checked-In for this site today.' };
        }

        if (type === 'OUT') {
          const checkOutTime = row[7]; // Column H
          if (checkOutTime !== '') {
            return { status: 'error', message: 'Already Checked-Out for this site today.' };
          } else {
            // Update Check-Out Time and image safely
            logSheet.getRange(i + 1, 8).setValue(now); // Column H: OUT Time
            logSheet.getRange(i + 1, 9).setValue(imageUrl); // Column I: OUT Image
            return { status: 'success', message: 'Check-Out Complete: ' + employeeName };
          }
        }
      }
    }

    // Appending check-in fields directly matching 12 core Excel columns!
    // Adds Area (Col J), PIN Code (Col K), and State (Col L)
    if (type === 'IN') {
      logSheet.appendRow([
        now,          // Column A: Date/Time Stamp
        employeeName, // Column B: Name
        mobile,       // Column C: Mobile Number
        siteName,     // Column D: Site Name
        siteCode,     // Column E: Site Code
        now,          // Column F: IN Time
        imageUrl,     // Column G: IN Image Link
        '',           // Column H: Blank OUT Time
        '',           // Column I: Blank OUT Image Link
        area || '',   // Column J: Auto Geocoded Locality
        pincode || '',// Column K: Auto Geocoded PIN Code
        state || ''   // Column L: Auto Geocoded State
      ]);
      return { status: 'success', message: 'Check-In Registered: ' + employeeName };
    }

    if (type === 'OUT') {
      return { status: 'error', message: 'No matching Check-In found for this site today.' };
    }

  } catch (e) {
    return { status: 'error', message: 'An Script exception occurred: ' + e.toString() };
  }
}

function getEmployeeName(mobileNumber) {
  const dbSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DB_SHEET_NAME);
  const data = dbSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === mobileNumber.toString().trim()) {
      return data[i][1];
    }
  }
  return null;
}`;

  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden mt-6">
      <div className="px-5 py-4 bg-zinc-950 border-b border-zinc-800/80 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5 text-sky-400">
            <Landmark className="w-4 h-4" />
            Copy-Paste Google Spreadsheet Code (GAS Integration)
          </h3>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Use these pristine snippets to apply the automatic location coordinates solver directly in your Apps Script project!
          </p>
        </div>

        <div className="flex gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setActiveSubTab('html')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeSubTab === 'html' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            index.html Code
          </button>
          <button
            onClick={() => setActiveSubTab('gs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeSubTab === 'gs' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Code.gs (Apps Script)
          </button>
        </div>
      </div>

      <div className="p-5 font-mono text-xs relative max-h-[460px] overflow-y-auto bg-zinc-950/40">
        <button
          onClick={() => handleCopy(activeSubTab === 'html' ? htmlCode : gsCode)}
          className="absolute right-4 top-4 bg-sky-600/90 hover:bg-sky-500 text-white p-2 rounded-lg border border-sky-500/10 transition-colors cursor-pointer flex items-center gap-1 shadow"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        {activeSubTab === 'html' ? (
          <div>
            <div className="text-zinc-500 mb-3 whitespace-pre-wrap font-sans text-xs">
              💡 **HTML changes**: Added a compact **Live Geolocation** tracking panel using `navigator.geolocation` paired with OpenStreetMap's Nominatim API. Added the fetched area, postcode (PIN Code), and state directly to the JSON format submitted to the app backend server.
            </div>
            <pre className="text-emerald-400 leading-relaxed text-[11px] select-all">{htmlCode}</pre>
          </div>
        ) : (
          <div>
            <div className="text-zinc-500 mb-3 whitespace-pre-wrap font-sans text-xs">
              💡 **Google Apps Script Changes**: Modified `processAttendance` to extract `area`, `pincode`, and `state`. Check-In rows will append these coordinates beautifully to columns J, K, and L (column 10, 11, 12) respectively, maintaining active date-matching loops!
            </div>
            <pre className="text-amber-400 leading-relaxed text-[11px] select-all">{gsCode}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
