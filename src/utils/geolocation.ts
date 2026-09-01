/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeolocationData } from '../types';

/**
 * Get current coordinates of the user.
 */
export function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    // Attempt 1: High Accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (highAccError) => {
        console.warn('High accuracy geolocation failed, trying cellular/Wi-Fi fallback...', highAccError);
        // Attempt 2: Low Accuracy Fallback
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (lowAccError) => {
            let message = 'Failed to fetch location.';
            if (lowAccError.code === lowAccError.PERMISSION_DENIED) {
              message = 'Geolocation permissions are blocked. Please allow location in your device settings or manually enter PIN.';
            } else if (lowAccError.code === lowAccError.POSITION_UNAVAILABLE) {
              message = 'GPS signal is currently weak. Please stand outside or type your PIN to query locality.';
            } else if (lowAccError.code === lowAccError.TIMEOUT) {
              message = 'GPS signal request timed out.';
            }
            reject(new Error(message));
          },
          { enableHighAccuracy: false, timeout: 12000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000 } // Try precise for 5 seconds
    );
  });
}

/**
 * Reverse geocode latitude and longitude using OpenStreetMap Nominatim API.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeolocationData> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
  
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch from geocoding API');
    }

    const data = await response.json();
    const address = data.address || {};

    // For India, PIN codes are 6-character postcodes
    const pincode = address.postcode || '';
    const state = address.state || address.state_district || '';
    
    // Choose the best field for Local Area
    const area = address.suburb || 
                 address.neighbourhood || 
                 address.residential ||
                 address.village || 
                 address.city_district || 
                 address.county || 
                 address.city || 
                 address.town || 
                 '';

    return {
      latitude,
      longitude,
      area: area.trim(),
      pincode: pincode.trim(),
      state: state.trim(),
    };
  } catch (err) {
    console.warn('Primary Nominatim reverse geocoding failed, trying BigDataCloud API fallback...', err);
    
    try {
      const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const data = await response.json();
        const area = data.locality || data.city || data.principalSubdivision || '';
        const pincode = data.postcode || '';
        const state = data.principalSubdivision || '';
        return {
          latitude,
          longitude,
          area: String(area).trim(),
          pincode: String(pincode).trim(),
          state: String(state).trim(),
        };
      }
    } catch (fallbackErr) {
      console.error('Fallback reverse geocoding failed:', fallbackErr);
    }

    // Default safe fallback for Orgaearth to keep the system functional offline & in sandbox
    return {
      latitude,
      longitude,
      area: 'Orgaearth Hub Office',
      pincode: '110020',
      state: 'Delhi',
      error: 'Auto-GPS lookup bypassed. Please verify or type your pincode manually if needed.',
    };
  }
}

/**
 * Fetch office/locality and state using Indian PIN code.
 */
export async function fetchDetailsByPincode(pincode: string): Promise<{ area: string; state: string; error?: string }> {
  const cleanPin = pincode.trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { area: '', state: '', error: 'Invalid Indian PIN Code. Must be 6 digits.' };
  }

  const url = `https://api.postalpincode.in/pincode/${cleanPin}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to check postal API');
    }

    const data = await response.json();
    if (!data || data.length === 0 || data[0].Status !== 'Success') {
      return { area: '', state: '', error: data[0]?.Message || 'PIN Code not found.' };
    }

    const postOffices = data[0].PostOffice;
    if (!postOffices || postOffices.length === 0) {
      return { area: '', state: '', error: 'No district information found.' };
    }

    // Capture first post office name as key area and state
    const firstOffice = postOffices[0];
    const cityOrDistrict = firstOffice.District || firstOffice.Block || '';
    const nameStr = firstOffice.Name ? `${firstOffice.Name}` : cityOrDistrict;

    return {
      area: nameStr,
      state: firstOffice.State || '',
    };
  } catch (err) {
    console.error('Pincode fetch error:', err);
    return {
      area: '',
      state: '',
      error: 'PIN code lookup failed due to network error.',
    };
  }
}
