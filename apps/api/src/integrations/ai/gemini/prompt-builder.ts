import {
  agentConfigSchema,
  buildAgentRuntimeContext,
  buildAgentSystemPrompt,
  type AgentConfig,
  type PromptLayers,
} from "@sonrat/shared";

export function configToPromptLayers(
  config: AgentConfig,
  extras?: {
    customerName?: string;
    customerContext?: string;
    campaignName?: string;
  },
): PromptLayers {
  const products = config.products
    .map((p) => `${p.name}: ${p.description ?? ""} features=${p.features.join(", ")}`)
    .join("\n");
  const pricing = config.products
    .map((p) =>
      p.priceMinor != null
        ? `${p.name}: ${(p.priceMinor / 100).toFixed(2)} ${p.currency} (${p.pricingNotes ?? ""})`
        : `${p.name}: ${p.pricingNotes ?? "see notes"}`,
    )
    .join("\n");

  return {
    agentName: config.general.name,
    companyName: config.company.companyName,
    agentRole: config.general.role,
    industry: config.general.industry ?? "",
    companyDescription: config.company.companyDescription ?? "",
    primaryObjective: config.sales.primaryObjective,
    secondaryObjectives: config.sales.secondaryObjectives,
    customerName: extras?.customerName ?? "Customer",
    customerContext: extras?.customerContext ?? "",
    campaignName: extras?.campaignName ?? "",
    personality: config.personality.personality,
    tone: config.personality.tone,
    speakingStyle: config.personality.speakingStyle,
    products,
    services: config.knowledge.supportInformation.join("\n"),
    pricing,
    policies: config.knowledge.policies.join("\n"),
    faqs: config.knowledge.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n"),
    businessRules: [
      ...config.safety.prohibitedTopics.map((t) => `Prohibited: ${t}`),
      ...config.safety.unsupportedClaims.map((t) => `Do not claim: ${t}`),
    ].join("\n"),
    salesObjective: config.sales.primaryObjective,
    qualificationQuestions: config.sales.qualificationQuestions.join("\n"),
    discoveryQuestions: config.sales.discoveryQuestions.join("\n"),
    offers: config.sales.offers.join("\n"),
    objectionHandling: config.sales.objectionHandling.join("\n"),
    availableTools: config.tools.enabledTools.join(", "),
    handoffRules: config.support.humanHandoffRules.join("\n"),
    callEndRules: config.callBehavior.callEndRules.join("\n") || config.callBehavior.closing,
  };
}

export function buildPromptFromDraft(
  draft: unknown,
  extras?: {
    customerName?: string;
    customerContext?: string;
    campaignName?: string;
    organizationId?: string;
    agentId?: string;
    agentVersionId?: string;
  },
) {
  const config = agentConfigSchema.parse(draft);
  const layers = configToPromptLayers(config, extras);
  const systemPrompt = buildAgentSystemPrompt(layers);

  if (extras?.organizationId && extras.agentId && extras.agentVersionId) {
    return buildAgentRuntimeContext({
      layers,
      supportedLanguages: config.languages.supportedLanguages,
      defaultLanguage: config.languages.defaultLanguage,
      voiceId: config.voice.voiceId,
      enabledTools: config.tools.enabledTools,
      organizationId: extras.organizationId,
      agentId: extras.agentId,
      agentVersionId: extras.agentVersionId,
    });
  }

  return {
    systemPrompt,
    supportedLanguages: config.languages.supportedLanguages,
    defaultLanguage: config.languages.defaultLanguage,
    voiceId: config.voice.voiceId,
    enabledTools: config.tools.enabledTools,
  };
}
