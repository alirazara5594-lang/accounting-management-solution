export interface TaxCodeOption {
  code: string;
  label: string;
  rate: number;
  type: 'goods' | 'services' | 'all' | 'exempt';
  authority: string;
}

export interface RegionTaxConfig {
  id: string;
  name: string;
  taxAuthority: string;
  taxNumberLabel: string;
  taxNumberPlaceholder: string;
  defaultRate: number;
  taxCodes: TaxCodeOption[];
}

export interface CountryTaxStructure {
  code: string;
  name: string;
  currency: string;
  flag: string;
  hasProvinces: boolean;
  provinceLabel: string;
  regions: RegionTaxConfig[];
}

export const GLOBAL_TAX_STRUCTURES: Record<string, CountryTaxStructure> = {
  PK: {
    code: 'PK',
    name: 'Pakistan',
    currency: 'PKR',
    flag: '🇵🇰',
    hasProvinces: true,
    provinceLabel: 'Operating Province / Revenue Authority',
    regions: [
      {
        id: 'punjab',
        name: 'Punjab',
        taxAuthority: 'Punjab Revenue Authority (PRA) & FBR',
        taxNumberLabel: 'NTN / STRN & PRA Reg Number',
        taxNumberPlaceholder: 'e.g. 1234567-8 / PRA-998877',
        defaultRate: 16,
        taxCodes: [
          { code: 'PRA_16', label: 'PRA Punjab Services Standard VAT', rate: 16, type: 'services', authority: 'PRA' },
          { code: 'PRA_IT_5', label: 'PRA IT, Software & Digital Services', rate: 5, type: 'services', authority: 'PRA' },
          { code: 'FBR_18', label: 'FBR Standard GST (Goods)', rate: 18, type: 'goods', authority: 'FBR' },
          { code: 'FBR_WHT_IT_3', label: 'FBR IT Corporate Services WHT', rate: 3, type: 'services', authority: 'FBR' },
          { code: 'FBR_WHT_1', label: 'FBR WHT Active Withholding', rate: 1, type: 'services', authority: 'FBR' },
          { code: 'FBR_IT_EXP_025', label: 'PSEB / IT Export Final Tax', rate: 0.25, type: 'exempt', authority: 'FBR' },
          { code: 'FBR_0', label: 'FBR Zero-Rated Export', rate: 0, type: 'exempt', authority: 'FBR' },
          { code: 'EXEMPT_0', label: 'Tax Exempt / No Tax Supply', rate: 0, type: 'exempt', authority: 'FBR' }
        ]
      },
      {
        id: 'sindh',
        name: 'Sindh',
        taxAuthority: 'Sindh Revenue Board (SRB) & FBR',
        taxNumberLabel: 'NTN / STRN & SRB Reg Number',
        taxNumberPlaceholder: 'e.g. 1234567-8 / SRB-112233',
        defaultRate: 13,
        taxCodes: [
          { code: 'SRB_13', label: 'SRB Sindh Services Standard Tax', rate: 13, type: 'services', authority: 'SRB' },
          { code: 'SRB_IT_5', label: 'SRB IT, Software & Digital Services', rate: 5, type: 'services', authority: 'SRB' },
          { code: 'FBR_18', label: 'FBR Standard GST (Goods)', rate: 18, type: 'goods', authority: 'FBR' },
          { code: 'FBR_WHT_IT_3', label: 'FBR IT Corporate Services WHT', rate: 3, type: 'services', authority: 'FBR' },
          { code: 'FBR_IT_EXP_025', label: 'PSEB / IT Export Final Tax', rate: 0.25, type: 'exempt', authority: 'FBR' },
          { code: 'FBR_0', label: 'FBR Zero-Rated Export', rate: 0, type: 'exempt', authority: 'FBR' },
          { code: 'EXEMPT_0', label: 'Tax Exempt / No Tax Supply', rate: 0, type: 'exempt', authority: 'FBR' }
        ]
      },
      {
        id: 'kpk',
        name: 'Khyber Pakhtunkhwa (KPK)',
        taxAuthority: 'Khyber Pakhtunkhwa Revenue Authority (KPRA) & FBR',
        taxNumberLabel: 'NTN / STRN & KPRA Reg Number',
        taxNumberPlaceholder: 'e.g. 1234567-8 / KPRA-445566',
        defaultRate: 15,
        taxCodes: [
          { code: 'KPRA_15', label: 'KPRA Services Standard Tax', rate: 15, type: 'services', authority: 'KPRA' },
          { code: 'KPRA_IT_5', label: 'KPRA IT, Software & Digital Services', rate: 5, type: 'services', authority: 'KPRA' },
          { code: 'FBR_18', label: 'FBR Standard GST (Goods)', rate: 18, type: 'goods', authority: 'FBR' },
          { code: 'FBR_WHT_IT_3', label: 'FBR IT Corporate Services WHT', rate: 3, type: 'services', authority: 'FBR' },
          { code: 'FBR_IT_EXP_025', label: 'PSEB / IT Export Final Tax', rate: 0.25, type: 'exempt', authority: 'FBR' },
          { code: 'FBR_0', label: 'FBR Zero-Rated Export', rate: 0, type: 'exempt', authority: 'FBR' },
          { code: 'EXEMPT_0', label: 'Tax Exempt / No Tax Supply', rate: 0, type: 'exempt', authority: 'FBR' }
        ]
      },
      {
        id: 'balochistan',
        name: 'Balochistan',
        taxAuthority: 'Balochistan Revenue Authority (BRA) & FBR',
        taxNumberLabel: 'NTN / STRN & BRA Reg Number',
        taxNumberPlaceholder: 'e.g. 1234567-8 / BRA-778899',
        defaultRate: 15,
        taxCodes: [
          { code: 'BRA_15', label: 'BRA Balochistan Services Standard Tax', rate: 15, type: 'services', authority: 'BRA' },
          { code: 'BRA_IT_5', label: 'BRA IT, Software & Digital Services', rate: 5, type: 'services', authority: 'BRA' },
          { code: 'FBR_18', label: 'FBR Standard GST (Goods)', rate: 18, type: 'goods', authority: 'FBR' },
          { code: 'FBR_WHT_IT_3', label: 'FBR IT Corporate Services WHT', rate: 3, type: 'services', authority: 'FBR' },
          { code: 'FBR_IT_EXP_025', label: 'PSEB / IT Export Final Tax', rate: 0.25, type: 'exempt', authority: 'FBR' },
          { code: 'FBR_0', label: 'FBR Zero-Rated Export', rate: 0, type: 'exempt', authority: 'FBR' },
          { code: 'EXEMPT_0', label: 'Tax Exempt / No Tax Supply', rate: 0, type: 'exempt', authority: 'FBR' }
        ]
      },
      {
        id: 'islamabad',
        name: 'Islamabad Capital Territory (ICT)',
        taxAuthority: 'ICT Federal Board of Revenue',
        taxNumberLabel: 'NTN / STRN Number',
        taxNumberPlaceholder: 'e.g. 1234567-8',
        defaultRate: 15,
        taxCodes: [
          { code: 'ICT_15', label: 'ICT Islamabad Services Standard Tax', rate: 15, type: 'services', authority: 'FBR' },
          { code: 'ICT_IT_5', label: 'ICT IT, Software & Digital Services', rate: 5, type: 'services', authority: 'FBR' },
          { code: 'FBR_18', label: 'FBR Standard GST (Goods)', rate: 18, type: 'goods', authority: 'FBR' },
          { code: 'FBR_WHT_IT_3', label: 'FBR IT Corporate Services WHT', rate: 3, type: 'services', authority: 'FBR' },
          { code: 'FBR_IT_EXP_025', label: 'PSEB / IT Export Final Tax', rate: 0.25, type: 'exempt', authority: 'FBR' },
          { code: 'FBR_0', label: 'FBR Zero-Rated Export', rate: 0, type: 'exempt', authority: 'FBR' },
          { code: 'EXEMPT_0', label: 'Tax Exempt / No Tax Supply', rate: 0, type: 'exempt', authority: 'FBR' }
        ]
      }
    ]
  },

  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    flag: '🇺🇸',
    hasProvinces: true,
    provinceLabel: 'Home Operating State',
    regions: [
      {
        id: 'california',
        name: 'California',
        taxAuthority: 'California CDTFA',
        taxNumberLabel: 'Federal EIN & State Tax ID',
        taxNumberPlaceholder: 'e.g. 12-3456789 / CA-998877',
        defaultRate: 7.25,
        taxCodes: [
          { code: 'CA_725', label: 'California State Sales Tax', rate: 7.25, type: 'all', authority: 'CDTFA' },
          { code: 'CA_DISTRICT_95', label: 'CA City & District Surtax', rate: 9.5, type: 'all', authority: 'CDTFA' },
          { code: 'US_RESALE_0', label: 'Resale Certificate / Tax Exempt', rate: 0, type: 'exempt', authority: 'IRS' }
        ]
      },
      {
        id: 'newyork',
        name: 'New York',
        taxAuthority: 'NYS Dept of Taxation & Finance',
        taxNumberLabel: 'Federal EIN & NY Tax ID',
        taxNumberPlaceholder: 'e.g. 12-3456789 / NY-123456',
        defaultRate: 8.875,
        taxCodes: [
          { code: 'NY_NYC_8875', label: 'NYS + NYC Combined Sales Tax', rate: 8.875, type: 'all', authority: 'NY DTF' },
          { code: 'NY_STATE_4', label: 'NYS State Sales Tax Only', rate: 4.0, type: 'all', authority: 'NY DTF' },
          { code: 'US_RESALE_0', label: 'Resale Certificate / Tax Exempt', rate: 0, type: 'exempt', authority: 'IRS' }
        ]
      },
      {
        id: 'texas',
        name: 'Texas',
        taxAuthority: 'Texas Comptroller of Public Accounts',
        taxNumberLabel: 'Federal EIN & Texas Taxpayer ID',
        taxNumberPlaceholder: 'e.g. 12-3456789 / TX-12345678901',
        defaultRate: 8.25,
        taxCodes: [
          { code: 'TX_825', label: 'Texas State + Local Sales Tax', rate: 8.25, type: 'all', authority: 'TX Comptroller' },
          { code: 'TX_STATE_625', label: 'Texas State Rate Only', rate: 6.25, type: 'all', authority: 'TX Comptroller' },
          { code: 'US_RESALE_0', label: 'Resale Certificate / Tax Exempt', rate: 0, type: 'exempt', authority: 'IRS' }
        ]
      },
      {
        id: 'florida',
        name: 'Florida',
        taxAuthority: 'Florida Dept of Revenue',
        taxNumberLabel: 'Federal EIN & FL Tax ID',
        taxNumberPlaceholder: 'e.g. 12-3456789 / FL-789012',
        defaultRate: 7.0,
        taxCodes: [
          { code: 'FL_70', label: 'Florida State + Surtax', rate: 7.0, type: 'all', authority: 'FL DOR' },
          { code: 'FL_STATE_60', label: 'Florida State Rate', rate: 6.0, type: 'all', authority: 'FL DOR' },
          { code: 'US_RESALE_0', label: 'Resale Certificate / Tax Exempt', rate: 0, type: 'exempt', authority: 'IRS' }
        ]
      },
      {
        id: 'other_us',
        name: 'Other US States (Standard Nexus)',
        taxAuthority: 'State Department of Revenue',
        taxNumberLabel: 'Federal EIN',
        taxNumberPlaceholder: 'e.g. 12-3456789',
        defaultRate: 6.0,
        taxCodes: [
          { code: 'US_STD_6', label: 'State Sales Tax', rate: 6.0, type: 'all', authority: 'State DOR' },
          { code: 'US_RESALE_0', label: 'Resale Certificate / Tax Exempt', rate: 0, type: 'exempt', authority: 'IRS' }
        ]
      }
    ]
  },

  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    flag: '🇨🇦',
    hasProvinces: true,
    provinceLabel: 'Operating Province (CRA)',
    regions: [
      {
        id: 'ontario',
        name: 'Ontario',
        taxAuthority: 'Canada Revenue Agency (CRA)',
        taxNumberLabel: 'CRA 9-Digit Business Number (BN / HST)',
        taxNumberPlaceholder: 'e.g. 123456789 RT0001',
        defaultRate: 13,
        taxCodes: [
          { code: 'ON_HST_13', label: 'Ontario HST (Harmonized)', rate: 13, type: 'all', authority: 'CRA' },
          { code: 'CA_EXEMPT_0', label: 'Zero-Rated / Exempt', rate: 0, type: 'exempt', authority: 'CRA' }
        ]
      },
      {
        id: 'bc',
        name: 'British Columbia',
        taxAuthority: 'CRA & BC Ministry of Finance',
        taxNumberLabel: 'CRA BN & BC PST Number',
        taxNumberPlaceholder: 'e.g. 123456789 RT0001 / PST-1234-5678',
        defaultRate: 12,
        taxCodes: [
          { code: 'BC_COMBINED_12', label: 'BC GST 5% + PST 7% (12%)', rate: 12, type: 'all', authority: 'CRA/BC' },
          { code: 'CA_GST_5', label: 'Federal GST Only (5%)', rate: 5, type: 'all', authority: 'CRA' },
          { code: 'CA_EXEMPT_0', label: 'Zero-Rated / Exempt', rate: 0, type: 'exempt', authority: 'CRA' }
        ]
      },
      {
        id: 'quebec',
        name: 'Quebec',
        taxAuthority: 'Revenu Québec & CRA',
        taxNumberLabel: 'NEQ & QST Registration',
        taxNumberPlaceholder: 'e.g. 1234567890 / 1234567890 TQ0001',
        defaultRate: 14.975,
        taxCodes: [
          { code: 'QC_COMBINED_14975', label: 'Quebec GST 5% + QST 9.975%', rate: 14.975, type: 'all', authority: 'Revenu Québec' },
          { code: 'CA_GST_5', label: 'Federal GST Only (5%)', rate: 5, type: 'all', authority: 'CRA' },
          { code: 'CA_EXEMPT_0', label: 'Zero-Rated / Exempt', rate: 0, type: 'exempt', authority: 'CRA' }
        ]
      },
      {
        id: 'alberta',
        name: 'Alberta',
        taxAuthority: 'Canada Revenue Agency (CRA)',
        taxNumberLabel: 'CRA 9-Digit Business Number (BN / GST)',
        taxNumberPlaceholder: 'e.g. 123456789 RT0001',
        defaultRate: 5,
        taxCodes: [
          { code: 'CA_GST_5', label: 'Alberta Federal GST (5%)', rate: 5, type: 'all', authority: 'CRA' },
          { code: 'CA_EXEMPT_0', label: 'Zero-Rated / Exempt', rate: 0, type: 'exempt', authority: 'CRA' }
        ]
      },
      {
        id: 'atlantic',
        name: 'Atlantic Provinces (NS / NB / NL / PEI)',
        taxAuthority: 'Canada Revenue Agency (CRA)',
        taxNumberLabel: 'CRA Business Number (BN / HST)',
        taxNumberPlaceholder: 'e.g. 123456789 RT0001',
        defaultRate: 15,
        taxCodes: [
          { code: 'ATL_HST_15', label: 'Atlantic HST (Harmonized)', rate: 15, type: 'all', authority: 'CRA' },
          { code: 'CA_EXEMPT_0', label: 'Zero-Rated / Exempt', rate: 0, type: 'exempt', authority: 'CRA' }
        ]
      }
    ]
  },

  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    flag: '🇸🇦',
    hasProvinces: false,
    provinceLabel: 'National ZATCA Regime',
    regions: [
      {
        id: 'national',
        name: 'Kingdom of Saudi Arabia (ZATCA Fatoora)',
        taxAuthority: 'Zakat, Tax and Customs Authority (ZATCA)',
        taxNumberLabel: '15-Digit ZATCA VAT / TIN Number',
        taxNumberPlaceholder: 'e.g. 300123456700003',
        defaultRate: 15,
        taxCodes: [
          { code: 'ZATCA_15', label: 'ZATCA Standard VAT (15%)', rate: 15, type: 'all', authority: 'ZATCA' },
          { code: 'ZATCA_0', label: 'ZATCA Zero-Rated (0%)', rate: 0, type: 'exempt', authority: 'ZATCA' },
          { code: 'ZATCA_EXEMPT_0', label: 'ZATCA Exempt Supply (0%)', rate: 0, type: 'exempt', authority: 'ZATCA' }
        ]
      }
    ]
  },

  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    flag: '🇦🇪',
    hasProvinces: false,
    provinceLabel: 'National FTA Regime',
    regions: [
      {
        id: 'national',
        name: 'United Arab Emirates (FTA)',
        taxAuthority: 'Federal Tax Authority (FTA)',
        taxNumberLabel: '15-Digit FTA Tax Registration Number (TRN)',
        taxNumberPlaceholder: 'e.g. 100123456700003',
        defaultRate: 5,
        taxCodes: [
          { code: 'FTA_5', label: 'FTA Standard VAT (5%)', rate: 5, type: 'all', authority: 'FTA' },
          { code: 'FTA_FREEZONE_0', label: 'Designated Free Zone (0%)', rate: 0, type: 'exempt', authority: 'FTA' },
          { code: 'FTA_EXPORT_0', label: 'Zero-Rated Export (0%)', rate: 0, type: 'exempt', authority: 'FTA' },
          { code: 'FTA_EXEMPT_0', label: 'Exempt Supply (0%)', rate: 0, type: 'exempt', authority: 'FTA' }
        ]
      }
    ]
  },

  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    flag: '🇬🇧',
    hasProvinces: false,
    provinceLabel: 'HMRC Making Tax Digital',
    regions: [
      {
        id: 'national',
        name: 'United Kingdom (HMRC MTD)',
        taxAuthority: 'HM Revenue & Customs (HMRC)',
        taxNumberLabel: '9-Digit HMRC VAT Registration Number',
        taxNumberPlaceholder: 'e.g. GB 123 4567 89',
        defaultRate: 20,
        taxCodes: [
          { code: 'HMRC_20', label: 'HMRC Standard VAT (20%)', rate: 20, type: 'all', authority: 'HMRC' },
          { code: 'HMRC_5', label: 'HMRC Reduced Rate (5%)', rate: 5, type: 'all', authority: 'HMRC' },
          { code: 'HMRC_0', label: 'HMRC Zero-Rated (0%)', rate: 0, type: 'exempt', authority: 'HMRC' },
          { code: 'HMRC_REVERSE_0', label: 'Reverse Charge B2B (0%)', rate: 0, type: 'exempt', authority: 'HMRC' }
        ]
      }
    ]
  },

  DE: {
    code: 'DE',
    name: 'Germany / European Union',
    currency: 'EUR',
    flag: '🇩🇪',
    hasProvinces: false,
    provinceLabel: 'EU VAT / MwSt System',
    regions: [
      {
        id: 'national',
        name: 'Germany (MwSt / USt)',
        taxAuthority: 'Bundeszentralamt für Steuern (BZSt)',
        taxNumberLabel: 'USt-IdNr / Steuernummer',
        taxNumberPlaceholder: 'e.g. DE 123456789',
        defaultRate: 19,
        taxCodes: [
          { code: 'EU_19', label: 'Standard VAT MwSt (19%)', rate: 19, type: 'all', authority: 'BZSt' },
          { code: 'EU_7', label: 'Reduced Rate MwSt (7%)', rate: 7, type: 'all', authority: 'BZSt' },
          { code: 'EU_REVERSE_0', label: 'Intra-Community Reverse Charge (0%)', rate: 0, type: 'exempt', authority: 'EU VAT' },
          { code: 'EU_EXPORT_0', label: 'Export to Non-EU (0%)', rate: 0, type: 'exempt', authority: 'EU VAT' }
        ]
      }
    ]
  },

  EU: {
    code: 'EU',
    name: 'European Union (Cross-Border)',
    currency: 'EUR',
    flag: '🇪🇺',
    hasProvinces: false,
    provinceLabel: 'EU One-Stop-Shop (OSS)',
    regions: [
      {
        id: 'national',
        name: 'European Union Member States',
        taxAuthority: 'European Commission VAT Directive',
        taxNumberLabel: 'EU VIES VAT Registration ID',
        taxNumberPlaceholder: 'e.g. FR12345678901',
        defaultRate: 21,
        taxCodes: [
          { code: 'EU_STD_21', label: 'EU Standard VAT (21%)', rate: 21, type: 'all', authority: 'EU VAT' },
          { code: 'EU_REVERSE_0', label: 'Intra-Community Reverse Charge (0%)', rate: 0, type: 'exempt', authority: 'EU VAT' },
          { code: 'EU_EXEMPT_0', label: 'Zero-Rated / Exempt (0%)', rate: 0, type: 'exempt', authority: 'EU VAT' }
        ]
      }
    ]
  }
};

/**
 * Returns the active localized tax codes for the currently configured company
 */
export function getActiveTaxCodes(): TaxCodeOption[] {
  const countryCode = localStorage.getItem('onboarding_country') || 'PK';
  const regionId = localStorage.getItem('onboarding_region_id') || 'punjab';
  const structure = GLOBAL_TAX_STRUCTURES[countryCode] || GLOBAL_TAX_STRUCTURES.PK;
  const region = structure.regions.find(r => r.id === regionId) || structure.regions[0];
  const regionDefaults = region?.taxCodes || [];

  let savedCodes: TaxCodeOption[] = [];
  try {
    const raw = localStorage.getItem('onboarding_active_tax_codes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedCodes = parsed;
      }
    }
  } catch {}

  // Merge region defaults with saved codes so newly supported rates (like IT Tax 5%) are never lost
  const codeMap = new Map<string, TaxCodeOption>();
  for (const c of regionDefaults) {
    codeMap.set(c.code, c);
  }
  for (const c of savedCodes) {
    codeMap.set(c.code, c);
  }

  const codes = Array.from(codeMap.values());

  // Ensure 'No Tax (0%)' is always an available option
  const hasZero = codes.some(c => c.rate === 0);
  if (!hasZero) {
    return [
      { code: 'NO_TAX_0', label: 'No Tax / Exempt (0%)', rate: 0, type: 'exempt', authority: 'None' },
      ...codes
    ];
  }

  return codes;
}

/**
 * Returns the default standard tax percentage for the active company
 */
export function getDefaultTaxPercentage(itemType: 'goods' | 'services' = 'goods'): number {
  const codes = getActiveTaxCodes();
  const match = codes.find(c => c.type === itemType || c.type === 'all');
  return match ? match.rate : (codes[0]?.rate ?? 0);
}
