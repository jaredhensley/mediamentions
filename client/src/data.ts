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
  { id: 'client-1', name: 'Bushwick Commission', industry: 'Produce', notes: 'Bushwick- Bushwick Commission' },
  { id: 'client-2', name: 'Colombia Avocado Board', industry: 'Produce', notes: 'CAB- Colombia Avocado Board' },
  { id: 'client-3', name: 'Dakota Angus', industry: 'Beef', notes: 'Dakota Angus' },
  { id: 'client-4', name: 'Equitable Food Initiative', industry: 'Certification', notes: 'EFI – Equitable Food Initiative' },
  { id: 'client-5', name: 'Full Tilt Marketing', industry: 'Marketing', notes: 'FTM - Full Tilt Marketing' },
  { id: 'client-6', name: 'G&R Farms', industry: 'Produce', notes: 'G&R Farms' },
  { id: 'client-7', name: 'Michigan Asparagus Advisory Board', industry: 'Produce', notes: 'MAAB - Michigan Asparagus Advisory Board' },
  {
    id: 'client-8',
    name: 'North Carolina Sweetpotato Commission',
    industry: 'Produce',
    notes: 'NCSC - North Carolina Sweetpotato Commision'
  },
  { id: 'client-9', name: 'North Dakota 250', industry: 'Agriculture', notes: 'ND250- North Dakota 250' },
  { id: 'client-10', name: 'Todd Greiner Farms', industry: 'Produce', notes: 'Todd Greiner Farms' },
  { id: 'client-11', name: 'South Texas Onion Committee', industry: 'Produce', notes: 'STOC- South Texas Onion Committee' },
  { id: 'client-12', name: 'Texas Watermelon Association', industry: 'Produce', notes: 'TWA- Texas Watermelon Association' },
];

export const pressReleases: PressRelease[] = [];

export const mentions: Mention[] = [];
