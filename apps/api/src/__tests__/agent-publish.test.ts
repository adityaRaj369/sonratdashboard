import { describe, expect, it } from "vitest";
import {
  agentConfigSchema,
  buildAgentRuntimeContext,
  buildAgentSystemPrompt,
} from "@sonrat/shared";
import { AgentService } from "../services/agent.service.js";
import { configToPromptLayers } from "../integrations/ai/gemini/prompt-builder.js";

const validConfig = {
  general: {
    name: "Ava",
    description: "Sales agent",
    role: "SDR",
    industry: "SaaS",
    purpose: "sales" as const,
  },
  company: {
    companyName: "Acme",
    companyDescription: "B2B software",
    website: "https://example.com",
    address: null,
    contactEmail: "hello@example.com",
    contactPhone: "+919876543210",
    businessHours: [{ day: 1, open: "09:00", close: "18:00" }],
    timezone: "UTC",
    locations: ["Remote"],
  },
  products: [
    {
      name: "Acme Cloud",
      description: "Cloud suite",
      features: ["Realtime"],
      benefits: ["Faster"],
      priceMinor: 9900,
      currency: "USD",
      pricingNotes: "Starts at 99",
      availability: "GA",
      eligibility: "Businesses",
      restrictions: "None",
    },
  ],
  knowledge: {
    faqs: [{ question: "Pricing?", answer: "Starts at 99" }],
    policies: ["No PII sharing"],
    supportInformation: ["9-5 support"],
    salesInformation: ["Trial available"],
    additionalKnowledge: [],
  },
  personality: {
    personality: "Warm",
    tone: "Professional",
    friendliness: 8,
    professionalism: 9,
    verbosity: "concise" as const,
    speakingStyle: "Conversational",
  },
  voice: {
    voiceProvider: "gemini" as const,
    voiceId: "Puck",
    voiceGender: "neutral" as const,
    language: "en",
    style: "clear",
    speed: 1,
  },
  languages: {
    supportedLanguages: ["en", "hi"],
    defaultLanguage: "en",
    languageDetection: true,
    languageSwitching: true,
    fallbackLanguage: "en",
  },
  sales: {
    primaryObjective: "Book a demo",
    secondaryObjectives: ["Qualify"],
    qualificationQuestions: ["Team size?"],
    discoveryQuestions: ["Current tools?"],
    offers: ["Trial"],
    objectionHandling: ["Acknowledge cost"],
    closingBehavior: "Ask for time",
    leadQualificationRules: ["Has interest"],
  },
  support: {
    supportWorkflows: ["Identify issue"],
    escalationRules: ["Billing"],
    humanHandoffRules: ["On request"],
    prohibitedAnswers: ["Invent refunds"],
    issueCategories: ["Billing"],
  },
  safety: {
    prohibitedTopics: ["Politics"],
    unsupportedClaims: ["Guaranteed ROI"],
    privacyBehavior: "Protect PII",
    sensitiveInformationRules: ["No OTPs"],
    escalationRequirements: ["Legal"],
  },
  callBehavior: {
    greeting: "Hi, this is Ava.",
    interruptionHandling: "Stop and listen.",
    silenceBehavior: "Ask a clarifying question.",
    closing: "Thanks for your time.",
    maximumCallDurationSeconds: 600,
    callbackBehavior: "Offer callback",
    callEndRules: ["When objective complete"],
  },
  tools: {
    enabledTools: ["create_lead", "end_call"],
  },
};

describe("AgentService publish validation", () => {
  const service = new AgentService();

  it("accepts a complete agent config via agentConfigSchema", () => {
    const result = service.validateConfig(validConfig);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.general.name).toBe("Ava");
      expect(result.config.tools.enabledTools).toContain("create_lead");
    }
    expect(agentConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects incomplete config missing required sections", () => {
    const result = service.validateConfig({
      general: { name: "Ava" },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toBeTruthy();
    }
  });

  it("rejects invalid purpose enum", () => {
    const result = service.validateConfig({
      ...validConfig,
      general: { ...validConfig.general, purpose: "marketing" },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects empty supported languages", () => {
    const result = service.validateConfig({
      ...validConfig,
      languages: {
        ...validConfig.languages,
        supportedLanguages: [],
      },
    });
    expect(result.valid).toBe(false);
  });

  it("builds runtime context and system prompt from validated config", () => {
    const parsed = agentConfigSchema.parse(validConfig);
    const layers = configToPromptLayers(parsed);
    const prompt = buildAgentSystemPrompt(layers);
    expect(prompt).toContain("Ava");
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("PLATFORM POLICY");

    const runtime = buildAgentRuntimeContext({
      layers,
      supportedLanguages: parsed.languages.supportedLanguages,
      defaultLanguage: parsed.languages.defaultLanguage,
      voiceId: parsed.voice.voiceId,
      enabledTools: parsed.tools.enabledTools,
      organizationId: "00000000-0000-0000-0000-000000000001",
      agentId: "00000000-0000-0000-0000-000000000002",
      agentVersionId: "00000000-0000-0000-0000-000000000003",
    });

    expect(runtime.systemPrompt).toContain("Ava");
    expect(runtime.voiceId).toBe("Puck");
    expect(runtime.enabledTools).toEqual(["create_lead", "end_call"]);
    expect(runtime.supportedLanguages).toEqual(["en", "hi"]);
  });
});
