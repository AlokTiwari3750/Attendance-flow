import { Employee, AttendanceLog } from '../types';

let SPREADSHEET_ID = '1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c';

// Dynamically set the Spreadsheet ID or parse from a full Google Sheets URL
export function setGlobalSpreadsheetId(id: string) {
  if (id && id.trim()) {
    const urlMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      SPREADSHEET_ID = urlMatch[1];
    } else {
      SPREADSHEET_ID = id.trim();
    }
    console.log('[GoogleSheets] Connected to Spreadsheet ID:', SPREADSHEET_ID);
  }
}

// Helper to fetch values from Google Sheets API
async function getSheetValues(accessToken: string, range: string): Promise<any[][] | null> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      console.warn(`Failed to fetch range: ${range}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`Error in getSheetValues for range ${range}:`, error);
    return null;
  }
}

// Helper to write/append values to Google Sheets API
async function appendSheetRow(accessToken: string, range: string, values: any[][]): Promise<boolean> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error(`Error in appendSheetRow for range ${range}:`, error);
    return false;
  }
}

// Helper to update a single row in Google Sheets API
async function updateSheetRange(accessToken: string, range: string, values: any[][]): Promise<boolean> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error(`Error in updateSheetRange for range ${range}:`, error);
    return false;
  }
}

// Load registered employee list from Google Sheet
export const fetchEmployeesFromSheet = async (accessToken: string): Promise<Employee[]> => {
  // Let's try multiple standard tab names
  const rangesToTry = ['Employees DB!A2:B200', 'Employees!A2:B200', 'Sheet1!A2:B200'];
  for (const range of rangesToTry) {
    const values = await getSheetValues(accessToken, range);
    if (values && values.length > 0) {
      const list: Employee[] = [];
      values.forEach((row) => {
        const mobile = row[0] ? String(row[0]).trim().replace(/\D/g, '') : '';
        const name = row[1] ? String(row[1]).trim() : '';
        if (mobile && name) {
          list.push({ mobile, name });
        }
      });
      if (list.length > 0) {
        return list;
      }
    }
  }

  // If no employees found, we try to write sample headers if on Employees DB range so user gets it working
  try {
    await appendSheetRow(accessToken, 'Employees DB!A1:B1', [['Mobile Number', 'Full Name']]);
  } catch (e) {
    console.log('Skipped header init:', e);
  }

  return [];
};

// Add single new employee to Employees DB tab
export const addEmployeeToSheet = async (accessToken: string, employee: Employee): Promise<boolean> => {
  const cleanMobile = employee.mobile.trim();
  const cleanName = employee.name.trim();
  
  // Append to "Employees DB" tab (fallback to Sheet1 if failed, but we'll try "Employees DB")
  return await appendSheetRow(accessToken, 'Employees DB!A2:B2', [[cleanMobile, cleanName]]);
};

// Find and update check-out log, or append check-in log
export const fetchAttendanceLogsFromSheet = async (accessToken: string): Promise<AttendanceLog[]> => {
  const rangesToTry = ['Attendance!A3:L1500', 'Sheet1!A3:L1500'];
  for (const range of rangesToTry) {
    const values = await getSheetValues(accessToken, range);
    if (values) {
      const logs: AttendanceLog[] = [];
      values.forEach((row, i) => {
        // row indexes corresponding to:
        // 0: Date, 1: Name, 2: Mobile, 3: Site Name, 4: Site Code, 5: Check-In Time, 6: IN Selfie
        // 7: Check-Out Time, 8: OUT Selfie, 9: Area, 10: Pincode, 11: State
        const id = row[12] ? String(row[12]) : `gs-${i}`; 
        if (row[0] || row[1] || row[2]) {
          logs.push({
            id,
            date: row[0] ? String(row[0]) : '',
            employeeName: row[1] ? String(row[1]) : '',
            mobile: row[2] ? String(row[2]) : '',
            siteName: row[3] ? String(row[3]) : '',
            siteCode: row[4] ? String(row[4]) : '',
            inTime: row[5] ? String(row[5]) : '',
            inImage: row[6] ? String(row[6]) : '',
            outTime: row[7] ? String(row[7]) : '',
            outImage: row[8] ? String(row[8]) : '',
            area: row[9] ? String(row[9]) : '',
            pincode: row[10] ? String(row[10]) : '',
            state: row[11] ? String(row[11]) : '',
          });
        }
      });
      return logs;
    }
  }
  
  // Try to write the template header for Attendance
  try {
    await appendSheetRow(accessToken, 'Attendance!A1:M2', [
      ['ATTENDFLOW ORGAEARTH LIVE DATABASE LOGS', '', '', '', '', '', '', '', '', '', '', ''],
      ['Date (YYYY-MM-DD)', 'Full Name', 'Mobile Number', 'Site Name', 'Site Code', 'Check-In Time', 'IN Selfie', 'Check-Out Time', 'OUT Selfie', 'GPS Area', 'Pincode', 'State', 'Unique ID']
    ]);
  } catch (e) {
    console.error('Skipped attendance header init:', e);
  }

  return [];
};

// Log a Check-In
export const saveCheckInToSheet = async (accessToken: string, log: AttendanceLog): Promise<boolean> => {
  const rowData = [
    [
      log.date,
      log.employeeName,
      log.mobile,
      log.siteName,
      log.siteCode,
      log.inTime,
      log.inImage || '',
      '', // outTime
      '', // outImage
      log.area || '',
      log.pincode || '',
      log.state || '',
      log.id
    ]
  ];
  return await appendSheetRow(accessToken, 'Attendance!A3:M3', rowData);
};

// Log a Check-Out
export const saveCheckOutToSheet = async (accessToken: string, mobile: string, siteCode: string, date: string, timeStr: string, imageStr: string): Promise<boolean> => {
  // First we must scan the sheet to find the row index matching mobile, siteCode, date, and where outTime is empty
  // We query Attendance!A3:M1500
  const values = await getSheetValues(accessToken, 'Attendance!A3:M1500');
  if (!values || values.length === 0) return false;

  let matchedRowOffset = -1; // index relative to row 3 (which is index A3, Google Sheets starts at row 1, so row index = offset + 3)
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowDate = row[0] ? String(row[0]).trim() : '';
    const rowMobile = row[2] ? String(row[2]).trim().replace(/\D/g, '') : '';
    const rowSiteCode = row[4] ? String(row[4]).trim().toLowerCase() : '';
    const rowOutTime = row[7] ? String(row[7]).trim() : '';

    if (
      rowDate === date &&
      rowMobile === mobile.trim().replace(/\D/g, '') &&
      rowSiteCode === siteCode.trim().toLowerCase() &&
      !rowOutTime
    ) {
      matchedRowOffset = i;
      break;
    }
  }

  if (matchedRowOffset === -1) {
    return false; // No matching check-in row
  }

  const sheetRowNumber = matchedRowOffset + 3; // Row 3 is index 0
  // Update Check-Out Time (Col H -> Index 7) and OUT Selfie (Col I -> Index 8)
  const outTimeRange = `Attendance!H${sheetRowNumber}`;
  const outImageRange = `Attendance!I${sheetRowNumber}`;

  const updateTimeSuccess = await updateSheetRange(accessToken, outTimeRange, [[timeStr]]);
  const updateImgSuccess = await updateSheetRange(accessToken, outImageRange, [[imageStr || '']]);

  return updateTimeSuccess && updateImgSuccess;
};
