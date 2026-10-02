import { db } from "@sonrat/database";
import {
  agentConfigSchema,
  buildAgentRuntimeContext,
  buildAgentSystemPrompt,
  type AgentConfig,
  type PromptLayers,
} from "@sonrat/shared";

function flowGraphToInstructions(graph: {
  nodes?: Array<{
    id: string;
    type: string;
    label?: string;
    data?: Record<string, unknown>;
  }>;
  edges?: Array<{ source: string; target: string; label?: string }>;
}): string {
  const nodes = graph.nodes ?? [];
  if (!nodes.length) return "";
  const lines = nodes.map((n, i) => {
    const text =
      (typeof n.data?.text === "string" && n.data.text) ||
      (typeof n.data?.prompt === "string" && n.data.prompt) ||
      n.label ||
      "";
    return `${i + 1}. [${n.type}] ${text}`.trim();
  });
  return [
    "Conversation flow (follow in order; adapt wording naturally; never invent company facts):",
    ...lines,
  ].join("\n");
}

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
    services: [
      ...config.knowledge.supportInformation,
      ...config.knowledge.salesInformation,
      ...config.knowledge.additionalKnowledge,
      ...config.knowledge.documents.map(
        (d) =>
          `[Document: ${d.fileName}]\n${(d.extractedText || "").slice(0, 8000)}`,
      ),
    ]
      .filter(Boolean)
      .join("\n\n"),
    pricing,
    policies: config.knowledge.policies.join("\n"),
    faqs: config.knowledge.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n"),
    businessRules: [
      ...config.safety.prohibitedTopics.map((t) => `Prohibited topic: ${t}`),
      ...config.safety.unsupportedClaims.map((t) => `Do not claim: ${t}`),
      // Support section rules — never leave these out
      ...config.support.prohibitedAnswers.map((t) => `Never answer: ${t}`),
      ...config.support.escalationRules.map((t) => `Escalation rule: ${t}`),
      ...config.support.supportWorkflows.map((t) => `Support workflow: ${t}`),
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
    flowInstructions?: string;
  },
) {
  const config = agentConfigSchema.parse(draft);
  const layers = configToPromptLayers(config, extras);
  let systemPrompt = buildAgentSystemPrompt(layers);

  if (extras?.flowInstructions) {
    systemPrompt = `${systemPrompt}\n\n${extras.flowInstructions}`;
  }

  if (extras?.organizationId && extras.agentId && extras.agentVersionId) {
    return buildAgentRuntimeContext({
      layers: extras.flowInstructions
        ? {
            ...layers,
            businessRules: [layers.businessRules, extras.flowInstructions]
              .filter(Boolean)
              .join("\n"),
          }
        : layers,
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

/** Load published flow graph instructions when agent.general.flowId is set. */
export async function resolveFlowInstructions(
  organizationId: string,
  draft: unknown,
): Promise<string | undefined> {
  try {
    const general = (draft as { general?: { flowId?: string | null } })?.general;
    const flowId = general?.flowId;
    if (!flowId) return undefined;
    const flow = await db.agentFlow.findFirst({
      where: { id: flowId, organizationId, deletedAt: null },
    });
    if (!flow?.activeVersionId) return undefined;
    const version = await db.agentFlowVersion.findFirst({
      where: { id: flow.activeVersionId, organizationId },
    });
    if (!version) return undefined;
    return flowGraphToInstructions(
      version.graph as {
        nodes?: Array<{
          id: string;
          type: string;
          label?: string;
          data?: Record<string, unknown>;
        }>;
      },
    );
  } catch {
    return undefined;
  }
}
