export type Publication = {
  id: number;
  name: string;
  website?: string | null;
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
  sentiment?: 'positive' | 'neutral' | 'negative';
  status?: 'new' | 'in-review' | 'published';
  verified?: number;
};

export type Client = {
  id: number;
  name: string;
  contactEmail?: string;
  notes?: string;
  alertsRssFeedUrl?: string | null;
};
