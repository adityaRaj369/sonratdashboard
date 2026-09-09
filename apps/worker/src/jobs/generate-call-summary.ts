import { db } from "@sonrat/database";
import { PermanentJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";

export interface GenerateCallSummaryData {
  organizationId: string;
  callId: string;
}

export const generateCallSummary: JobHandler<GenerateCallSummaryData> = async (
  job,
) => {
  const { organizationId, callId } = job.data;
  const call = await db.call.findFirst({
    where: { id: callId, organizationId },
    include: {
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      outcomeRecord: true,
    },
  });
  if (!call) throw new PermanentJobError(`Call not found: ${callId}`);

  const messages = call.conversation?.messages ?? [];
  const text = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const summary =
    text.length > 0
      ? `Call summary (${messages.length} turns):\n${text.slice(0, 2000)}`
      : `Call ${callId} ended with status ${call.status}${
          call.outcome ? ` / outcome ${call.outcome}` : ""
        }.`;

  if (call.conversation) {
    const existing = await db.callTranscript.findFirst({
      where: { conversationId: call.conversation.id },
    });
    const segments = messages.map((m) => ({
      role: m.role,
      content: m.content,
      language: m.language,
      at: m.createdAt.toISOString(),
    }));
    if (existing) {
      await db.callTranscript.update({
        where: { id: existing.id },
        data: { fullText: text || summary, segments },
      });
    } else {
      await db.callTranscript.create({
        data: {
          conversationId: call.conversation.id,
          fullText: text || summary,
          segments,
        },
      });
    }
  }

  if (call.outcomeRecord) {
    await db.callOutcomeRecord.update({
      where: { id: call.outcomeRecord.id },
      data: { summary },
    });
  } else if (call.outcome) {
    await db.callOutcomeRecord.create({
      data: {
        organizationId,
        callId,
        outcome: call.outcome,
        summary,
        language: call.language,
      },
    });
  }

  await db.call.update({
    where: { id: callId },
    data: {
      transcriptReference: call.conversation?.id ?? undefined,
      metadata: {
        ...(call.metadata as object),
        summaryGeneratedAt: new Date().toISOString(),
      },
    },
  });

  return { summaryLength: summary.length };
};
