export type Rider = {
  id: string;
  name: string;
  count: number;
  draft: boolean;
};

export type SortMode = 'alpha' | 'desc' | 'asc';

export type OpenMenu = {
  kind: 'rider' | 'footer';
  id?: string;
  top: number;
  left: number;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
