import { z } from "zod";
import {
  AGENT_STATUSES,
  CALL_OUTCOMES,
  CALL_STATUSES,
  CAMPAIGN_STATUSES,
  CONTACT_CALLABILITY,
} from "../constants/index.js";
import { ROLES } from "../rbac/index.js";

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const idSchema = z.string().uuid();

export const agentGeneralSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  role: z.string().min(1).max(120),
  industry: z.string().max(120).optional().nullable(),
  purpose: z.enum(["sales", "support", "whatsapp", "hybrid"]).default("sales"),
  /** Optional published Agent Flow to guide conversation structure */
  flowId: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export const agentCompanySchema = z.object({
  companyName: z.string().min(1).max(200),
  companyDescription: z.string().max(5000).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().max(40).optional().nullable(),
  businessHours: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        open: z.string(),
        close: z.string(),
      }),
    )
    .default([]),
  timezone: z.string().min(1).default("UTC"),
  locations: z.array(z.string()).default([]),
});

export const agentProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  features: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  priceMinor: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  pricingNotes: z.string().optional().nullable(),
  availability: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  restrictions: z.string().optional().nullable(),
});

export const agentPersonalitySchema = z.object({
  personality: z.string().min(1),
  tone: z.string().min(1),
  friendliness: z.number().int().min(1).max(10).default(7),
  professionalism: z.number().int().min(1).max(10).default(8),
  verbosity: z.enum(["concise", "balanced", "detailed"]).default("concise"),
  speakingStyle: z.string().min(1),
});

export const agentVoiceSchema = z.object({
  voiceProvider: z.enum(["gemini"]).default("gemini"),
  voiceId: z.string().min(1),
  voiceGender: z.enum(["male", "female", "neutral"]).default("neutral"),
  language: z.string().min(2),
  style: z.string().optional().nullable(),
  speed: z.number().min(0.5).max(2).optional().nullable(),
});

export const agentLanguageSchema = z.object({
  supportedLanguages: z.array(z.string().min(2)).min(1),
  defaultLanguage: z.string().min(2),
  languageDetection: z.boolean().default(true),
  languageSwitching: z.boolean().default(true),
  fallbackLanguage: z.string().min(2),
});

export const agentSalesSchema = z.object({
  primaryObjective: z.string().min(1),
  secondaryObjectives: z.array(z.string()).default([]),
  qualificationQuestions: z.array(z.string()).default([]),
  discoveryQuestions: z.array(z.string()).default([]),
  offers: z.array(z.string()).default([]),
  objectionHandling: z.array(z.string()).default([]),
  closingBehavior: z.string().optional().nullable(),
  leadQualificationRules: z.array(z.string()).default([]),
});

export const agentSupportSchema = z.object({
  supportWorkflows: z.array(z.string()).default([]),
  escalationRules: z.array(z.string()).default([]),
  humanHandoffRules: z.array(z.string()).default([]),
  prohibitedAnswers: z.array(z.string()).default([]),
  issueCategories: z.array(z.string()).default([]),
});

export const agentSafetySchema = z.object({
  prohibitedTopics: z.array(z.string()).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  privacyBehavior: z.string().optional().nullable(),
  sensitiveInformationRules: z.array(z.string()).default([]),
  escalationRequirements: z.array(z.string()).default([]),
});

export const agentCallBehaviorSchema = z.object({
  greeting: z.string().min(1),
  interruptionHandling: z.string().default("Stop speaking immediately and listen."),
  silenceBehavior: z.string().default("Ask a brief clarifying question after 5 seconds."),
  closing: z.string().min(1),
  maximumCallDurationSeconds: z.number().int().min(30).max(3600).default(600),
  callbackBehavior: z.string().optional().nullable(),
  callEndRules: z.array(z.string()).default([]),
});

export const agentToolsSchema = z.object({
  enabledTools: z.array(z.string()).default([]),
});

export const agentConfigSchema = z.object({
  general: agentGeneralSchema,
  company: agentCompanySchema,
  products: z.array(agentProductSchema).default([]),
  knowledge: z
    .object({
      faqs: z
        .array(z.object({ question: z.string(), answer: z.string() }))
        .default([]),
      policies: z.array(z.string()).default([]),
      supportInformation: z.array(z.string()).default([]),
      salesInformation: z.array(z.string()).default([]),
      additionalKnowledge: z.array(z.string()).default([]),
      documents: z
        .array(
          z.object({
            id: z.string(),
            fileName: z.string(),
            objectKey: z.string(),
            contentType: z.string(),
            extractedText: z.string().default(""),
            uploadedAt: z.string(),
          }),
        )
        .default([]),
    })
    .default({}),
  personality: agentPersonalitySchema,
  voice: agentVoiceSchema,
  languages: agentLanguageSchema,
  sales: agentSalesSchema,
  support: agentSupportSchema,
  safety: agentSafetySchema,
  callBehavior: agentCallBehaviorSchema,
  tools: agentToolsSchema,
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

export const createAgentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  purpose: z.enum(["sales", "support", "whatsapp", "hybrid"]).default("sales"),
});

export const updateAgentSectionSchema = z.object({
  section: z.enum([
    "general",
    "company",
    "products",
    "knowledge",
    "personality",
    "voice",
    "languages",
    "sales",
    "support",
    "safety",
    "callBehavior",
    "tools",
  ]),
  data: z.unknown(),
});

export const contactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(5).max(40),
  email: z.string().email().optional().nullable().or(z.literal("")),
  company: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
  leadStatus: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  callability: z.enum(CONTACT_CALLABILITY).default("callable"),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  agentId: z.string().uuid(),
  phoneNumberId: z.string().uuid().optional().nullable(),
  objective: z.string().min(1),
  salesInstructions: z.string().optional().nullable(),
  campaignInstructions: z.string().optional().nullable(),
  callingHoursStart: z.string().default("09:00"),
  callingHoursEnd: z.string().default("18:00"),
  timezone: z.string().default("UTC"),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  retryDelayMinutes: z.number().int().min(1).max(1440).default(60),
  concurrencyLimit: z.number().int().min(1).max(100).default(5),
  callTimeoutSeconds: z.number().int().min(30).max(600).default(120),
  callbackBehavior: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(10).default(5),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  contactIds: z.array(z.string().uuid()).default([]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(200),
});

export const agentStatusSchema = z.enum(AGENT_STATUSES);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const callStatusSchema = z.enum(CALL_STATUSES);
export const callOutcomeSchema = z.enum(CALL_OUTCOMES);
export const roleSchema = z.enum(ROLES);

export const cursorPageSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
