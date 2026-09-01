/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Database, ListFilter, Trash2, UserPlus, Search, ShieldCheck, FileDown } from 'lucide-react';
import { Employee, AttendanceLog } from '../types';

interface SimulatedSheetProps {
  logs: AttendanceLog[];
  employees: Employee[];
  onAddEmployee: (employee: Employee) => Promise<boolean> | boolean;
  onClearLogs: () => void;
}

export function SimulatedSheet({ logs, employees, onAddEmployee, onClearLogs }: SimulatedSheetProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'employees'>('attendance');
  const [newMobile, setNewMobile] = useState('');
  const [newName, setNewName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: 'success' | 'err'; text: string } | null>(null);
  const [dbSearch, setDbSearch] = useState('');

  const downloadLogsAsExcel = () => {
    if (logs.length === 0) return;
    
    // Add UTF-8 BOM for Microsoft Excel compatibility
    let csvContent = "\uFEFF";
    
    const headers = [
      "Date",
      "Employee Name",
      "Mobile Number",
      "Site Name",
      "Site Code",
      "Check-In Time",
      "Check-In Selfie Status",
      "Check-Out Time",
      "Check-Out Selfie Status",
      "Pincode",
      "Area Address",
      "State"
    ];
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    
    logs.forEach(log => {
      const row = [
        log.date || "",
        log.employeeName || "",
        log.mobile || "",
        log.siteName || "",
        log.siteCode || "",
        log.inTime || "",
        log.inImage ? "Selfie Attached" : "No Selfie",
        log.outTime || "",
        log.outImage ? "Selfie Attached" : "No Selfie",
        log.pincode || "",
        log.area || "",
        log.state || ""
      ];
      csvContent += row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orgaearth_attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateEmployee = async (e: FormEvent) => {
    e.preventDefault();
    setAddMsg(null);
    if (!newMobile.trim() || !newName.trim()) {
      setAddMsg({ type: 'err', text: 'Please fill both name and mobile fields.' });
      return;
    }
    if (!/^\d{10}$/.test(newMobile.trim())) {
      setAddMsg({ type: 'err', text: 'Indian Mobile numbers must be exactly 10 digits.' });
      return;
    }

    const success = await onAddEmployee({
      mobile: newMobile.trim(),
      name: newName.trim(),
    });

    if (success) {
      setAddMsg({ type: 'success', text: `Added ${newName} to Employees DB!` });
      setNewMobile('');
      setNewName('');
    } else {
      setAddMsg({ type: 'err', text: 'This mobile number is already in Employees DB.' });
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(dbSearch.toLowerCase()) || 
    emp.mobile.includes(dbSearch)
  );

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden font-sans">
      {/* Sheet Tabs */}
      <div className="bg-slate-50 border-b border-slate-200/85 px-4 pt-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('attendance'); setAddMsg(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl border-t border-x transition-all duration-150 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-white text-[#0ea5e9] border-slate-200/80 shadow-[0_-2px_6px_rgba(14,165,233,0.04)] font-display'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <ListFilter className="w-4 h-4 text-[#0ea5e9]" />
            Attendance Logs (Sheet: Attendance)
          </button>
          <button
            onClick={() => { setActiveTab('employees'); setAddMsg(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl border-t border-x transition-all duration-150 cursor-pointer ${
              activeTab === 'employees'
                ? 'bg-white text-[#84cc16] border-slate-200/80 shadow-[0_-2px_6px_rgba(132,204,22,0.04)] font-display'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-[#84cc16]" />
            Employees DB (Sheet: Employees DB)
          </button>
        </div>

        {activeTab === 'attendance' && logs.length > 0 && (
          <div className="flex gap-2 mb-2 items-center">
            <button
              onClick={downloadLogsAsExcel}
              className="flex items-center gap-1.5 py-1.5 px-3.5 text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm select-none"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download Excel (CSV)
            </button>
            {showClearConfirm ? (
              <div className="flex items-center gap-2 animate-fadeIn bg-rose-50 border border-rose-100 px-3 py-1 rounded-lg shadow-sm">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-sans">Clear all logs?</span>
                <button
                  onClick={() => {
                    onClearLogs();
                    setShowClearConfirm(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded-md cursor-pointer uppercase tracking-wider select-none transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold rounded-md cursor-pointer border border-slate-200/60 uppercase tracking-wider select-none transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 text-[10px] text-slate-500 hover:text-red-650 font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-slate-200/80 bg-white shadow-sm select-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Logs
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
        {/* TAB 1: ATTENDANCE SHEET */}
        {activeTab === 'attendance' && (
          <div>
            <div className="mb-4 text-xs text-slate-500 leading-relaxed font-medium">
              ⚡ This panel displays the active Google Sheet records in real-time. Each <b>Check-In</b> creates a fresh row, and <b>Check-Out</b> automatically finds and closes the corresponding session.
            </div>

            {logs.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200/60 rounded-2xl bg-slate-50/50">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No active attendance records found today. Complete a Check-In to append the first row!
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-inner bg-slate-50/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider">
                      <th className="p-3.5 pl-4">Date</th>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Mobile</th>
                      <th className="p-3.5">Site (Code)</th>
                      <th className="p-3.5">Check-In</th>
                      <th className="p-3.5">IN Selfie</th>
                      <th className="p-3.5">Check-Out</th>
                      <th className="p-3.5">OUT Selfie</th>
                      <th className="p-3.5 pr-4">Auto Geo Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 bg-white transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-600 font-semibold whitespace-nowrap">{log.date}</td>
                        <td className="p-3.5 font-bold text-slate-800">{log.employeeName}</td>
                        <td className="p-3.5 font-mono text-slate-500 tracking-wide font-medium">{log.mobile}</td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-bold block text-slate-800 text-[11px]">{log.siteName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">Code: {log.siteCode}</span>
                        </td>
                        <td className="p-3.5 text-emerald-600 font-bold font-mono whitespace-nowrap">{log.inTime}</td>
                        <td className="p-3.5">
                          {log.inImage ? (
                            <img
                              src={log.inImage}
                              alt="In Image"
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-150 transition-transform cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-rose-600 font-bold font-mono whitespace-nowrap">
                          {log.outTime || <span className="text-slate-300 italic font-mono">-</span>}
                        </td>
                        <td className="p-3.5">
                          {log.outImage ? (
                            <img
                              src={log.outImage}
                              alt="Out Image"
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-150 transition-transform cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4">
                          {log.pincode ? (
                            <div className="max-w-[170px] leading-snug">
                              <span className="font-extrabold text-[9px] block text-[#0288D1] tracking-wider uppercase font-mono">INDIA, PIN {log.pincode}</span>
                              <span className="text-slate-700 block text-[11px] font-medium truncate">{log.area || 'Unknown Locality'}</span>
                              <span className="text-[10px] text-slate-400 block">{log.state}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium italic">- (GPS Bypass)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EMPLOYEE DB SHEET */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Adding Row Mock Tool */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 h-fit shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 mb-3.5 flex items-center gap-1.5 font-display uppercase tracking-wide">
                <UserPlus className="w-4 h-4 text-[#84cc16]" />
                Add Row to DB Sheet
              </h4>
              <form onSubmit={handleCreateEmployee} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1 font-mono">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-[#84cc16] outline-none bg-white font-mono tracking-wide"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1 font-mono">Employee Name</label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="e.g. Ramesh Kumar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-[#84cc16] outline-none bg-white font-bold text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-[#84cc16] hover:brightness-105 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-[#84cc16]/10 cursor-pointer active:scale-95 tracking-wide uppercase font-display"
                >
                  Append Row
                </button>
              </form>

              {addMsg && (
                <div className={`mt-3 p-3 rounded-xl text-[10px] font-bold leading-normal border ${
                  addMsg.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
                }`}>
                  {addMsg.text}
                </div>
              )}
            </div>

            {/* Existing Records Section */}
            <div className="md:col-span-2">
              <div className="flex gap-2 items-center justify-between mb-4 flex-wrap">
                <h4 className="text-xs font-bold text-slate-800 font-display uppercase tracking-wide">Employee List (Fetched by Mobile in Scripts)</h4>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search mobile/name..."
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    className="pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 focus:border-slate-400 outline-none rounded-lg max-w-[170px] bg-white font-medium"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[260px] border border-slate-200/60 rounded-2xl shadow-inner bg-slate-50/20">
                <table className="w-full text-left border-collapse text-xs bg-white">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 font-mono text-[9px] uppercase tracking-wider">
                      <th className="p-3 pl-4">Mobile Number (Cell A)</th>
                      <th className="p-3 pr-4">FullName Output (Cell B)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.mobile} className="hover:bg-slate-50/40">
                        <td className="p-3 pl-4 font-mono text-slate-600 font-semibold">{emp.mobile}</td>
                        <td className="p-3 pr-4 font-bold text-slate-800">{emp.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
