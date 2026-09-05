export const FAA_REGISTRY_SOURCE_URL =
  'https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download/index.cfm';
export const FAA_N_NUMBER_INQUIRY_URL =
  'https://registry.faa.gov/aircraftinquiry/search/nnumberinquiry';

export type RegistryAircraft = {
  nNumber: string;
  serialNumber: string | null;
  yearManufactured: number | null;
  manufacturer: string | null;
  model: string | null;
  aircraftType: string | null;
  engineManufacturer: string | null;
  engineModel: string | null;
  engineType: string | null;
  engineCount: number | null;
  tcds: string | null;
  registrationStatus: { code: string; label: string } | null;
  certificateIssueDate: string | null;
  airworthinessDate: string | null;
  expirationDate: string | null;
  airworthiness: {
    classificationCode: string;
    classification: string;
    operationCodes: string[];
  } | null;
  modeSCodeHex: string | null;
};

export type RegistryManifest = {
  schemaVersion: 1;
  datasetId: string;
  sourceUrl: string;
  sourceSha256: string;
  upstreamLastModified: string | null;
  generatedAt: string;
  recordCount: number;
  shardCount: number;
  canaryNNumber: string;
  shards: Record<string, { sha256: string; recordCount: number; bytes: number }>;
};

export type RegistryLookupResponse = {
  aircraft: RegistryAircraft;
  source: {
    publisher: 'Federal Aviation Administration';
    sourceUrl: string;
    inquiryUrl: string;
    generatedAt: string;
    upstreamLastModified: string | null;
  };
};

const VALID_N_NUMBER = /^N?[1-9][0-9]{0,4}[A-HJ-NP-Z]{0,2}$/i;

export function normalizeNNumber(value: string) {
  const compact = value.trim().replace(/[\s-]/g, '').toUpperCase();
  if (!VALID_N_NUMBER.test(compact)) return null;
  return compact.startsWith('N') ? compact : `N${compact}`;
}

export function registryShardKey(nNumber: string) {
  const normalized = normalizeNNumber(nNumber);
  if (!normalized) return null;
  return normalized.slice(1, 3).padEnd(2, '_');
}

export const registryAutofillFields: Array<{
  formField: string;
  label: string;
  registryValue: (aircraft: RegistryAircraft) => string;
}> = [
  { formField: 'registration', label: 'Registration mark', registryValue: (r) => r.nNumber },
  { formField: 'builder', label: 'Manufacturer or builder', registryValue: (r) => r.manufacturer ?? '' },
  { formField: 'model', label: 'Model designation', registryValue: (r) => r.model ?? '' },
  { formField: 'year', label: 'Year of manufacture', registryValue: (r) => r.yearManufactured?.toString() ?? '' },
  { formField: 'serial', label: 'Aircraft serial number', registryValue: (r) => r.serialNumber ?? '' },
  { formField: 'engineBuilder', label: 'Engine manufacturer or builder', registryValue: (r) => r.engineManufacturer ?? '' },
  { formField: 'engineModel', label: 'Engine model', registryValue: (r) => r.engineModel ?? '' },
  { formField: 'engineCount', label: 'Number of engines', registryValue: (r) => r.engineCount?.toString() ?? '' },
  { formField: 'tcds', label: 'Aircraft specification or TCDS', registryValue: (r) => r.tcds ?? '' },
];

export function findRegistryAircraft(records: RegistryAircraft[], nNumber: string) {
  let low = 0;
  let high = records.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = records[middle]?.nNumber ?? '';
    if (candidate === nNumber) return records[middle];
    if (candidate < nNumber) low = middle + 1;
    else high = middle - 1;
  }
  return null;
}
