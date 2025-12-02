import { Client, Mention, PressRelease, Publication } from './data';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export function fetchMentions(): Promise<Mention[]> {
  return fetchJson('/media-mentions');
}

export function fetchPublications(): Promise<Publication[]> {
  return fetchJson('/publications');
}

export function fetchClients(): Promise<Client[]> {
  return fetchJson('/clients');
}

export function fetchPressReleases(): Promise<PressRelease[]> {
  return fetchJson('/press-releases');
}
