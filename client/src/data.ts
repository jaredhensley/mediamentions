export type Publication = {
  id: number;
  name: string;
  website?: string | null;
  clientId?: number | null;
};

export type Mention = {
  id: number;
  title: string;
  mentionDate: string;
  subjectMatter?: string;
  reMentionDate?: string | null;
  link?: string;
  source?: string | null;
  clientId: number;
  publicationId: number;
  pressReleaseId?: number | null;
  sentiment?: 'positive' | 'neutral' | 'negative';
  status?: 'new' | 'in-review' | 'published';
};

export type PressRelease = {
  id: number;
  clientId: number;
  title: string;
  content?: string;
  releaseDate?: string;
  date?: string;
  status?: 'draft' | 'scheduled' | 'sent';
  body?: string;
};

export type Client = {
  id: number;
  name: string;
  contactEmail?: string;
  notes?: string;
};
