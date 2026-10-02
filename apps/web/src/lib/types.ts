export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApiErrorBody = {
  error?: string | { message?: string; code?: string; details?: unknown };
  message?: string;
  code?: string;
  details?: unknown;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
  timezone?: string;
};

export type AuthMeResponse = {
  user: AuthUser;
  organization: AuthOrganization | null;
  organizations: AuthOrganization[];
  role?: string;
  permissions: string[];
};

export type Agent = {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  draftConfig: Record<string, unknown>;
  activeVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentVersion = {
  id: string;
  agentId: string;
  versionNumber: number;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
};

export type ValidationReport = {
  valid: boolean;
  errors: Array<{ section?: string; message: string; path?: string }>;
  warnings?: Array<{ section?: string; message: string }>;
};

export type Contact = {
  id: string;
  name: string;
  rawPhone: string;
  normalizedPhone?: string | null;
  email?: string | null;
  company?: string | null;
  tags: string[];
  leadStatus?: string | null;
  notes?: string | null;
  source?: string | null;
  timezone?: string | null;
  callability: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  agentId: string;
  agentVersionId?: string | null;
  phoneNumberId?: string | null;
  status: string;
  objective: string;
  salesInstructions?: string | null;
  campaignInstructions?: string | null;
  callingHoursStart: string;
  callingHoursEnd: string;
  timezone: string;
  maxAttempts: number;
  retryDelayMinutes: number;
  concurrencyLimit: number;
  callTimeoutSeconds: number;
  callbackBehavior?: string | null;
  priority: number;
  startAt?: string | null;
  endAt?: string | null;
  metrics?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  agent?: Pick<Agent, "id" | "name" | "status">;
  phoneNumber?: PhoneNumber | null;
};

export type PhoneNumber = {
  id: string;
  phoneNumber: string;
  label?: string | null;
  provider?: string | null;
  direction?: string | null;
  isActive?: boolean;
  agentId?: string | null;
};

export type CallOutcomeRecord = {
  outcome?: string | null;
  summary?: string | null;
  intent?: string | null;
  sentiment?: string | null;
  language?: string | null;
  leadStatus?: string | null;
  interestLevel?: string | null;
  nextAction?: string | null;
  callbackRequired?: boolean;
  appointmentRequired?: boolean;
  humanHandoff?: boolean;
  productsDiscussed?: string[];
  objections?: string[];
  customerQuestions?: string[];
};

export type Call = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  outcome?: string | null;
  failureReason?: string | null;
  fromNumber?: string | null;
  toNumber?: string | null;
  durationSeconds?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  summary?: string | null;
  language?: string | null;
  campaignId?: string | null;
  agentId?: string | null;
  contactId?: string | null;
  createdAt: string;
  contact?: Pick<Contact, "id" | "name" | "rawPhone" | "normalizedPhone"> | null;
  agent?: Pick<Agent, "id" | "name"> | null;
  campaign?: Pick<Campaign, "id" | "name"> | null;
  events?: CallEvent[];
  outcomeRecord?: CallOutcomeRecord | null;
  outcomeDetail?: CallOutcomeRecord & {
    appointmentRequired?: boolean;
    productsDiscussed?: string[];
    objections?: string[];
    customerQuestions?: string[];
    language?: string | null;
  } | null;
};

export type CallEvent = {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type TranscriptTurn = {
  id?: string;
  role?: string;
  speaker?: "ai" | "customer" | "system" | string;
  content?: string;
  text?: string;
  language?: string | null;
  createdAt?: string;
};

export type ContactImport = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columnMapping: Record<string, string>;
  summary?: Record<string, unknown>;
  preview?: {
    headers: string[];
    rows: Array<Record<string, string>>;
    suggestedMapping?: Record<string, string>;
  };
};

export type AnalyticsOverview = {
  totalCalls: number;
  completedCalls: number;
  connectedCalls: number;
  averageDurationSeconds: number;
  leads: number;
  conversions: number;
  interested: number;
  callbacks: number;
  callVolumeByDay: Array<{ date: string; count: number }>;
  outcomes: Array<{ outcome: string; count: number }>;
};

export type CampaignAnalytics = {
  campaignId: string;
  totalContacts: number;
  callsAttempted: number;
  callsConnected: number;
  callsCompleted: number;
  noAnswer: number;
  busy: number;
  failed: number;
  averageDurationSeconds: number;
  leads: number;
  interested: number;
  notInterested: number;
  callbacks: number;
  conversions: number;
  transferRate: number;
};

export type AgentAnalytics = {
  agentId: string;
  calls: number;
  averageDurationSeconds: number;
  successRate: number;
  escalationRate: number;
  languageDistribution: Array<{ language: string; count: number }>;
  toolUsage: Array<{ tool: string; count: number }>;
};

export type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  maxConcurrentCalls: number;
  retentionDays: number;
  featureFlags: Record<string, unknown>;
};

export type OrgMember = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
};
