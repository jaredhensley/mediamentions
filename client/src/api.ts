import { Client, Mention, Publication } from './data';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY;

function getHeaders(contentType = 'application/json'): HeadersInit {
  const headers: HeadersInit = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    ...getHeaders(),
    ...options?.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Request failed with status ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: getHeaders(''),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Request failed with status ${response.status}: ${errorText}`);
  }

  return response.blob();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Clients
export function fetchClients(): Promise<Client[]> {
  return fetchJson('/clients');
}

export function createClient(client: Omit<Client, 'id'>): Promise<Client> {
  return fetchJson('/clients', {
    method: 'POST',
    body: JSON.stringify(client),
  });
}

export function updateClient(id: number, client: Partial<Client>): Promise<Client> {
  return fetchJson(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(client),
  });
}

export function deleteClient(id: number): Promise<void> {
  return fetchJson(`/clients/${id}`, {
    method: 'DELETE',
  });
}

// Publications
export function fetchPublications(): Promise<Publication[]> {
  return fetchJson('/publications');
}

export function createPublication(publication: Omit<Publication, 'id'>): Promise<Publication> {
  return fetchJson('/publications', {
    method: 'POST',
    body: JSON.stringify(publication),
  });
}

export function updatePublication(id: number, publication: Partial<Publication>): Promise<Publication> {
  return fetchJson(`/publications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(publication),
  });
}

export function deletePublication(id: number): Promise<void> {
  return fetchJson(`/publications/${id}`, {
    method: 'DELETE',
  });
}

// Mentions
export function fetchMentions(): Promise<Mention[]> {
  return fetchJson('/media-mentions');
}

export function createMention(mention: Omit<Mention, 'id'>): Promise<Mention> {
  return fetchJson('/media-mentions', {
    method: 'POST',
    body: JSON.stringify(mention),
  });
}

export function updateMention(id: number, mention: Partial<Mention>): Promise<Mention> {
  return fetchJson(`/media-mentions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(mention),
  });
}

export function deleteMention(id: number): Promise<void> {
  return fetchJson(`/media-mentions/${id}`, {
    method: 'DELETE',
  });
}

// Exports
export async function exportFalsePositives(): Promise<void> {
  const blob = await fetchBlob('/admin/false-positives/export');
  const date = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `false-positives-${date}.csv`);
}

export async function exportClientMentions(clientId: number, clientName: string): Promise<void> {
  const blob = await fetchBlob(`/clients/${clientId}/mentions/export`);
  downloadBlob(blob, `${clientName || 'mentions'}.xls`);
}

// Pending Review
export interface PendingReviewMention {
  id: number;
  title: string;
  link: string;
  source: string | null;
  mentionDate: string;
  createdAt: string;
  verified: null;
  clientName: string;
  clientId: number;
}

export function fetchPendingReview(): Promise<PendingReviewMention[]> {
  return fetchJson('/admin/pending-review');
}

export function fetchPendingReviewCount(): Promise<{ count: number }> {
  return fetchJson('/admin/pending-review/count');
}

export function acceptPendingReview(id: number): Promise<{ success: boolean; id: number; verified: number }> {
  return fetchJson(`/admin/pending-review/${id}/accept`, { method: 'POST' });
}

export function rejectPendingReview(id: number): Promise<{ success: boolean; id: number; verified: number }> {
  return fetchJson(`/admin/pending-review/${id}/reject`, { method: 'POST' });
}

// Verification Status
export interface VerificationStatusData {
  isRunning: boolean;
  phase: 'idle' | 'searching' | 'verifying' | 'complete';
  total: number;
  processed: number;
  verified: number;
  failed: number;
  startedAt: string | null;
  completedAt: string | null;
}

export function fetchVerificationStatus(): Promise<VerificationStatusData> {
  return fetchJson('/api/verification-status');
}
