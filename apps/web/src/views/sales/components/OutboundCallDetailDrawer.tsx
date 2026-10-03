"use client";

import React, { useState } from "react";
import {
  Bot,
  User,
  Clock,
  Phone,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  Volume2,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  X,
  PhoneCall,
  Calendar,
} from "lucide-react";
import { useCall, useCallTranscript, useCallRecording } from "@/hooks/use-calls";
import { formatDate, formatDuration } from "@/lib/utils";
import type { Call } from "@/lib/types";

type Props = {
  callId: string | null;
  initialCall?: Call | null;
  onClose: () => void;
};

type DrawerTab = "overview" | "recording" | "transcript" | "telephony" | "raw";

const DRAWER_TABS: {
  key: DrawerTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "overview", label: "Overview & Intelligence", icon: Sparkles },
  { key: "recording", label: "Audio Recording", icon: Volume2 },
  { key: "transcript", label: "Conversation Transcript", icon: MessageSquare },
  { key: "telephony", label: "Telephony & Technical Log", icon: Activity },
  { key: "raw", label: "Raw JSON", icon: Layers },
];

export default function OutboundCallDetailDrawer({
  callId,
  initialCall,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const callQuery = useCall(callId || "");
  const transcriptQuery = useCallTranscript(callId || "");
  const recordingQuery = useCallRecording(callId || "");

  const call = callQuery.data || initialCall;
  const turns = transcriptQuery.data?.turns || [];
  const customerTurns = turns.filter((turn) => {
    const speaker = String(turn.speaker || turn.role || "").toLowerCase();
    return speaker === "customer" || speaker === "user" || speaker === "lead";
  });

  const rawPayload = {
    call,
    transcript: transcriptQuery.data || null,
    customerResponses: customerTurns.map((turn) => ({
      id: turn.id,
      text: turn.text || turn.content || "",
      language: turn.language || null,
      createdAt: turn.createdAt || null,
    })),
  };

  const handleCopyId = () => {
    if (!call?.id) return;
    navigator.clipboard.writeText(call.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const handleCopyPhone = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 1500);
  };

  const handleCopyTranscript = () => {
    if (!turns.length) return;
    const text = turns
      .map(
        (t) =>
          `[${t.speaker === "ai" || t.speaker === "assistant" ? call?.agent?.name || "AI Agent" : contactDisplayName}]: ${t.text || ""}`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 1500);
  };

  const filteredTurns = turns.filter((t) => {
    if (!transcriptSearch.trim()) return true;
    return (t.text || "")
      .toLowerCase()
      .includes(transcriptSearch.toLowerCase().trim());
  });

  if (!callId) return null;

  const contactDisplayName =
    call?.contact?.name || call?.toNumber || "Outbound Call";
  const outcome = call?.outcomeDetail?.outcome || call?.outcome;
  const summary = call?.summary || call?.outcomeDetail?.summary;
  const sentiment = call?.outcomeDetail?.sentiment;
  const interestLevel = call?.outcomeDetail?.interestLevel;

  return (
    <div className="flex h-full flex-col justify-between bg-white text-slate-800">
      {/* Top Header Card */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Phone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {contactDisplayName}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    call?.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : call?.status === "AI_ACTIVE" || call?.status === "IN_PROGRESS"
                        ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                        : call?.status === "RINGING"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : call?.status === "QUEUED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      call?.status === "COMPLETED"
                        ? "bg-emerald-500"
                        : call?.status === "AI_ACTIVE" || call?.status === "IN_PROGRESS"
                          ? "bg-blue-500"
                          : call?.status === "RINGING"
                            ? "bg-sky-500"
                            : "bg-slate-400"
                    }`}
                  />
                  {call?.status === "COMPLETED" && <CheckCircle2 size={12} />}
                  {call?.status || "PENDING"}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                <span>{call?.toNumber || call?.contact?.rawPhone || "—"}</span>
                {call?.toNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(call.toNumber!)}
                    className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {copiedPhone ? <Check size={11} /> : <Copy size={11} />}
                    {copiedPhone ? "Copied" : "Copy"}
                  </button>
                )}
                <span>•</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {copiedId ? <Check size={11} /> : <Copy size={11} />}
                  {copiedId ? "Copied ID" : `ID: ${callId.slice(0, 10)}…`}
                </button>
                {call?.startedAt && (
                  <>
                    <span>•</span>
                    <span className="font-sans text-[11px] text-slate-400">
                      {formatDate(call.startedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {call?.durationSeconds ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                <Clock size={13} className="text-slate-400" />
                <span>{formatDuration(call.durationSeconds)}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleCopyTranscript}
              disabled={!turns.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              <MessageSquare size={13} className="text-slate-400" />
              {copiedTranscript ? "Copied Transcript" : "Copy Transcript"}
            </button>
          </div>
        </div>

        {/* Subnav Tabs */}
        <div className="flex space-x-6 border-t border-slate-200/80 pt-3">
          {DRAWER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 pb-2.5 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: OVERVIEW & INTELLIGENCE */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Duration
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-900">
                  <Clock size={15} className="text-slate-500" />
                  {formatDuration(call?.durationSeconds)}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Agent
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-900 truncate">
                  <Bot size={15} className="text-blue-600 shrink-0" />
                  <span className="truncate">{call?.agent?.name || "Ava (Default)"}</span>
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Campaign / Sale
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-900 truncate">
                  <TrendingUp size={15} className="text-indigo-600 shrink-0" />
                  <span className="truncate">{call?.campaign?.name || "Direct Dial"}</span>
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Outcome
                </span>
                <span className="mt-1 block text-sm font-black text-slate-900 truncate">
                  {outcome ? (
                    <span className="inline-block rounded-md bg-white px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs border border-slate-200">
                      {outcome.replace(/_/g, " ")}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>

            {/* AI Intelligence Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Sparkles size={15} />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    AI Call Intelligence & Outcome
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {sentiment && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        sentiment === "POSITIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : sentiment === "NEGATIVE"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      Sentiment: {sentiment}
                    </span>
                  )}
                  {interestLevel && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        interestLevel === "HIGH"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      Interest: {interestLevel}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Call Executive Summary
                </span>
                <p className="text-xs leading-relaxed text-slate-700 font-medium bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  {summary ||
                    "No executive summary generated yet. Summary is produced automatically following call termination."}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Raw Customer Responses
                </span>
                {customerTurns.length ? (
                  <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-3 max-h-48 overflow-y-auto">
                    {customerTurns.map((turn, index) => (
                      <p
                        key={turn.id || index}
                        className="text-xs font-medium leading-relaxed text-slate-700 bg-slate-50/50 p-2 rounded-lg border border-slate-100"
                      >
                        {turn.text || turn.content || "—"}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-400">
                    No customer speech has been recorded for this call yet.
                  </p>
                )}
              </div>

              {call?.outcomeDetail?.nextAction && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Recommended Next Step
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                    <ArrowRight size={13} className="text-amber-600 shrink-0" />
                    <span>{call.outcomeDetail.nextAction}</span>
                  </div>
                </div>
              )}

              {/* Objections & Customer Questions Tags */}
              {(call?.outcomeDetail?.objections?.length ||
                call?.outcomeDetail?.customerQuestions?.length ||
                call?.outcomeDetail?.productsDiscussed?.length) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {call.outcomeDetail.objections && call.outcomeDetail.objections.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Objections Raised
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {call.outcomeDetail.objections.map((obj, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-100"
                          >
                            <ShieldAlert size={11} /> {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {call.outcomeDetail.customerQuestions && call.outcomeDetail.customerQuestions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Customer Questions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {call.outcomeDetail.customerQuestions.map((q, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100"
                          >
                            <HelpCircle size={11} /> {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIO RECORDING */}
        {activeTab === "recording" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Volume2 size={15} />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Call Audio Stream & Playback
                  </h4>
                </div>
                {call?.durationSeconds ? (
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    Total Duration: {formatDuration(call.durationSeconds)}
                  </span>
                ) : null}
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                <audio
                  controls
                  className="w-full h-11 accent-blue-600"
                  preload="metadata"
                  src={`/api/v1/calls/${callId}/recording/stream`}
                >
                  Your browser does not support the audio element.
                </audio>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
                  <span>Direct Dual-channel Telephony Feed</span>
                  <span>Provider: Exotel Telecom Trunk</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONVERSATION TRANSCRIPT */}
        {activeTab === "transcript" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Full AI Conversation Transcript
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {turns.length} conversation {turns.length === 1 ? "turn" : "turns"} recorded
                </p>
              </div>

              <div className="flex items-center gap-2">
                {turns.length > 0 && (
                  <>
                    <input
                      type="text"
                      placeholder="Search in transcript…"
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                    >
                      {copiedTranscript ? (
                        <>
                          <Check size={12} className="text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy Full Text
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {transcriptQuery.isLoading ? (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">
                Loading conversation transcript…
              </div>
            ) : !turns.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <p className="text-xs font-bold text-slate-700">No conversation turns recorded</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {call?.status === "COMPLETED"
                    ? "This call completed without speech exchange or had zero connected duration."
                    : "Transcript turns appear in real-time as the AI agent speaks with the lead."}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                {filteredTurns.map((turn, index) => {
                  const isAi =
                    turn.speaker === "ai" ||
                    turn.speaker === "assistant" ||
                    turn.speaker === "agent";
                  return (
                    <div
                      key={turn.id || index}
                      className={`flex gap-3 ${isAi ? "flex-row" : "flex-row-reverse"}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs ${
                          isAi
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isAi ? <Bot size={15} /> : <User size={15} />}
                      </div>

                      <div
                        className={`max-w-[82%] rounded-2xl p-3.5 shadow-2xs text-xs leading-relaxed ${
                          isAi
                            ? "bg-blue-50/70 border border-blue-100 text-slate-900 rounded-tl-sm"
                            : "bg-white border border-slate-200 text-slate-900 rounded-tr-sm"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-4 text-[10px] font-bold text-slate-400">
                          <span>{isAi ? call?.agent?.name || "AI Agent" : contactDisplayName}</span>
                          {turn.language && (
                            <span className="uppercase tracking-wider font-mono">
                              {turn.language}
                            </span>
                          )}
                        </div>
                        <p className="font-medium whitespace-pre-wrap">{turn.text || ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TELEPHONY & TECHNICAL LOG */}
        {activeTab === "telephony" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Activity size={16} className="text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Telephony Protocol & Connection Metadata
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Caller ID (From)
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {call?.fromNumber || "Default Organization Number"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Recipient Number (To)
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {call?.toNumber || call?.contact?.rawPhone || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Direction
                  </span>
                  <span className="font-semibold text-slate-800">
                    {call?.direction || "OUTBOUND"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Telephony Carrier
                  </span>
                  <span className="font-semibold text-slate-800">Exotel Trunk Service</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Call Started
                  </span>
                  <span className="font-semibold text-slate-800">
                    {call?.startedAt ? formatDate(call.startedAt) : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Call Ended
                  </span>
                  <span className="font-semibold text-slate-800">
                    {call?.endedAt ? formatDate(call.endedAt) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RAW JSON */}
        {activeTab === "raw" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Layers size={15} />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Raw Call, Conversation, and User Response Payload
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2))
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <Copy size={12} />
                  Copy JSON
                </button>
              </div>
              <pre className="max-h-[560px] overflow-auto rounded-xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          {call?.status === "COMPLETED" ? (
            <span className="text-emerald-600 font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Call completed · {formatDuration(call?.durationSeconds)}
            </span>
          ) : call?.status === "AI_ACTIVE" || call?.status === "IN_PROGRESS" ? (
            <span className="text-blue-600 font-bold flex items-center gap-1.5 animate-pulse">
              <PhoneCall size={14} /> Active conversation in progress
            </span>
          ) : call?.status === "RINGING" ? (
            <span className="text-sky-600 font-bold flex items-center gap-1.5">
              <PhoneCall size={14} /> Handset currently ringing
            </span>
          ) : (
            <span>Call ID: {callId.slice(0, 16)}…</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyId}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copiedId ? "Copied ID" : "Copy ID"}
          </button>
          <button
            type="button"
            onClick={handleCopyTranscript}
            disabled={!turns.length}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            {copiedTranscript ? <Check size={14} className="text-emerald-600" /> : <MessageSquare size={14} />}
            {copiedTranscript ? "Copied Transcript" : "Copy Transcript"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <X size={14} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
