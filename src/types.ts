/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  mobile: string;
  name: string;
}

export interface AttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  employeeName: string;
  mobile: string;
  siteName: string;
  siteCode: string;
  inTime: string;
  inImage: string;
  outTime: string;
  outImage: string;
  area: string;
  pincode: string;
  state: string;
}

export interface LeaveRequest {
  id: string;
  mobile: string;
  employeeName: string;
  leaveType: 'EL' | 'CL' | 'Comp Off';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string; // YYYY-MM-DD
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  area: string;
  pincode: string;
  state: string;
  error?: string;
}
