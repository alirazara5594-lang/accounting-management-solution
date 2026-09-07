export type LicenseModeId = 'trial-90' | 'trial-180' | 'beta-365' | 'licensed';

export interface LicenseInfo {
  mode: LicenseModeId;
  title: string;
  totalDays: number;
  startDate: string;
  expiryDate: string;
  daysRemaining: number;
  elapsedDays: number;
  progressPercent: number;
  isTrial: boolean;
  isExpired: boolean;
  licenseKey: string | null;
  tierName: string;
  badgeLabel: string;
}

export const LICENSE_PRESETS: Record<LicenseModeId, { title: string; totalDays: number; tierName: string; isTrial: boolean }> = {
  'trial-90': {
    title: '90-Day Free Commercial Trial',
    totalDays: 90,
    tierName: '90-Day Standard Evaluation',
    isTrial: true,
  },
  'trial-180': {
    title: '180-Day Extended Commercial Trial',
    totalDays: 180,
    tierName: '180-Day Extended Evaluation',
    isTrial: true,
  },
  'beta-365': {
    title: 'Founding Customer / Beta Partner (1-Year)',
    totalDays: 365,
    tierName: 'Founding Partner Tier (365 Days)',
    isTrial: true,
  },
  'licensed': {
    title: 'Commercial Licensed Edition',
    totalDays: 9999,
    tierName: 'AMS Enterprise Perpetual Edition',
    isTrial: false,
  },
};

const STORAGE_KEYS = {
  MODE: 'ams_license_mode',
  START_DATE: 'ams_license_start_date',
  DURATION: 'ams_license_duration_days',
  KEY: 'ams_license_key',
  TIER: 'ams_license_tier',
};

export function getLicenseInfo(): LicenseInfo {
  try {
    let mode = (localStorage.getItem(STORAGE_KEYS.MODE) as LicenseModeId) || 'trial-90';
    if (!LICENSE_PRESETS[mode]) mode = 'trial-90';

    let startDateStr = localStorage.getItem(STORAGE_KEYS.START_DATE);
    if (!startDateStr) {
      startDateStr = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.START_DATE, startDateStr);
      localStorage.setItem(STORAGE_KEYS.MODE, mode);
    }

    const preset = LICENSE_PRESETS[mode];
    const startDate = new Date(startDateStr);
    const now = new Date();

    // Calculate calendar-based days passed (Day 1 = 90d, Day 2 = 89d, etc.)
    const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const calendarDaysPassed = Math.floor((nowUtc - startUtc) / (1000 * 60 * 60 * 24));
    
    // Also consider exact 24h intervals if time elapsed is greater
    const exactHoursPassed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = Math.max(0, Math.max(calendarDaysPassed, Math.floor(exactHoursPassed)));

    if (mode === 'licensed') {
      const savedKey = localStorage.getItem(STORAGE_KEYS.KEY) || 'AMS-PRO-8894-ENTERPRISE';
      return {
        mode: 'licensed',
        title: preset.title,
        totalDays: 9999,
        startDate: startDateStr,
        expiryDate: 'Perpetual / No Expiry',
        daysRemaining: 9999,
        elapsedDays,
        progressPercent: 100,
        isTrial: false,
        isExpired: false,
        licenseKey: savedKey,
        tierName: preset.tierName,
        badgeLabel: 'Enterprise Licensed',
      };
    }

    const totalDays = preset.totalDays;
    const daysRemaining = Math.max(0, totalDays - elapsedDays);
    const isExpired = daysRemaining <= 0;
    const progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
    const expiryDate = new Date(startDate.getTime() + totalDays * 86400000).toISOString();

    let badgeLabel = `${totalDays}-Day Trial · ${daysRemaining}d left`;
    if (mode === 'beta-365') {
      badgeLabel = `Founding Partner · ${daysRemaining}d left`;
    }

    return {
      mode,
      title: preset.title,
      totalDays,
      startDate: startDateStr,
      expiryDate,
      daysRemaining,
      elapsedDays,
      progressPercent,
      isTrial: true,
      isExpired,
      licenseKey: null,
      tierName: preset.tierName,
      badgeLabel,
    };
  } catch {
    return {
      mode: 'trial-90',
      title: '90-Day Free Commercial Trial',
      totalDays: 90,
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      daysRemaining: 90,
      elapsedDays: 0,
      progressPercent: 0,
      isTrial: true,
      isExpired: false,
      licenseKey: null,
      tierName: '90-Day Standard Evaluation',
      badgeLabel: '90-Day Trial · 90d left',
    };
  }
}

export function setLicenseMode(mode: LicenseModeId, customStartDate?: string): LicenseInfo {
  const preset = LICENSE_PRESETS[mode] || LICENSE_PRESETS['trial-90'];
  localStorage.setItem(STORAGE_KEYS.MODE, mode);
  localStorage.setItem(STORAGE_KEYS.DURATION, String(preset.totalDays));
  localStorage.setItem(STORAGE_KEYS.TIER, preset.tierName);
  
  if (customStartDate) {
    localStorage.setItem(STORAGE_KEYS.START_DATE, customStartDate);
  } else {
    if (!localStorage.getItem(STORAGE_KEYS.START_DATE)) {
      localStorage.setItem(STORAGE_KEYS.START_DATE, new Date().toISOString());
    }
  }

  const updated = getLicenseInfo();
  window.dispatchEvent(new CustomEvent('ams-license-changed', { detail: updated }));
  return updated;
}

export function activateLicenseKey(key: string): { success: boolean; message: string; info: LicenseInfo } {
  const cleanKey = key.trim().toUpperCase();
  if (cleanKey.length < 8) {
    return { success: false, message: 'Invalid License Key format. Key must be at least 8 characters.', info: getLicenseInfo() };
  }

  localStorage.setItem(STORAGE_KEYS.MODE, 'licensed');
  localStorage.setItem(STORAGE_KEYS.KEY, cleanKey);
  localStorage.setItem(STORAGE_KEYS.TIER, 'AMS Enterprise Commercial Edition');
  
  const updated = getLicenseInfo();
  window.dispatchEvent(new CustomEvent('ams-license-changed', { detail: updated }));
  return { success: true, message: 'Enterprise Commercial License activated successfully!', info: updated };
}
