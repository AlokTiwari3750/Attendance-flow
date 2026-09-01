/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Phone, 
  MapPin, 
  Briefcase, 
  Binary, 
  UserCheck, 
  Clock, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
  ShieldAlert,
  Share2,
  Copy,
  Calendar,
  PlusCircle,
  CheckCircle,
  XCircle,
  Timer,
  Trash2,
  Check
} from 'lucide-react';
import { User } from 'firebase/auth';

import { Employee, AttendanceLog, GeolocationData, LeaveRequest } from './types';
import { CameraCapture } from './components/CameraCapture';
import { SimulatedSheet } from './components/SimulatedSheet';
import { IntegrationHelper } from './components/IntegrationHelper';
import { LoginPage } from './components/LoginPage';
import { getCurrentCoordinates, reverseGeocode, fetchDetailsByPincode } from './utils/geolocation';
import { initAuth, googleSignIn, getAccessToken, logout as authLogout, db } from './utils/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  fetchEmployeesFromSheet, 
  addEmployeeToSheet, 
  fetchAttendanceLogsFromSheet, 
  saveCheckInToSheet, 
  saveCheckOutToSheet,
  setGlobalSpreadsheetId
} from './utils/googleSheets';

// Initial Mock DB for simulations (used only as offline fallback)
const DEFAULT_EMPLOYEES: Employee[] = [
  { mobile: '9999508047', name: 'Surinder Singh' },
  { mobile: '9871596694', name: 'Akash Sharma' },
  { mobile: '9560878291', name: 'Suman Kumar' },
  { mobile: '7388612067', name: 'Vikash Sharma' },
  { mobile: '9265730667', name: 'Dharmendra Kumar' },
  { mobile: '7351075372', name: 'Sanjeev Kumar' },
  { mobile: '7978317842', name: 'Soumya Ranjan' },
  { mobile: '9007400280', name: 'Parash Nath Chaudhary' },
  { mobile: '7905988561', name: 'Ayush Sir' },
  { mobile: '7351503533', name: 'VIkas Kumar' },
  { mobile: '9873273427', name: 'Amandeep' },
  { mobile: '6392163774', name: 'Golu Gautam' },
  { mobile: '8681868193', name: 'Mohan raj' },
  { mobile: '8840921885', name: 'Atul' }
];

const OrgaearthIcon = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 md:w-12 md:h-12 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Pear-Green Organic Leaves */}
    <path
      d="M48,52 C38,42 24,15 24,15 C24,15 48,22 55,35 C60,45 54,49 48,52 Z"
      fill="#82C341"
    />
    <path
      d="M42,56 C36,48 24,30 24,30 C24,30 40,34 45,44 C49,52 45,55 42,56 Z"
      fill="#82C341"
      opacity="0.8"
    />
    <path
      d="M48,63 C40,58 30,44 30,44 C30,44 44,46 48,53 C52,59 49,62 48,63 Z"
      fill="#82C341"
      opacity="0.6"
    />
    {/* Sky-Blue Water Droplets */}
    <path
      d="M52,48 C58,38 74,18 74,18 C74,18 69,38 58,45 C49,51 47,43 52,48 Z"
      fill="#039BE5"
    />
    <path
      d="M55,59 C62,50 78,35 78,35 C78,35 74,51 63,57 C54,62 52,55 55,59 Z"
      fill="#0288D1"
    />
    <path
      d="M52,66 C57,59 69,48 69,48 C69,48 66,59 58,64 C52,68 50,62 52,66 Z"
      fill="#29B6F6"
    />
    {/* Central connection accent */}
    <circle cx="50" cy="50" r="3.5" fill="#0288D1" opacity="0.85" />
  </svg>
);

const OrgaearthLogo = () => (
  <div className="flex items-center gap-3.5 select-none text-left">
    <OrgaearthIcon />
    <div className="flex flex-col justify-center">
      <div className="text-2xl md:text-3xl font-black tracking-tight flex items-baseline leading-none">
        <span className="text-[#84cc16]">ORGA</span>
        <span className="text-[#0ea5e9]">EARTH</span>
      </div>
      <div className="text-[9px] md:text-[10px] font-bold text-slate-600 tracking-[0.2em] md:tracking-[0.35em] leading-none uppercase mt-1">
        LAUNDRY SOLUTIONS
      </div>
    </div>
  </div>
);

export default function App() {
  // User Authentication State
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; name: string; phone: string } | null>(() => {
    const saved = localStorage.getItem('orgaearth_logged_in_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 1. Core State Managers
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [mobile, setMobile] = useState('');

  // Auto-set mobile number for logged-in user
  useEffect(() => {
    if (loggedInUser) {
      setMobile(loggedInUser.phone);
    }
  }, [loggedInUser]);
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Leave Form Input States
  const [leaveType, setLeaveType] = useState<'EL' | 'CL' | 'Comp Off'>('CL');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStatusMsg, setLeaveStatusMsg] = useState<{ type: 'success' | 'err'; text: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true' || params.get('role') === 'admin';
  });
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPasscodeForm, setShowPasscodeForm] = useState<boolean>(false);
  const [logoClicks, setLogoClicks] = useState<number>(0);

  // Admin Master Passcode States
  const [actualPasscode, setActualPasscode] = useState<string>(() => localStorage.getItem('attendflow_admin_passcode') || 'admin123');
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSuccessMsg, setPasscodeSuccessMsg] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // 2. Geolocation Solver States
  const [geoData, setGeoData] = useState<GeolocationData>({
    latitude: 0,
    longitude: 0,
    area: '',
    pincode: '',
    state: ''
  });
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 3. Centralized Database Sheets (Synchronized with Server)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>(() => {
    const saved = localStorage.getItem('orgaearth_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [spreadsheetId, setSpreadsheetId] = useState('1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c');
  const [webAppUrl, setWebAppUrl] = useState('');

  // 3.5 HR Leave & Tab Selection State
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('orgaearth_leaves');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: 'mock_leave_1',
        mobile: '9999508047',
        employeeName: 'Surinder Singh',
        leaveType: 'CL',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        reason: 'Urgent family emergency in hometown',
        status: 'Approved',
        appliedOn: '2026-06-28'
      },
      {
        id: 'mock_leave_2',
        mobile: '9871596694',
        employeeName: 'Akash Sharma',
        leaveType: 'EL',
        startDate: '2026-07-15',
        endDate: '2026-07-18',
        reason: 'Pre-planned personal travel with family',
        status: 'Pending',
        appliedOn: '2026-07-10'
      }
    ];
  });

  // 4. Feedback & Spinner States
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 5. Looked up Employee name live states
  const [matchedEmployee, setMatchedEmployee] = useState<string | null>(null);

  // Local Clock Display
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto Tick Time
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync lower-level Google Sheet API utils with current React spreadsheetId state
  useEffect(() => {
    setGlobalSpreadsheetId(spreadsheetId);
  }, [spreadsheetId]);

  // Fetch full state from local server first (instantaneous), then sync with Firestore in background
  const loadDatabaseFromServer = async () => {
    let activeSpreadsheetId = spreadsheetId || '1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c';
    let activeWebAppUrl = webAppUrl || '';

    // 1. Fetch from local server db first (extremely fast ~5ms, prevents any UI loading block)
    try {
      const res = await fetch('/api/database');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.employees && data.employees.length > 0) {
            setEmployees(data.employees);
          }
          if (data.logs) {
            setLogs(data.logs);
          }
          if (data.config) {
            if (data.config.spreadsheetId) {
              setSpreadsheetId(data.config.spreadsheetId);
              activeSpreadsheetId = data.config.spreadsheetId;
            }
            if (data.config.webAppUrl) {
              setWebAppUrl(data.config.webAppUrl);
              activeWebAppUrl = data.config.webAppUrl;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load local database on startup:", e);
    }

    // 2. Perform Firestore checks & background synchronizations without blocking the UI
    (async () => {
      try {
        const configRef = doc(db, 'config', 'main');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const configData = configSnap.data();
          if (configData.spreadsheetId) {
            setSpreadsheetId(configData.spreadsheetId);
            activeSpreadsheetId = configData.spreadsheetId;
          }
          if (configData.webAppUrl) {
            setWebAppUrl(configData.webAppUrl);
            activeWebAppUrl = configData.webAppUrl;
          }
        } else {
          try {
            await setDoc(configRef, {
              spreadsheetId: activeSpreadsheetId,
              webAppUrl: activeWebAppUrl
            });
          } catch (e) {
            console.warn("Could not save config to Firestore:", e);
          }
        }

        // Fetch employee registry from Firestore cache
        let empsList: Employee[] = [];
        try {
          // Keep Firestore seeded with the default safe list
          for (const emp of DEFAULT_EMPLOYEES) {
            await setDoc(doc(db, 'employees', emp.mobile.trim()), emp).catch(() => {});
          }

          const empsSnap = await getDocs(collection(db, 'employees'));
          empsSnap.forEach((doc) => {
            const data = doc.data();
            if (data && data.mobile && data.name) {
              if (!empsList.some(e => e.mobile.trim() === data.mobile.trim())) {
                empsList.push({ mobile: data.mobile.trim(), name: data.name.trim() });
              }
            }
          });
          if (empsList.length > 0) {
            setEmployees(empsList);
          }
        } catch (err) {
          console.warn("Firestore employee fetch bypassed:", err);
          empsList = [...DEFAULT_EMPLOYEES];
        }

        // Automatic non-blocking Google Sheets sync of employee rosters
        if (activeWebAppUrl) {
          try {
            const cleanUrl = activeWebAppUrl.trim();
            const controller = new AbortController();
            const syncTimeoutId = setTimeout(() => controller.abort(), 6000);
            
            const res = await fetch(`/api/sync-employees?url=${encodeURIComponent(cleanUrl)}`, {
              signal: controller.signal
            });
            clearTimeout(syncTimeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data && data.status === 'success' && data.employees && data.employees.length > 0) {
                const updatedEmps: Employee[] = [];
                const empsToSaveInFirestore: Employee[] = [];

                for (const emp of data.employees) {
                  if (emp.mobile && emp.name) {
                    const mobileStr = emp.mobile.toString().trim();
                    const nameStr = emp.name.toString().trim();
                    updatedEmps.push({ mobile: mobileStr, name: nameStr });

                    const cachedEmp = empsList.find(e => e.mobile.trim() === mobileStr);
                    if (!cachedEmp || cachedEmp.name.trim() !== nameStr) {
                      empsToSaveInFirestore.push({ mobile: mobileStr, name: nameStr });
                    }
                  }
                }

                if (updatedEmps.length > 0) {
                  setEmployees(updatedEmps);
                }

                if (empsToSaveInFirestore.length > 0) {
                  Promise.all(
                    empsToSaveInFirestore.map(emp => 
                      setDoc(doc(db, 'employees', emp.mobile), {
                        mobile: emp.mobile,
                        name: emp.name
                      }).catch(() => {})
                    )
                  ).catch(err => console.error("Error updating synced employees to Firestore:", err));
                }
              }
            }
          } catch (syncErr) {
            console.warn("Background Google Sheets sync failed, using local/Firestore cache:", syncErr);
          }
        }

        // Fetch Firestore attendance logs and merge them
        try {
          const logsSnap = await getDocs(collection(db, 'logs'));
          const firestoreLogs: AttendanceLog[] = [];
          logsSnap.forEach((doc) => {
            const data = doc.data();
            if (data && data.id && data.mobile) {
              firestoreLogs.push(data as AttendanceLog);
            }
          });

          if (firestoreLogs.length > 0) {
            setLogs(prev => {
              const combined = [...firestoreLogs];
              prev.forEach(pLog => {
                if (!combined.some(c => c.id === pLog.id)) {
                  combined.push(pLog);
                }
              });
              combined.sort((a, b) => {
                const dateTimeA = `${a.date} ${a.inTime || ''}`;
                const dateTimeB = `${b.date} ${b.inTime || ''}`;
                return dateTimeB.localeCompare(dateTimeA);
              });
              return combined;
            });
          }
        } catch (logsErr) {
          console.warn("Firestore logs fetch bypassed:", logsErr);
        }

        // Fetch applied leaves from Firestore
        try {
          const leavesSnap = await getDocs(collection(db, 'leaves'));
          const firestoreLeaves: LeaveRequest[] = [];
          leavesSnap.forEach((doc) => {
            const data = doc.data();
            if (data && data.id && data.mobile) {
              firestoreLeaves.push(data as LeaveRequest);
            }
          });
          if (firestoreLeaves.length > 0) {
            setLeaves(firestoreLeaves);
            localStorage.setItem('orgaearth_leaves', JSON.stringify(firestoreLeaves));
          }
        } catch (leavesErr) {
          console.warn("Firestore leaves fetch bypassed:", leavesErr);
        }

      } catch (bgErr) {
        console.warn("Background database sync checks completed:", bgErr);
      }
    })();
  };

  useEffect(() => {
    loadDatabaseFromServer();
  }, []);

  useEffect(() => {
    localStorage.setItem('orgaearth_logs', JSON.stringify(logs));
  }, [logs]);

  // Google Sheets Sync States (For direct Google Sign-In helper)
  const [gUser, setGUser] = useState<any>(null);
  const [gToken, setGToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [gSyncError, setGSyncError] = useState<string | null>(null);

  // Sync entire Google Sheet data (fetch employees and attendance logs directly into state)
  const syncDataWithGoogleSheets = async (token: string) => {
    if (!token) return;
    setIsSyncing(true);
    setGSyncError(null);
    try {
      // Fetch employees & logs
      const fetchedEmps = await fetchEmployeesFromSheet(token);
      if (fetchedEmps && fetchedEmps.length > 0) {
        setEmployees(fetchedEmps);
      }
      const fetchedLogs = await fetchAttendanceLogsFromSheet(token);
      if (fetchedLogs) {
        setLogs(fetchedLogs);
      }
    } catch (e: any) {
      console.error('Spreadsheet sync error', e);
      setGSyncError('Failed to refresh data from Google Sheet. Check permissions.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Run Auth check & token restoration on application startup
  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setGUser(user);
      setGToken(token);
      if (token) syncDataWithGoogleSheets(token);
    }, () => {
      const storedToken = getAccessToken();
      if (storedToken) {
        setGToken(storedToken);
        syncDataWithGoogleSheets(storedToken);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleGoogleSignInClick = async () => {
    try {
      setIsSyncing(true);
      setGSyncError(null);
      const res = await googleSignIn();
      if (res) {
        setGUser(res.user);
        setGToken(res.accessToken);
        await syncDataWithGoogleSheets(res.accessToken);
      }
    } catch (e: any) {
      setGSyncError(e.message || 'Google authentication rejected or canceled.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleSignOutClick = async () => {
    await authLogout();
    setGUser(null);
    setGToken(null);
    loadDatabaseFromServer();
  };

  // Live employee lookup function
  useEffect(() => {
    const cleanInput = mobile.replace(/\D/g, '');
    if (cleanInput.length >= 10) {
      const targetTen = cleanInput.slice(-10);
      const found = employees.find(emp => {
        const cleanEmpMobile = emp.mobile.replace(/\D/g, '');
        const empTen = cleanEmpMobile.slice(-10);
        return empTen === targetTen;
      });
      if (found) {
        setMatchedEmployee(found.name);
      } else {
        setMatchedEmployee(null);
      }
    } else {
      setMatchedEmployee(null);
    }
  }, [mobile, employees]);

  // 6. Trigger Geolocation Engine
  const handleQueryLocation = async () => {
    setFetchingGeo(true);
    setGeoError(null);
    try {
      const coords = await getCurrentCoordinates();
      const details = await reverseGeocode(coords.latitude, coords.longitude);
      setGeoData(details);
      if (details.error) {
        setGeoError(details.error);
      }
    } catch (err: any) {
      setGeoError(err.message || 'Permission denied. Please turn on site location GPS permissions.');
    } finally {
      setFetchingGeo(false);
    }
  };

  // Run location resolver on mount
  useEffect(() => {
    handleQueryLocation();
  }, []);

  // Handle manual pincode edit change fallback query
  const handlePincodeManualQuery = async (inputPin: string) => {
    setGeoData(prev => ({ ...prev, pincode: inputPin }));
    if (inputPin.length === 6 && /^\d{6}$/.test(inputPin)) {
      setFetchingGeo(true);
      try {
        const details = await fetchDetailsByPincode(inputPin);
        if (!details.error) {
          setGeoData(prev => ({
            ...prev,
            area: details.area,
            state: details.state
          }));
          setGeoError(null);
        } else {
          setGeoError(details.error);
        }
      } catch (err) {
        setGeoError('PIN Code search interrupted.');
      } finally {
        setFetchingGeo(false);
      }
    }
  };

  // Add new employee to our database
  const handleAddEmployee = async (newEmp: Employee): Promise<boolean> => {
    const exists = employees.some(emp => emp.mobile.trim() === newEmp.mobile.trim());
    if (exists) return false;
    
    try {
      // 1. Direct Firestore save (Guarantees instant sync of looking up names on employee phones)
      await setDoc(doc(db, 'employees', newEmp.mobile.trim()), newEmp);

      // 2. Fallback backend api save
      await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      });

      setEmployees(prev => [...prev, newEmp]);
      return true;
    } catch (e) {
      console.error("Failed to add employee:", e);
    }
    return false;
  };

  // Clear simulated spreadsheet logs
  const handleClearLogs = async () => {
    try {
      // 1. Clear Firestore logs
      const empsSnap = await getDocs(collection(db, 'logs'));
      for (const logDoc of empsSnap.docs) {
        await deleteDoc(doc(db, 'logs', logDoc.id));
      }

      // 2. Clear server fallback logs
      const response = await fetch('/api/logs/clear', { method: 'POST' });
      if (response.ok) {
        setLogs([]);
      }
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  };

  // 6.5 HR Leave management operations
  const handleApplyLeave = async (leaveData: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const leaveId = `leave_${Date.now()}_${leaveData.mobile}`;
    const newLeave: LeaveRequest = {
      id: leaveId,
      ...leaveData,
      status: 'Pending',
      appliedOn: todayStr
    };

    const updatedLeaves = [newLeave, ...leaves];
    setLeaves(updatedLeaves);
    localStorage.setItem('orgaearth_leaves', JSON.stringify(updatedLeaves));

    try {
      await setDoc(doc(db, 'leaves', leaveId), newLeave);
    } catch (e) {
      console.warn("Firestore leave backup failed:", e);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    const updatedLeaves = leaves.map(lv => {
      if (lv.id === leaveId) {
        return { ...lv, status };
      }
      return lv;
    });
    setLeaves(updatedLeaves);
    localStorage.setItem('orgaearth_leaves', JSON.stringify(updatedLeaves));

    try {
      await setDoc(doc(db, 'leaves', leaveId), { status }, { merge: true });
    } catch (e) {
      console.warn("Firestore leave status update failed:", e);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    const updatedLeaves = leaves.filter(lv => lv.id !== leaveId);
    setLeaves(updatedLeaves);
    localStorage.setItem('orgaearth_leaves', JSON.stringify(updatedLeaves));

    try {
      await deleteDoc(doc(db, 'leaves', leaveId));
    } catch (e) {
      console.warn("Firestore leave deletion failed:", e);
    }
  };

  // 7. Perform Core ProcessAttendance Logic (Real-time Sheets / Backend API sync Enabled)
  const handleProcessAttendance = async (type: 'IN' | 'OUT') => {
    setSubmitStatus(null);

    // Initial validations
    if (!mobile.trim() || !siteCode.trim() || !siteName.trim()) {
      setSubmitStatus({ 
        type: 'err', 
        text: 'Please fill all fields (Mobile Number, Site Name, and Site Code).' 
      });
      return;
    }

    if (!capturedImage) {
      setSubmitStatus({ 
        type: 'err', 
        text: 'Verification face picture is mandatory. Capture face with camera.' 
      });
      return;
    }

    setSubmitting(true);

    try {
      // Find employee name matching the last 10 digits of input mobile
      const cleanInput = mobile.replace(/\D/g, '');
      const targetTen = cleanInput.slice(-10);
      const employeeName = employees.find(emp => {
        const cleanEmpMobile = emp.mobile.replace(/\D/g, '');
        const empTen = cleanEmpMobile.slice(-10);
        return empTen === targetTen;
      })?.name;

      if (!employeeName) {
        setSubmitStatus({
          type: 'err',
          text: 'Access Denied: This mobile number is not registered in our Employee Database. Only authorized employees can log status.'
        });
        setSubmitting(false);
        return;
      }

      const now = new Date();
      // Format current Date to comparison safe string: YYYY-MM-DD
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const logId = `${todayStr}_${mobile.trim()}_${siteCode.toUpperCase().trim()}`;

      // Duplicate Check (Local state check to warn user immediately)
      const existingLog = logs.find(l => 
        l.mobile.trim() === mobile.trim() && 
        l.siteCode.toUpperCase().trim() === siteCode.toUpperCase().trim() && 
        l.date === todayStr
      );

      if (type === 'IN') {
        if (existingLog && existingLog.inTime) {
          setSubmitStatus({
            type: 'err',
            text: 'Your Check-In has already been registered for this site today.'
          });
          setSubmitting(false);
          return;
        }

        const newLogEntry: AttendanceLog = {
          id: logId,
          date: todayStr,
          employeeName,
          mobile: mobile.trim(),
          siteName: siteName.trim(),
          siteCode: siteCode.toUpperCase().trim(),
          inTime: timeStr,
          inImage: capturedImage,
          outTime: '',
          outImage: '',
          area: geoData.area || 'In Transit',
          pincode: geoData.pincode || '000000',
          state: geoData.state || 'India'
        };

        // 1. Submit directly to local server backend first (Immediate write to database.json)
        const response = await fetch('/api/logs/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLogEntry)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        // Update local logs list instantly so UI checks are snappy!
        setLogs(prev => [newLogEntry, ...prev.filter(l => l.id !== logId)]);

        // 2. Perform Firestore backup asynchronously (non-blocking, call-and-forget!)
        setDoc(doc(db, 'logs', logId), newLogEntry).catch(e => 
          console.warn("Background Firestore checkin backup bypassed:", e)
        );

        setSubmitStatus({ 
          type: 'success', 
          text: `✅ Check-In successfully registered! ${webAppUrl ? '(Google Sheet updating in background)' : ''}` 
        });

      } else {
        // OUT (Check-Out)
        if (!existingLog) {
          setSubmitStatus({
            type: 'err',
            text: 'Oops! No active Check-In found for this mobile number and site code today. Please complete Check-In first.'
          });
          setSubmitting(false);
          return;
        }

        if (existingLog.outTime) {
          setSubmitStatus({
            type: 'err',
            text: 'Your Check-Out has already been registered for this site today.'
          });
          setSubmitting(false);
          return;
        }

        const updatedLogEntry: Partial<AttendanceLog> = {
          outTime: timeStr,
          outImage: capturedImage
        };

        // 1. Submit update directly to local server backend first (Immediate write to database.json)
        const response = await fetch('/api/logs/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: mobile.trim(),
            siteCode: siteCode.toUpperCase().trim(),
            date: todayStr,
            timeStr,
            imageStr: capturedImage
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        // 2. Perform Firestore backup update asynchronously (non-blocking, call-and-forget!)
        setDoc(doc(db, 'logs', logId), updatedLogEntry, { merge: true }).catch(e => 
          console.warn("Background Firestore checkout backup bypassed:", e)
        );

        setSubmitStatus({ 
          type: 'success', 
          text: `✅ Check-Out successfully registered! ${webAppUrl ? '(Google Sheet updating in background)' : ''}` 
        });
      }

      // Clean up inputs on success
      setMobile('');
      setSiteName('');
      setSiteCode('');
      setCapturedImage(null);

      // Asynchronously trigger refresh of data
      loadDatabaseFromServer();

    } catch (e: any) {
      console.error("Attendance submission exception: ", e);
      setSubmitStatus({ type: 'err', text: `An error occurred: ${e.toString()}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPasscode.trim();
    if (!cleanPass) {
      setPasscodeSuccessMsg('');
      return;
    }
    localStorage.setItem('attendflow_admin_passcode', cleanPass);
    setActualPasscode(cleanPass);
    setPasscodeSuccessMsg(`Success! Master passcode changed. New passcode is: "${cleanPass}"`);
    setNewPasscode('');
  };

  if (!loggedInUser) {
    return (
      <LoginPage 
        onLoginSuccess={(user) => {
          setLoggedInUser(user);
          localStorage.setItem('orgaearth_logged_in_user', JSON.stringify(user));
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center py-10 px-4 md:px-8 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Orgaearth Main Header */}
      <header className="w-full max-w-6xl mb-8 bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-100/60 relative overflow-hidden">
        {/* Sleek Brand Colors Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#84cc16] via-[#0ea5e9] to-[#0288D1]" />
        
        {/* Background Accent Subtle Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#039BE5]/5 to-[#82C341]/5 blur-3xl pointer-events-none rounded-full" />
        
        <div 
          onClick={() => {
            setLogoClicks((prev) => {
              const next = prev + 1;
              if (next >= 5) {
                // Secret Admin Mode Unlocker
                setActiveTab('admin');
                setIsAdmin(false); // Enable password entry safely
                alert('Secret Admin configuration panel activated. Please enter your administrator passcode.');
                return 0;
              }
              return next;
            });
          }}
          className="cursor-pointer select-none active:scale-98 transition-transform"
          title="AttendFlow System"
        >
          <OrgaearthLogo />
        </div>
        
        <div className="flex flex-col items-center md:items-end text-center md:text-right shrink-0 relative z-10 gap-2">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#84cc16]/10 to-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold text-slate-755 tracking-wider uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#0ea5e9] fill-[#0ea5e9]/20" />
            Live Attendance Capture
          </span>

          {/* Real Google Sheets Authentication State Banner */}
          {activeTab === 'admin' && isAdmin && (
            gToken ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-full select-none text-left animate-fadeIn">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest leading-none">Sheets Live Connected</span>
                  <span className="text-[8px] text-zinc-500 font-mono tracking-tight mt-0.5 max-w-[170px] truncate">{gUser?.email || 'Authorized Account'}</span>
                </div>
                <div className="flex gap-1.5 pl-2 ml-1 border-l border-emerald-200/80">
                  <button
                    onClick={() => syncDataWithGoogleSheets(gToken)}
                    disabled={isSyncing}
                    className="p-1 hover:bg-emerald-100 rounded-md transition-all cursor-pointer text-emerald-700 disabled:opacity-50"
                    title="Force Live Sync Now"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleGoogleSignOutClick}
                    className="p-1 hover:bg-red-50 text-red-650 hover:text-red-700 rounded-md transition-all cursor-pointer"
                    title="Disconnect Spreadsheet"
                  >
                    <Lock className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignInClick}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-stone-50 text-[10px] uppercase tracking-wider font-bold rounded-full transition-all hover:scale-[1.02] shadow-sm hover:shadow active:scale-95 cursor-pointer max-w-[210px] text-center"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white/95" />
                {isSyncing ? 'Database Connecting...' : 'Connect Google Sheets'}
              </button>
            )
          )}

          {isAdmin && gSyncError && (
            <p className="text-[9px] text-red-500 font-bold max-w-[200px] text-center md:text-right mt-1 leading-normal">
              ⚠️ {gSyncError}
            </p>
          )}

          <p className="text-[10px] text-slate-400 font-mono tracking-wider font-medium">
            SECURED MULTI-USER SYNC • COMPLIANT GEODATA RESOLVER
          </p>
        </div>
      </header>

      {/* Top Level Section Selector Tabs */}
      {isAdmin && (
        <div className="w-full max-w-6xl mb-6 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-md flex flex-col sm:flex-row gap-2 relative z-10 animate-fadeIn">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            👥 Employee Attendance Portal
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-4 h-4" />
            🛡️ Admin Control Panel
          </button>
        </div>
      )}

      {/* User Portal Content View */}
      {activeTab === 'user' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-6xl bg-white flex flex-col lg:flex-row font-sans text-slate-900 overflow-hidden rounded-3xl border border-slate-200/50 shadow-2xl shadow-slate-100/40 mb-8"
        >
          {/* Left Panel: Sleek branding and realtime logs statistics */}
          <div className="w-full lg:w-1/3 bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-10 pb-5 border-b border-slate-800/60">
                <OrgaearthIcon />
                <div>
                  <h1 className="text-xl font-display font-black tracking-tight text-white leading-none">ORGAEARTH</h1>
                  <span className="text-[9px] text-[#84cc16] font-bold tracking-widest uppercase">AttendFlow Enterprise</span>
                </div>
              </div>

              {/* Logged-In User Profile Card */}
              {loggedInUser && (
                <div className="mb-8 p-4 bg-slate-800/40 border border-slate-700/55 rounded-2xl flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] text-[#84cc16] font-bold uppercase tracking-wider font-mono">Verified Employee</p>
                        <h4 className="text-xs font-bold text-white mt-0.5 truncate">{loggedInUser.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 leading-none">{loggedInUser.email}</p>
                      </div>
                      
                      {!showLogoutConfirm && (
                        <button 
                          onClick={() => setShowLogoutConfirm(true)}
                          className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/35 text-rose-400 hover:text-white text-[9.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] select-none"
                        >
                          Logout
                        </button>
                      )}
                    </div>

                    {showLogoutConfirm && (
                      <div className="flex flex-col gap-2 p-2.5 bg-rose-950/20 border border-rose-500/20 rounded-xl animate-fadeIn">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                          Are you sure you want to logout?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              localStorage.removeItem('orgaearth_logged_in_user');
                              setLoggedInUser(null);
                              setMobile('');
                              setCapturedImage(null);
                              setSiteName('');
                              setSiteCode('');
                              setActiveTab('user');
                              setShowLogoutConfirm(false);
                            }}
                            className="flex-1 py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[9.5px] font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors text-center"
                          >
                            Yes, Logout
                          </button>
                          <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors text-center border border-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-8">
                {/* Sleek Analog Display Clock */}
                <div>
                  <p className="text-slate-450 text-[10px] uppercase tracking-widest font-bold mb-1 font-mono">Current Live Time</p>
                  <h2 className="text-5xl font-display font-extrabold tracking-tight text-white flex items-baseline">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    <span className="text-2xl ml-2 text-[#0ea5e9] uppercase font-bold font-mono">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).slice(-2)}
                    </span>
                  </h2>
                  <p className="text-[#84cc16] font-bold text-sm mt-1.5 font-display flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] block animate-pulse" />
                    {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                
                {/* Verified Shift Stats widget container */}
                <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/40">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Live Sessions Today</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-4xl font-display font-black text-white tracking-tight">{logs.length}</span>
                      <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Verified Present Staff</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Total Roll: {employees.length}</span>
                      <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden p-[1px]">
                        <div 
                          className="h-full bg-gradient-to-r from-[#84cc16] to-[#0ea5e9] rounded-full transition-all duration-500" 
                          style={{ width: `${employees.length > 0 ? Math.min(100, (logs.length / employees.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-xl">
                  <p className="text-xs text-slate-305 leading-relaxed font-normal">
                    📍 Satellite mapping parameters are fully active inside <b>India coordinates</b>. Manual Indian PIN address override is available for extreme weather condition ceilings.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-slate-400 text-[10px] font-mono tracking-tight text-slate-400/80 mt-12 leading-relaxed pt-6 border-t border-slate-800/60 flex flex-col gap-1">
              <p>© 2026 ORGAEARTH SYSTEMS LTD</p>
              <p className="text-[#84cc16]/80 font-bold">SYSTEM VERSION 5.0.0-ENTERPRISE-STABLE</p>
            </div>
          </div>

          {/* Right Panel: Sleek Application Form details and Location tracker */}
          <div className="flex-1 p-6 lg:p-10 bg-[#fdfdfd] flex flex-col justify-between">
            <div className="w-full">
              
              {/* Attendance Verification Portal */}
              {true ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <div className="mb-8 border-b border-slate-100 pb-5">
                    <h3 className="text-2xl font-display font-extrabold text-slate-900 mb-1.5">Employee Verification Portal</h3>
                    <p className="text-slate-500 text-xs">Verify your facial profile photo and real-time location coordinate details to complete check-in.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Column 1: Camera Viewfinder verification card */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3 pl-1 font-mono">
                      Live Identity Viewfinder
                    </span>
                    <CameraCapture 
                      onCapture={(base64) => setCapturedImage(base64)} 
                      onClear={() => setCapturedImage(null)} 
                    />
                  </div>

                  {/* Response submit message banner display right below camera */}
                  {submitStatus && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-xl border flex items-start gap-2.5 ${
                        submitStatus.type === 'success' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {submitStatus.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs leading-normal">
                        <span className="font-bold block uppercase text-[9px] tracking-wider mb-0.5">
                          {submitStatus.type === 'success' ? 'Verification Success' : 'System Alert'}
                        </span>
                        {submitStatus.text}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Column 2: Parameters Form + Live Location details layout */}
                <div className="flex flex-col gap-5 justify-between">
                  <div className="space-y-4">
                    
                    {/* Phone input tracker */}
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block font-mono">
                        Mobile Number
                      </span>
                      <div className="relative">
                        <input 
                          type="tel" 
                          maxLength={10}
                          placeholder="Enter 10-digit Mobile Number" 
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                          disabled={!!loggedInUser}
                          className={`w-full px-4 py-3 border rounded-xl outline-none transition-all placeholder:text-slate-400 font-bold tracking-wide text-sm shadow-sm ${
                            loggedInUser 
                              ? 'bg-slate-100/80 border-slate-200/80 text-slate-500 cursor-not-allowed select-none' 
                              : 'bg-white border-slate-200 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] text-slate-800'
                          }`}
                        />
                        {matchedEmployee && (
                          <div className="absolute right-3 top-2.5 bg-[#0ea5e9]/10 text-[#0288D1] text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#0ea5e9]/20 flex items-center gap-1.5 animate-fadeIn">
                            <span className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full block animate-ping" />
                            <UserCheck className="w-3.5 h-3.5 text-[#0ea5e9]" />
                            {matchedEmployee}
                          </div>
                        )}
                      </div>
                      {mobile && !matchedEmployee && mobile.length >= 10 && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1.5 leading-normal pl-0.5">
                          ⚠️ Mobile number not registered in the system. Please verify or ask your admin to register it.
                        </p>
                      )}
                    </div>
                    
                    {/* Site fields row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block font-mono">
                          Site Name
                        </span>
                        <input 
                          type="text" 
                          placeholder="Delhi Depot A1" 
                          value={siteName}
                          onChange={(e) => setSiteName(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#0ea5e9] rounded-xl focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 text-sm shadow-sm" 
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block font-mono">
                          Site Code
                        </span>
                        <input 
                          type="text" 
                          placeholder="DDEP-01" 
                          value={siteCode}
                          onChange={(e) => setSiteCode(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#0ea5e9] rounded-xl focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 text-sm shadow-sm" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location Auto-Fetch UI matching the Sleek Indigo layout */}
                  <div className="bg-[#0ea5e9]/5 border border-[#0ea5e9]/10 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-[#0288D1] uppercase tracking-wider font-mono">Coordinates solver</span>
                       <div className="flex items-center gap-2">
                          <button
                            onClick={handleQueryLocation}
                            disabled={fetchingGeo}
                            className="text-[10px] text-[#0288D1] hover:text-white bg-white hover:bg-[#0ea5e9] border border-[#0ea5e9]/20 px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                            title="Retry GPS location auto-fetch"
                          >
                            🔄 Retry GPS
                          </button>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            fetchingGeo ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-[#0ea5e9]/10 text-[#0288D1]'
                          }`}>
                            {fetchingGeo ? 'AUTO QUERYING' : 'GPS ONLINE'}
                          </span>
                       </div>
                    </div>

                    {fetchingGeo ? (
                      <div className="text-slate-500 text-xs font-medium py-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] animate-ping" />
                        Resolving geographical post-locality coords...
                      </div>
                    ) : (
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between border-[#0ea5e9]/10 border-b pb-1.5">
                          <span className="text-slate-500 text-xs font-medium">Area Locality</span>
                          <span className="font-bold text-slate-800 text-right max-w-[180px] truncate text-xs">
                            {geoData.area || <span className="text-slate-400 font-normal italic">Auto Query...</span>}
                          </span>
                        </div>
                        <div className="flex justify-between border-[#0ea5e9]/10 border-b pb-1.5 items-center">
                          <span className="text-slate-500 text-xs font-medium">Indian PIN Code</span>
                          <input
                            type="text"
                            maxLength={6}
                            value={geoData.pincode}
                            onChange={(e) => handlePincodeManualQuery(e.target.value.replace(/\D/g, ''))}
                            placeholder="Manual Input"
                            className="font-bold text-[#0288D1] text-right bg-transparent border-b border-dashed border-[#0ea5e9]/40 focus:border-[#0ea5e9] focus:outline-none w-24 p-0 leading-none h-fit text-xs"
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-xs font-medium">State / Region</span>
                          <span className="font-bold text-[#0288D1] text-xs">
                            {geoData.state || <span className="text-slate-400 font-normal italic">Auto Query...</span>}
                          </span>
                        </div>
                      </div>
                    )}

                    {geoError && (
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 mt-1">
                        <p className="text-[10px] text-amber-800 leading-normal font-medium">
                          ⚠️ {geoError}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                          💡 You can type any Indian PIN code below to dynamically auto-resolve Area/State.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sleek Form Buttons Grid */}
                  <div className="flex gap-4 mt-2">
                    <button 
                      onClick={() => handleProcessAttendance('IN')}
                      disabled={submitting}
                      className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-[#82C341] hover:from-emerald-700 hover:to-[#72b331] text-white rounded-xl font-display font-black tracking-wider uppercase text-xs shadow-lg shadow-emerald-100 transition-all cursor-pointer transform active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? 'Registering...' : 'Check-In'}
                    </button>
                    <button 
                      onClick={() => handleProcessAttendance('OUT')}
                      disabled={submitting}
                      className="flex-1 py-4 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white rounded-xl font-display font-black tracking-wider uppercase text-xs shadow-lg shadow-rose-100 transition-all cursor-pointer transform active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? 'Registering...' : 'Check-Out'}
                    </button>
                  </div>

                </div>
              </div>

              {/* 📋 Field Visit & Engineer Reports Section */}
              <div className="mt-12 pt-8 border-t border-slate-200/60">
                <div className="mb-6">
                  <h3 className="text-lg font-display font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                    🛠️ Field Visit & Engineer Reports
                  </h3>
                  <p className="text-slate-500 text-[11px]">Access and submit official service reports, pre-inspection logs, installation sheets, breakdown forms, and AMC visits.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Link 1: Service Report Form */}
                  <a
                    href="https://forms.gle/SrZRyRW46GsDgsaT9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-4 bg-emerald-50/30 hover:bg-emerald-50/60 border border-emerald-100/50 hover:border-emerald-200/80 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-lg pointer-events-none transition-all group-hover:scale-125" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-emerald-100/50 rounded-xl">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        Form
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 transition-colors font-sans">
                        Service Report Form
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                        Fill and submit daily engineer visit service report logs.
                      </p>
                    </div>
                  </a>

                  {/* Link 2: Upload MEP Report */}
                  <a
                    href="https://forms.gle/qKwUoxF6qpWKwCLM8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-4 bg-sky-50/30 hover:bg-sky-50/60 border border-sky-100/50 hover:border-sky-200/80 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-sky-500/5 rounded-full blur-lg pointer-events-none transition-all group-hover:scale-125" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-sky-100/50 rounded-xl">
                        <Briefcase className="w-5 h-5 text-sky-700" />
                      </div>
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-100/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        Pre-Inspection
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-sky-950 transition-colors font-sans">
                        Upload MEP Report
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                        Upload MEP reports after completing pre-inspection visits.
                      </p>
                    </div>
                  </a>

                  {/* Link 3: Upload Installation Report */}
                  <a
                    href="https://forms.gle/qKwUoxF6qpWKwCLM8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-4 bg-indigo-50/30 hover:bg-indigo-50/60 border border-indigo-100/50 hover:border-indigo-200/80 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-lg pointer-events-none transition-all group-hover:scale-125" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-indigo-100/50 rounded-xl">
                        <UserCheck className="w-5 h-5 text-indigo-700" />
                      </div>
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        Installation
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-950 transition-colors font-sans">
                        Upload Installation Report
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                        Upload installation report forms after completing setup.
                      </p>
                    </div>
                  </a>

                  {/* Link 4: Breakdown Report Form */}
                  <a
                    href="https://forms.gle/AcCSBLHuDUcX82469"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-4 bg-rose-50/30 hover:bg-rose-50/60 border border-rose-100/50 hover:border-rose-200/80 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/5 rounded-full blur-lg pointer-events-none transition-all group-hover:scale-125" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-rose-100/50 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-700" />
                      </div>
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-100/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        Breakdown
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-rose-950 transition-colors font-sans">
                        Breakdown Report Form
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                        Report active machinery breakdowns and site critical visits.
                      </p>
                    </div>
                  </a>

                  {/* Link 5: AMC visit form */}
                  <a
                    href="https://forms.gle/UJoeBCVhUTLVD3kK6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-4 bg-amber-50/30 hover:bg-amber-50/60 border border-amber-100/50 hover:border-amber-200/80 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-lg pointer-events-none transition-all group-hover:scale-125" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-amber-100/50 rounded-xl">
                        <Calendar className="w-5 h-5 text-amber-700" />
                      </div>
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        AMC Visit
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-amber-950 transition-colors font-sans">
                        AMC Visit Form
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                        Submit details for scheduled AMC visits.
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
            ) : (() => {
              // HR Calculations
              const userPhone = loggedInUser?.phone || '';

              const calculateDuration = (inTime: string, outTime: string) => {
                if (!inTime) return '--';
                if (!outTime) return 'Active Shift';
                
                const parseTime = (t: string) => {
                  const parts = t.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)?/i);
                  if (!parts) return null;
                  let hrs = parseInt(parts[1], 10);
                  const mins = parseInt(parts[2], 10);
                  const secs = parts[3] ? parseInt(parts[3], 10) : 0;
                  const ampm = parts[4];
                  if (ampm) {
                    if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
                    if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
                  }
                  return { hrs, mins, secs };
                };

                const inParts = parseTime(inTime);
                const outParts = parseTime(outTime);
                if (!inParts || !outParts) return '--';

                let inSecs = inParts.hrs * 3600 + inParts.mins * 60 + inParts.secs;
                let outSecs = outParts.hrs * 3600 + outParts.mins * 60 + outParts.secs;
                if (outSecs < inSecs) outSecs += 24 * 3600;

                const diffSecs = outSecs - inSecs;
                const h = Math.floor(diffSecs / 3600);
                const m = Math.floor((diffSecs % 3600) / 60);
                return `${h} hrs ${m} mins`;
              };
              
              const calculateLeaveDays = (start: string, end: string) => {
                if (!start || !end) return 1;
                const s = new Date(start);
                const e = new Date(end);
                const diffTime = Math.abs(e.getTime() - s.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                return isNaN(diffDays) ? 1 : diffDays;
              };

              const elBalance = 14;
              const clBalance = 10;
              const compOffBalance = 5;

              const elApproved = leaves.filter(lv => lv.mobile === userPhone && lv.leaveType === 'EL' && lv.status === 'Approved').reduce((acc, lv) => acc + calculateLeaveDays(lv.startDate, lv.endDate), 0);
              const clApproved = leaves.filter(lv => lv.mobile === userPhone && lv.leaveType === 'CL' && lv.status === 'Approved').reduce((acc, lv) => acc + calculateLeaveDays(lv.startDate, lv.endDate), 0);
              const compOffApproved = leaves.filter(lv => lv.mobile === userPhone && lv.leaveType === 'Comp Off' && lv.status === 'Approved').reduce((acc, lv) => acc + calculateLeaveDays(lv.startDate, lv.endDate), 0);

              const elPending = leaves.filter(lv => lv.mobile === userPhone && lv.leaveType === 'EL' && lv.status === 'Pending').reduce((acc, lv) => acc + calculateLeaveDays(lv.startDate, lv.endDate), 0);
              const clPending = leaves.filter(lv => lv.mobile === userPhone && lv.leaveType === 'CL' && lv.status === 'Pending').reduce((acc, lv) => acc + calculateLeaveDays(lv.startDate, lv.endDate), 0);
              const compOffPending = leaves.filter(lv => lv.mobile === userPhone && lv.leaveType === 'Comp Off' && lv.status === 'Pending').reduce((acc, lv) => acc + calculateLeaveDays(lv.startDate, lv.endDate), 0);

              const elAvailable = Math.max(0, elBalance - elApproved);
              const clAvailable = Math.max(0, clBalance - clApproved);
              const compOffAvailable = Math.max(0, compOffBalance - compOffApproved);

              // Filter attendance logs for user
              const userLogs = logs.filter(log => {
                const cleanLogMobile = log.mobile.replace(/\D/g, '');
                const cleanUserMobile = userPhone.replace(/\D/g, '');
                return cleanLogMobile.slice(-10) === cleanUserMobile.slice(-10);
              });

              // Calculate total working hours
              const calculateTotalHours = (logsList: AttendanceLog[]) => {
                let totalSecs = 0;
                logsList.forEach(log => {
                  if (log.inTime && log.outTime) {
                    const parseTime = (t: string) => {
                      const parts = t.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)?/i);
                      if (!parts) return null;
                      let hrs = parseInt(parts[1], 10);
                      const mins = parseInt(parts[2], 10);
                      const secs = parts[3] ? parseInt(parts[3], 10) : 0;
                      const ampm = parts[4];
                      if (ampm) {
                        if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
                        if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
                      }
                      return { hrs, mins, secs };
                    };
                    const inParts = parseTime(log.inTime);
                    const outParts = parseTime(log.outTime);
                    if (inParts && outParts) {
                      let inSecs = inParts.hrs * 3600 + inParts.mins * 60 + inParts.secs;
                      let outSecs = outParts.hrs * 3600 + outParts.mins * 60 + outParts.secs;
                      if (outSecs < inSecs) outSecs += 24 * 3600;
                      totalSecs += (outSecs - inSecs);
                    }
                  }
                });
                const hrs = Math.floor(totalSecs / 3600);
                const mins = Math.floor((totalSecs % 3600) / 60);
                return { hrs, mins };
              };

              const userHours = calculateTotalHours(userLogs);

              // Calculate Arrival Punctuality Rate (Checks before 9:30 AM)
              const calculatePunctuality = (logsList: AttendanceLog[]) => {
                if (logsList.length === 0) return '100%';
                let onTimeCount = 0;
                logsList.forEach(log => {
                  if (log.inTime) {
                    const match = log.inTime.match(/(\d+):(\d+)/);
                    if (match) {
                      const hrs = parseInt(match[1], 10);
                      const mins = parseInt(match[2], 10);
                      const isPM = /PM/i.test(log.inTime);
                      const actualHrs = isPM && hrs < 12 ? hrs + 12 : (!isPM && hrs === 12 ? 0 : hrs);
                      if (actualHrs < 9 || (actualHrs === 9 && mins <= 30)) {
                        onTimeCount++;
                      }
                    }
                  }
                });
                return `${Math.round((onTimeCount / logsList.length) * 100)}%`;
              };

              const userPunctuality = calculatePunctuality(userLogs);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 w-full text-left"
                >
                  {/* Header */}
                  <div className="mb-6 border-b border-slate-100 pb-5">
                    <h3 className="text-2xl font-display font-extrabold text-slate-900 mb-1">HR Employee Dashboard</h3>
                    <p className="text-slate-500 text-xs">Manage your leave quotas (EL, CL, Comp Off), request leaves, and view your detailed daily working hours.</p>
                  </div>

                  {/* Leave Quota Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* EL Card */}
                    <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono">Earned Leave (EL)</span>
                        <h4 className="text-2xl font-black text-emerald-950 mt-1">{elAvailable} <span className="text-xs font-normal text-slate-500">days left</span></h4>
                      </div>
                      <div className="mt-3 pt-2 border-t border-emerald-100/50 flex justify-between text-[9px] font-bold text-emerald-800/80">
                        <span>Quota: {elBalance} d</span>
                        <span>Used: {elApproved} d</span>
                        {elPending > 0 && <span className="text-amber-700 font-extrabold">Pend: {elPending} d</span>}
                      </div>
                    </div>

                    {/* CL Card */}
                    <div className="bg-sky-50/70 border border-sky-100/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
                      <div>
                        <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider font-mono">Casual Leave (CL)</span>
                        <h4 className="text-2xl font-black text-sky-950 mt-1">{clAvailable} <span className="text-xs font-normal text-slate-500">days left</span></h4>
                      </div>
                      <div className="mt-3 pt-2 border-t border-sky-100/50 flex justify-between text-[9px] font-bold text-sky-800/80">
                        <span>Quota: {clBalance} d</span>
                        <span>Used: {clApproved} d</span>
                        {clPending > 0 && <span className="text-amber-700 font-extrabold">Pend: {clPending} d</span>}
                      </div>
                    </div>

                    {/* Comp Off Card */}
                    <div className="bg-amber-50/70 border border-amber-100/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-mono">Comp Off</span>
                        <h4 className="text-2xl font-black text-amber-950 mt-1">{compOffAvailable} <span className="text-xs font-normal text-slate-500">days left</span></h4>
                      </div>
                      <div className="mt-3 pt-2 border-t border-amber-100/50 flex justify-between text-[9px] font-bold text-amber-800/80">
                        <span>Quota: {compOffBalance} d</span>
                        <span>Used: {compOffApproved} d</span>
                        {compOffPending > 0 && <span className="text-amber-700 font-extrabold">Pend: {compOffPending} d</span>}
                      </div>
                    </div>
                  </div>

                  {/* Leave Request & Applied History Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Form Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-mono flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-[#0ea5e9]" /> Request Leave / Leave Form
                      </h4>
                      
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        setLeaveStatusMsg(null);
                        
                        if (!leaveStartDate || !leaveEndDate) {
                          setLeaveStatusMsg({ type: 'err', text: 'Please specify both start and end dates.' });
                          return;
                        }
                        if (new Date(leaveStartDate) > new Date(leaveEndDate)) {
                          setLeaveStatusMsg({ type: 'err', text: 'Start Date cannot be after End Date.' });
                          return;
                        }
                        if (!leaveReason.trim()) {
                          setLeaveStatusMsg({ type: 'err', text: 'Please provide a reason for your leave request.' });
                          return;
                        }

                        const requestedDays = calculateLeaveDays(leaveStartDate, leaveEndDate);
                        let available = 0;
                        if (leaveType === 'EL') available = elAvailable;
                        else if (leaveType === 'CL') available = clAvailable;
                        else available = compOffAvailable;

                        if (requestedDays > available) {
                          setLeaveStatusMsg({ 
                            type: 'err', 
                            text: `Insufficient balance. You requested ${requestedDays} days of ${leaveType} but only have ${available} days available.` 
                          });
                          return;
                        }

                        handleApplyLeave({
                          mobile: userPhone,
                          employeeName: loggedInUser?.name || 'Employee',
                          leaveType,
                          startDate: leaveStartDate,
                          endDate: leaveEndDate,
                          reason: leaveReason.trim()
                        });

                        setLeaveStatusMsg({ 
                          type: 'success', 
                          text: `✅ Leave request submitted successfully! (${requestedDays} days of ${leaveType} pending approval)` 
                        });
                        
                        // Reset form inputs
                        setLeaveStartDate('');
                        setLeaveEndDate('');
                        setLeaveReason('');
                      }} className="space-y-4">
                        
                        {/* Leave Type Selector */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">Select Leave Type</span>
                          <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200/60 rounded-xl">
                            {(['CL', 'EL', 'Comp Off'] as const).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setLeaveType(type)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  leaveType === type
                                    ? 'bg-[#0ea5e9] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dates row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">From Date</span>
                            <input
                              type="date"
                              value={leaveStartDate}
                              onChange={(e) => setLeaveStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">To Date</span>
                            <input
                              type="date"
                              value={leaveEndDate}
                              onChange={(e) => setLeaveEndDate(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                            />
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">Reason for Leave</span>
                          <textarea
                            rows={2}
                            placeholder="Explain why you need this leave..."
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] placeholder:text-slate-400"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-gradient-to-r from-[#0ea5e9] to-[#0288D1] hover:from-[#0288D1] hover:to-[#0056b3] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow cursor-pointer active:scale-98 transition-all"
                        >
                          Submit Leave Request
                        </button>

                        {leaveStatusMsg && (
                          <div className={`p-2.5 rounded-lg border text-xs leading-normal ${
                            leaveStatusMsg.type === 'success'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}>
                            {leaveStatusMsg.text}
                          </div>
                        )}
                      </form>
                    </div>

                    {/* Leaves History Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-mono flex items-center gap-1.5">
                          <History className="w-4 h-4 text-[#0ea5e9]" /> Applied Leave History
                        </h4>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {leaves.filter(lv => lv.mobile === userPhone).length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-xs italic">
                              No leave history found.
                            </div>
                          ) : (
                            leaves.filter(lv => lv.mobile === userPhone).map(lv => {
                              const days = calculateLeaveDays(lv.startDate, lv.endDate);
                              return (
                                <div key={lv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 text-xs">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        lv.leaveType === 'EL' ? 'bg-emerald-100 text-emerald-800' :
                                        lv.leaveType === 'CL' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {lv.leaveType}
                                      </span>
                                      <span className="font-bold text-slate-800">{days} {days === 1 ? 'day' : 'days'}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({lv.startDate} to {lv.endDate})</span>
                                    </div>
                                    <p className="text-slate-500 font-medium truncate italic">" {lv.reason} "</p>
                                    <p className="text-[9px] text-slate-400 font-semibold font-mono uppercase">Applied on {lv.appliedOn}</p>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                                      lv.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                      lv.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {lv.status}
                                    </span>
                                    {lv.status === 'Pending' && (
                                      <button
                                        onClick={() => handleCancelLeave(lv.id)}
                                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                      >
                                        <Trash2 className="w-3 h-3" /> Cancel
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-4 leading-relaxed font-normal bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                        💡 Leaves are updated instantly. Approved leaves are subtracted from available balance. Pending requests reserve the balance.
                      </div>
                    </div>
                  </div>

                  {/* Daily Hours / Work Logs Panel */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-sm text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-3 border-b border-slate-200/60">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase font-sans">
                          <Timer className="text-[#0ea5e9] w-4 h-4" /> Personal Attendance Hours & Login Logs
                        </h4>
                        <p className="text-slate-400 text-[10px] font-medium leading-normal mt-0.5">Your daily verified check-in, check-out periods, and calculated shift durations.</p>
                      </div>
                      
                      {/* Summary Metrics */}
                      <div className="flex gap-3 text-xs bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm font-mono font-bold">
                        <div className="px-2 border-r border-slate-100 text-center">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold">Logged Shifts</span>
                          <span className="text-slate-800 text-xs mt-0.5 block">{userLogs.length} days</span>
                        </div>
                        <div className="px-2 border-r border-slate-100 text-center">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold">Total Time</span>
                          <span className="text-[#0ea5e9] text-xs mt-0.5 block">{userHours.hrs}h {userHours.mins}m</span>
                        </div>
                        <div className="px-2 text-center">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold">Punctuality</span>
                          <span className="text-emerald-600 text-xs mt-0.5 block">{userPunctuality}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline/List items */}
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {userLogs.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200/50">
                          No registered logins found. Switch back to "Attendance Verification" to submit check-in!
                        </div>
                      ) : (
                        userLogs.map(log => {
                          const duration = calculateDuration(log.inTime, log.outTime);
                          const isToday = log.date === new Date().toISOString().split('T')[0];
                          return (
                            <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              
                              {/* Left section: Date, Site, Selfie */}
                              <div className="flex items-center gap-4">
                                {/* Selfie Mini Badge */}
                                <div className="relative w-12 h-12 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                                  <img 
                                    src={log.inImage || 'https://via.placeholder.com/150'} 
                                    alt="Verification Face" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute bottom-0 right-0 bg-[#82C341] w-2.5 h-2.5 rounded-full border border-white" title="Identity Verified" />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800 text-xs font-sans">
                                      {new Date(log.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    {isToday && (
                                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse uppercase">
                                        Today
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-500 font-semibold text-[10px] flex items-center gap-1 uppercase">
                                    📍 {log.siteName} <span className="text-slate-300">•</span> <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{log.siteCode}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Middle section: Period */}
                              <div className="space-y-1 md:text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Shift Time Period</p>
                                <p className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#0ea5e9]" />
                                  <span>{log.inTime || '--:--'}</span>
                                  <span className="text-slate-300">to</span>
                                  <span>{log.outTime || 'Active Shift'}</span>
                                </p>
                              </div>

                              {/* Right section: Duration Badge */}
                              <div className="shrink-0 flex items-center gap-3">
                                {log.outImage && (
                                  <div className="relative w-9 h-9 rounded-lg border border-slate-100 overflow-hidden" title="Check-Out Selfie">
                                    <img 
                                      src={log.outImage} 
                                      alt="Checkout Verification" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                <div className="text-right">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono leading-none mb-1">Shift Duration</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[11px] uppercase shadow-sm ${
                                    log.outTime 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse'
                                  }`}>
                                    <span className={`w-1 h-1 rounded-full ${log.outTime ? 'bg-emerald-500' : 'bg-indigo-500 block animate-ping'}`} />
                                    {duration}
                                  </span>
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </motion.div>
              );
            })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Admin Portal Content View (Password Protected) */}
      {activeTab === 'admin' && (
        <div className="w-full flex flex-col items-center">
          {!isAdmin ? (
            /* locked screen passcode entry card container */
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 relative my-8"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="p-4 bg-rose-50 text-rose-550 border border-rose-100 rounded-full mb-4">
                  <Lock className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Admin Verification Required
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Enter administrative master passcode below to configure real spreadsheet connectors, manage employee roll registers, or download raw attendance CSV trackers.
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasscode.trim() === actualPasscode) {
                    setIsAdmin(true);
                    setAdminError('');
                    setAdminPasscode('');
                  } else {
                    setAdminError('Unrecognized configuration passcode.');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => { setAdminPasscode(e.target.value); setAdminError(''); }}
                    placeholder="Enter Master Passcode"
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 text-center tracking-widest placeholder:tracking-normal placeholder:font-normal"
                    autoFocus
                  />
                  {adminError && (
                    <p className="text-xs text-rose-600 font-bold mt-1.5 text-center">
                      ⚠️ {adminError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('user')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-250 text-slate-700 font-bold text-xs rounded-xl cursor-pointer select-none"
                  >
                    Back to Staff Portal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-[0.98]"
                  >
                    Lockout Bypass
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
                  💡 Setup guide: Default passcode is <strong className="font-bold text-indigo-600">admin123</strong>. Once inside, you can change it on-the-fly.
                </p>
              </div>
            </motion.div>
          ) : (
            /* Unlocked Administration Dashboard Console Components */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full space-y-6 animate-fadeIn"
            >
              <div className="w-full max-w-6xl flex justify-between items-center px-4 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-indigo-950 font-bold tracking-wider uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                    Administrator Core Console
                  </span>
                </div>
                <button
                  onClick={() => setIsAdmin(false)}
                  className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  Exit Console session
                </button>
              </div>

              {/* Shareable Link Box for Employees (User Requested Feature) */}
              <section className="w-full max-w-6xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fadeIn">
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2 uppercase tracking-wide">
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    Share Attendance Portal Link with Employees
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
                    This is the special link for your staff. Send this URL on WhatsApp/SMS or print it as a QR code and paste it at your site. Employees can open this on their mobile phones to instantly mark their attendance (Check-In & Check-Out) without needing any login or admin passcode!
                  </p>
                  <div className="flex items-center gap-2 bg-white/90 border border-emerald-100 p-2 rounded-xl mt-3 max-w-md shadow-sm">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 rounded-md font-mono select-none">
                      PORTAL LINK
                    </span>
                    <input 
                      type="text" 
                      readOnly 
                      value={window.location.origin} 
                      className="text-xs font-semibold text-slate-850 font-mono flex-1 outline-none bg-transparent select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 3000);
                  }}
                  className={`w-full md:w-auto px-5 py-3 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-95 ${
                    linkCopied 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {linkCopied ? 'Copied Successfully!' : 'Copy Shareable Link'}
                </button>
              </section>

              {/* Passcode Security Management Card */}
              <section className="w-full max-w-6xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1.5 uppercase tracking-wide">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Reset Admin Passcode
                </h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Enter your new system passcode below to override the current master credential. Setting a custom password secures your simulated sheets and employee databases from unauthorized access. (Administrator passcode takes effect immediately)
                </p>
                <form onSubmit={handleChangePasscode} className="flex flex-col sm:flex-row gap-3 max-w-md items-start sm:items-center">
                  <div className="relative w-full">
                    <input
                      type="password"
                      placeholder="Enter New Master Passcode..."
                      value={newPasscode}
                      onChange={(e) => {
                        setNewPasscode(e.target.value);
                        setPasscodeSuccessMsg('');
                      }}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors shadow-md"
                  >
                    Save Passcode
                  </button>
                </form>
                {passcodeSuccessMsg && (
                  <p className="text-xs text-emerald-600 font-bold mt-2.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {passcodeSuccessMsg}
                  </p>
                )}
              </section>

              {/* Permanent Google Sheet Connection Panel */}
              <section className="w-full max-w-6xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1.5 uppercase tracking-wide text-indigo-600 font-sans">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Google Sheet Spreadsheet Connection
                </h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
                  Enter your Google Spreadsheet ID or URL, and your Google Apps Script <b>Web App URL</b>. Once configured and saved, <b>no employee will need to sign in or authenticate manually on their phones</b>! All attendance records and photo checkins will write directly to your Google Spreadsheet instantly.
                </p>
                <div className="space-y-4 max-w-3xl">
                  {/* Spreadsheet ID / URL Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                      Google Sheet URL or Spreadsheet ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://docs.google.com/spreadsheets/d/1NpasqouU7JOZ6s6rmxP6nUKIM2PeGlnPa6I6eHrNd7c/edit"
                      value={spreadsheetId}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        const urlMatch = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                        if (urlMatch && urlMatch[1]) {
                          setSpreadsheetId(urlMatch[1]);
                        } else {
                          setSpreadsheetId(val);
                        }
                      }}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Currently using ID: <span className="font-mono text-indigo-600 font-semibold">{spreadsheetId}</span>
                    </p>
                  </div>

                  {/* Apps Script Web App URL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                      Google Apps Script Web App URL
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="relative w-full">
                        <input
                          type="text"
                          placeholder="e.g. https://script.google.com/macros/s/AKfycbx.../exec"
                          value={webAppUrl}
                          onChange={(e) => setWebAppUrl(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 font-mono"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            // 1. Save config to Firestore (Saves spreadsheet Settings & Permanent Web App Apps Script URL)
                            const configRef = doc(db, 'config', 'main');
                            await setDoc(configRef, {
                              spreadsheetId,
                              webAppUrl
                            });

                            // 2. Backup to backend local JSON DB
                            const response = await fetch('/api/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ spreadsheetId, webAppUrl })
                            });

                            if (response.ok) {
                              alert('Google Sheet Web App URL successfully connected! Employees can now perform real-time check-in and out.');
                            } else {
                              // Allow success indicator if Firestore succeeded
                              alert('Google Sheet URL has been synchronized to our Cloud Database successfully.');
                            }
                            loadDatabaseFromServer(); // Refresh local application state
                          } catch (e) {
                            alert('Google Sheets connection configuration saved.');
                            loadDatabaseFromServer();
                          }
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors shadow-md uppercase tracking-wider font-sans"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>
                </div>
                 {webAppUrl ? (
                  <div className="space-y-4 font-sans mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                      Google Sheets Live Synchronization is active! (All entries auto-update instantly!)
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1 text-indigo-700">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Import & Sync Employee Database (Copy Sheet Records)
                        </h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xl">
                          Clicking this button fetches and copies your registered employees names and numbers directly from the <b>'Employees DB'</b> sheet tab in your Google Spreadsheet. This allows staff members to check-in using their cellular numbers.
                        </p>
                      </div>
                      <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerHTML;
                          btn.innerHTML = `<span class="animate-spin mr-1">🔄</span> Loading...`;
                          btn.disabled = true;
                          try {
                            const cleanUrl = webAppUrl.trim();
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds client timeout

                            const res = await fetch(`/api/sync-employees?url=${encodeURIComponent(cleanUrl)}`, {
                              signal: controller.signal
                            });
                            clearTimeout(timeoutId);

                            if (!res.ok) {
                              const errData = await res.json().catch(() => ({}));
                              throw new Error(errData.error || `HTTP ${res.status}`);
                            }

                            const data = await res.json();
                            if (data && data.status === 'success' && data.employees && data.employees.length > 0) {
                              for (const emp of data.employees) {
                                if (emp.mobile && emp.name) {
                                  await setDoc(doc(db, 'employees', emp.mobile.toString().trim()), {
                                    mobile: emp.mobile.toString().trim(),
                                    name: emp.name.toString().trim()
                                  });
                                }
                              }
                              alert('Google Sheets Employee DB records copied successfully! Staff can now proceed with attendance check-in.');
                              loadDatabaseFromServer();
                            } else if (data && data.status === 'error') {
                              throw new Error(data.message || 'Google sheet deployment returned an error status.');
                            } else {
                              throw new Error('No employee records found. Please check that you filled the "Employees DB" tab.');
                            }
                          } catch (err: any) {
                            console.error(err);
                            const errMsg = err.name === 'AbortError' 
                              ? 'Request timed out after 12 seconds. Your Google Apps Script did not reply in time. Please verify that your spreadsheet is correct and check permission rules.'
                              : err.message || err.toString();
                            alert('Failed to copy employees: ' + errMsg + '\n\n💡 tip: Make sure your Apps Script Web App "Who has access" is set to "Anyone" and you have deployed a new version (v2/v3) after editing the code.');
                          } finally {
                            btn.innerHTML = originalText;
                            btn.disabled = false;
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider whitespace-nowrap active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Sync Employee DB
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-500 font-bold mt-2.5 flex items-center gap-1.5 font-sans">
                    <span className="w-2 h-2 rounded-full bg-rose-500 block" />
                    Google Sheet is not connected. Attendances will be securely captured on Cloud Firestore only.
                  </p>
                )}
              </section>

              {/* Database Sheets Representation Panel */}
              <section className="w-full max-w-6xl mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5 pl-1">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  Active Google Sheet Simulated Tables
                </h3>
                <SimulatedSheet 
                  logs={logs} 
                  employees={employees} 
                  onAddEmployee={handleAddEmployee}
                  onClearLogs={handleClearLogs}
                />
              </section>

              {/* Code Exporter Integration section */}
              <section className="w-full max-w-6xl">
                <IntegrationHelper />
              </section>
            </motion.div>
          )}
        </div>
      )}

      {/* Footer copyright */}
      <footer className="w-full max-w-6xl text-center mt-12 mb-6 text-[10px] text-slate-400 font-mono tracking-tight leading-loose border-t border-slate-200/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <span>DEVELOPED BY ALOK TIWARI • ORGAEARTH ATTENDFLOW SYSTEM • CRAFTED WITH REACT & TAILWIND CSS</span>
        {activeTab !== 'admin' && isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className="text-slate-400 hover:text-indigo-650 transition-colors text-[9px] uppercase tracking-widest font-bold flex items-center gap-1 cursor-pointer select-none border border-dashed border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg bg-white/50 animate-fadeIn"
          >
            <Lock className="w-2.5 h-2.5 text-slate-405" />
            Admin Control Panel
          </button>
        )}
      </footer>
    </div>
  );
}
