import crypto from 'crypto';
import { config } from './config';

const API_BASE = `${config.SUPABASE_API_URL.replace(/\/$/, '')}/v1`;
let cachedOrgId: string | null = config.SUPABASE_ORG_ID || null;

export type SupabaseStartupStatus = 'provisioning' | 'active' | 'error';

export interface SupabaseStartupSecrets {
  enabled: boolean;
  status: SupabaseStartupStatus;
  startupId: string;
  startupRef: string;
  region: string;
  restUrl: string;
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  dbPassword: string;
  createdAt: string;
  notes?: string[];
}

export interface SupabaseStartupPublic {
  enabled: boolean;
  status: SupabaseStartupStatus;
  startupId: string;
  startupRef: string;
  region: string;
  restUrl: string;
  apiUrl: string;
  anonKey: string;
  createdAt: string;
  notes?: string[];
}

export function isSupabaseConfigured(): boolean {
  return config.hasSupabaseManagement();
}

export function sanitizeSupabaseMetadata(
  metadata: SupabaseStartupSecrets | null | undefined
): SupabaseStartupPublic | null {
  if (!metadata) return null;
  return {
    enabled: metadata.enabled,
    status: metadata.status,
    startupId: metadata.startupId,
    startupRef: metadata.startupRef,
    region: metadata.region,
    restUrl: metadata.restUrl,
    apiUrl: metadata.apiUrl,
    anonKey: metadata.anonKey,
    createdAt: metadata.createdAt,
    notes: metadata.notes
  };
}

export async function provisionSupabaseStartup(options: {
  startupName: string;
  startupId: string;
}): Promise<SupabaseStartupSecrets> {
  if (!config.hasSupabaseManagement()) {
    throw new Error('Supabase management API is not configured.');
  }

  const password = generateSecurePassword();
  const name = buildStartupName(options.startupName, options.startupId);
  const organizationId = await resolveOrganizationId();

  const createResponse = await managementRequest('/startups', {
    method: 'POST',
    body: JSON.stringify({
      organization_id: organizationId,
      name,
      db_password: password,
      region: config.SUPABASE_DEFAULT_REGION,
      plan: config.SUPABASE_DEFAULT_PLAN
    })
  });

  const createdStartup = (await createResponse.json()) as unknown;
  const startupRef = resolveStartupRef(createdStartup);
  const startupId = resolveStartupId(createdStartup);

  if (!startupRef || !startupId) {
    throw new Error('Failed to determine Supabase startup reference.');
  }

  const result: SupabaseStartupSecrets = {
    enabled: true,
    status: 'provisioning',
    startupId,
    startupRef,
    region: config.SUPABASE_DEFAULT_REGION,
    restUrl: buildRestUrl(startupRef),
    apiUrl: `${buildRestUrl(startupRef)}/rest/v1`,
    anonKey: '',
    serviceRoleKey: '',
    dbPassword: password,
    createdAt: new Date().toISOString(),
    notes: [`Created Supabase startup ${startupRef}`]
  };

  await waitForStartupActive(startupRef, result);
  await populateApiKeys(startupRef, result);

  result.status = 'active';
  result.notes?.push('Supabase startup is active');

  return result;
}

export async function executeSupabaseSql(options: {
  startupRef: string;
  sql: string;
}): Promise<string> {
  const response = await managementRequest(`/startups/${options.startupRef}/sql`, {
    method: 'POST',
    body: JSON.stringify({
      query: options.sql
    })
  });

  const text = await response.text();
  return text;
}

async function resolveOrganizationId(): Promise<string> {
  if (cachedOrgId) {
    return cachedOrgId;
  }

  const response = await managementRequest('/organizations');
  const payload = (await response.json()) as unknown;
  const orgId = extractOrganizationId(payload);

  if (!orgId) {
    throw new Error(
      'Supabase organization ID could not be determined. Set SUPABASE_ORG_ID or ensure the API key has access to at least one organization.'
    );
  }

  cachedOrgId = orgId;
  return orgId;
}

function generateSecurePassword(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function buildStartupName(baseName: string, startupId: string): string {
  const sanitized = baseName
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 24);

  const suffix = startupId.replace(/-/g, '').slice(0, 6);
  return `${sanitized || 'ai-startup'}-${suffix}`;
}

async function waitForStartupActive(startupRef: string, result: SupabaseStartupSecrets) {
  const timeoutMs = 2 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const statusResponse = await managementRequest(`/startups/${startupRef}`);
    const payload = (await statusResponse.json()) as unknown;
    const status = resolveStartupStatus(payload);

    result.notes?.push(`Status check: ${status}`);

    if (status === 'ACTIVE') {
      return;
    }

    await delay(5000);
  }

  throw new Error('Timed out waiting for Supabase startup to become active.');
}

async function populateApiKeys(startupRef: string, result: SupabaseStartupSecrets) {
  const response = await managementRequest(`/startups/${startupRef}/api-keys`);
  const payload = (await response.json()) as unknown;

  const anonKey = extractApiKey(payload, 'anon');
  const serviceKey = extractApiKey(payload, 'service_role');

  if (!anonKey || !serviceKey) {
    throw new Error('Failed to retrieve Supabase API keys.');
  }

  result.anonKey = anonKey;
  result.serviceRoleKey = serviceKey;
}

function extractApiKey(payload: unknown, desired: 'anon' | 'service_role'): string | null {
  const record = asRecord(payload);
  if (!record) return null;

  const candidates = ['items', 'keys', 'api_keys', 'apiKeys'] as const;
  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (const entry of value) {
        const entryRecord = asRecord(entry);
        if (!entryRecord) continue;
        const identity = pickString(entryRecord, ['name', 'role', 'api_key_name']);
        if (identity === desired || (desired === 'anon' && identity === 'anon_key')) {
          const apiKey = entryRecord['api_key'];
          if (typeof apiKey === 'string') {
            return apiKey;
          }
        }
      }
    }
  }

  if (desired === 'anon') {
    const fallback = record['anon_key'];
    return typeof fallback === 'string' ? fallback : null;
  }
  if (desired === 'service_role') {
    const fallback = record['service_role_key'];
    return typeof fallback === 'string' ? fallback : null;
  }

  return null;
}

function extractOrganizationId(payload: unknown): string | null {
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const entryRecord = asRecord(entry);
      const id = entryRecord ? pickString(entryRecord, ['id', 'organization_id']) : null;
      if (id) {
        return id;
      }
    }
  }

  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  if (typeof record['id'] === 'string') {
    return record['id'];
  }

  const collections = ['organizations', 'items', 'data'] as const;
  for (const key of collections) {
    const value = record[key];
    if (Array.isArray(value)) {
      const id = extractOrganizationId(value);
      if (id) {
        return id;
      }
    }
  }

  const nested = asRecord(record['organization']);
  if (nested && typeof nested['id'] === 'string') {
    return nested['id'];
  }

  return null;
}

async function managementRequest(pathname: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${config.SUPABASE_ACCESS_TOKEN}`);
  headers.set('apikey', config.SUPABASE_ACCESS_TOKEN);
  if (!headers.has('Content-Type') && init.method && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase API error (${response.status}): ${errorText}`);
  }

  return response;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return null;
}

function resolveStartupRef(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;

  const direct = pickString(record, ['ref', 'startup_ref']);
  if (direct) {
    return direct;
  }

  const startup = asRecord(record['startup']);
  if (startup) {
    return pickString(startup, ['ref', 'startup_ref']);
  }

  return null;
}

function resolveStartupId(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;

  const direct = record['id'];
  if (typeof direct === 'string') {
    return direct;
  }

  const startup = asRecord(record['startup']);
  if (startup && typeof startup['id'] === 'string') {
    return startup['id'];
  }

  return null;
}

function resolveStartupStatus(payload: unknown): string {
  const record = asRecord(payload);
  if (!record) return 'UNKNOWN';

  const direct = record['status'];
  if (typeof direct === 'string') {
    return direct;
  }

  const startup = asRecord(record['startup']);
  const nested = startup?.['status'];
  if (typeof nested === 'string') {
    return nested;
  }

  return 'UNKNOWN';
}

function buildRestUrl(startupRef: string): string {
  return `https://${startupRef}.supabase.co`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
