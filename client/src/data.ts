export type Publication = {
  id: string;
  name: string;
  url: string;
  region: string;
};

export type Mention = {
  id: string;
  title: string;
  date: string;
  publicationId: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'new' | 'in-review' | 'published';
  summary: string;
  clientId?: string;
  pressReleaseId?: string;
};

export type PressRelease = {
  id: string;
  clientId: string;
  title: string;
  date: string;
  status: 'draft' | 'scheduled' | 'sent';
  body: string;
};

export type Client = {
  id: string;
  name: string;
  industry: string;
  notes: string;
};

export const publications: Publication[] = [
  { id: 'pub-1', name: 'Tech Daily', url: 'https://techdaily.example', region: 'Global' },
  { id: 'pub-2', name: 'Market Watch', url: 'https://marketwatch.example', region: 'North America' },
  { id: 'pub-3', name: 'Innovation Weekly', url: 'https://innovation.example', region: 'EMEA' },
];

export const clients: Client[] = [
  { id: 'client-1', name: 'Acme Robotics', industry: 'Robotics', notes: 'Focus on B2B manufacturing coverage.' },
  { id: 'client-2', name: 'GreenTech', industry: 'Clean Energy', notes: 'Highlight sustainability metrics.' },
];

export const pressReleases: PressRelease[] = [
  { id: 'pr-1', clientId: 'client-1', title: 'Acme Robotics launches new cobot line', date: '2024-08-15', status: 'sent', body: 'Acme introduces collaborative robots for assembly lines.' },
  { id: 'pr-2', clientId: 'client-1', title: 'Acme partners with MegaCorp', date: '2024-09-01', status: 'scheduled', body: 'New partnership announcement.' },
  { id: 'pr-3', clientId: 'client-2', title: 'GreenTech raises Series C', date: '2024-08-10', status: 'draft', body: 'Funding round led by Clean Capital.' },
];

export const mentions: Mention[] = [
  {
    id: 'mention-1',
    title: 'Acme Robotics disrupts factory automation',
    date: '2024-09-20',
    publicationId: 'pub-1',
    sentiment: 'positive',
    status: 'published',
    summary: 'Profile of Acme Robotics new cobots.',
    clientId: 'client-1',
    pressReleaseId: 'pr-1',
  },
  {
    id: 'mention-2',
    title: 'Sustainability leaders of 2024',
    date: '2024-09-22',
    publicationId: 'pub-2',
    sentiment: 'positive',
    status: 'published',
    summary: 'GreenTech featured for clean energy impact.',
    clientId: 'client-2',
    pressReleaseId: 'pr-3',
  },
  {
    id: 'mention-3',
    title: 'Automation market outlook',
    date: '2024-09-23',
    publicationId: 'pub-3',
    sentiment: 'neutral',
    status: 'in-review',
    summary: 'Analyst note referencing Acme partnership.',
    clientId: 'client-1',
    pressReleaseId: 'pr-2',
  },
];
