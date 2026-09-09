export const AGENT_SECTIONS = [
  { id: "general", label: "General" },
  { id: "company", label: "Company" },
  { id: "products", label: "Products" },
  { id: "knowledge", label: "Knowledge" },
  { id: "personality", label: "Personality" },
  { id: "voice", label: "Voice" },
  { id: "languages", label: "Languages" },
  { id: "sales", label: "Sales" },
  { id: "support", label: "Support" },
  { id: "safety", label: "Safety" },
  { id: "callBehavior", label: "Call behavior" },
  { id: "tools", label: "Tools" },
  { id: "test", label: "Test agent" },
] as const;

export type AgentSectionId = (typeof AGENT_SECTIONS)[number]["id"];

export function getSectionData(
  draftConfig: Record<string, unknown> | undefined,
  section: string,
) {
  if (!draftConfig) return undefined;
  return draftConfig[section];
}
