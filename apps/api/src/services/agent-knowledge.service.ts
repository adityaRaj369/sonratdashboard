import { randomUUID } from "node:crypto";
import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import {
  agentConfigSchema,
  NotFoundError,
  ValidationError,
  type AgentConfig,
} from "@sonrat/shared";
import { getStorage } from "../lib/storage.js";
import { AuditService } from "./audit.service.js";

function extractTextFromUpload(
  buf: Buffer,
  contentType: string,
  fileName: string,
): string {
  const lower = fileName.toLowerCase();
  if (
    contentType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv")
  ) {
    return buf.toString("utf8").slice(0, 100_000);
  }
  if (contentType.includes("pdf") || lower.endsWith(".pdf")) {
    // Best-effort: pull printable runs from PDF bytes (full OCR/RAG later).
    const raw = buf.toString("latin1");
    const matches = raw.match(/[\x20-\x7E\n\r\t]{5,}/g) ?? [];
    return matches
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100_000);
  }
  return "";
}

export class AgentKnowledgeService {
  constructor(private readonly audit = new AuditService()) {}

  async uploadDocument(
    organizationId: string,
    userId: string,
    agentId: string,
    file: { name: string; type: string; data: Buffer },
  ) {
    const config = getConfig();
    if (file.data.byteLength > config.MAX_UPLOAD_BYTES) {
      throw new ValidationError(
        `File exceeds max upload size of ${config.MAX_UPLOAD_BYTES} bytes`,
      );
    }

    const lower = file.name.toLowerCase();
    const allowedExt =
      lower.endsWith(".pdf") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".md") ||
      lower.endsWith(".csv");
    if (!allowedExt) {
      throw new ValidationError("Only PDF, TXT, MD, or CSV knowledge files are supported");
    }

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId, deletedAt: null },
    });
    if (!agent) throw new NotFoundError("Agent");

    const objectKey = `knowledge/${organizationId}/${agentId}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const contentType = file.type || "application/octet-stream";
    const storage = getStorage();
    await storage.putObject({
      key: objectKey,
      body: file.data,
      contentType,
    });

    const extractedText = extractTextFromUpload(file.data, contentType, file.name);
    const draft = agentConfigSchema.parse(agent.draftConfig ?? {});
    const doc = {
      id: randomUUID(),
      fileName: file.name,
      objectKey,
      contentType,
      extractedText,
      uploadedAt: new Date().toISOString(),
    };
    const nextKnowledge: AgentConfig["knowledge"] = {
      ...draft.knowledge,
      documents: [...(draft.knowledge.documents ?? []), doc],
      additionalKnowledge: [
        ...(draft.knowledge.additionalKnowledge ?? []),
        ...(extractedText
          ? [`From ${file.name}:\n${extractedText.slice(0, 20_000)}`]
          : []),
      ],
    };

    const nextDraft = { ...draft, knowledge: nextKnowledge };
    await db.agent.update({
      where: { id: agentId },
      data: { draftConfig: nextDraft, updatedAt: new Date() },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.knowledge.upload",
      resource: "agent",
      resourceId: agentId,
      metadata: { fileName: file.name, objectKey, chars: extractedText.length },
    });

    return { document: doc, knowledge: nextKnowledge };
  }

  async removeDocument(
    organizationId: string,
    userId: string,
    agentId: string,
    documentId: string,
  ) {
    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId, deletedAt: null },
    });
    if (!agent) throw new NotFoundError("Agent");
    const draft = agentConfigSchema.parse(agent.draftConfig ?? {});
    const doc = (draft.knowledge.documents ?? []).find((d) => d.id === documentId);
    if (!doc) throw new NotFoundError("Knowledge document");

    const storage = getStorage();
    await storage.deleteObject(doc.objectKey).catch(() => undefined);

    const nextKnowledge = {
      ...draft.knowledge,
      documents: (draft.knowledge.documents ?? []).filter((d) => d.id !== documentId),
    };
    await db.agent.update({
      where: { id: agentId },
      data: {
        draftConfig: { ...draft, knowledge: nextKnowledge },
        updatedAt: new Date(),
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.knowledge.remove",
      resource: "agent",
      resourceId: agentId,
      metadata: { documentId, fileName: doc.fileName },
    });

    return { knowledge: nextKnowledge };
  }
}
