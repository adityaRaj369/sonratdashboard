// @ts-nocheck
"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, PlusCircle, Edit3, Trash2, List, Pencil } from "lucide-react";
import { listTerms, createTerm, updateTerm, deleteTerm } from "@/services/adminConsole/taxonomy.service";

const PAIR_TYPE_OPTIONS = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "json", label: "JSON" },
  { value: "miss", label: "Miss" },
  { value: "listOption", label: "List Option" },
  { value: "date", label: "Date" },
];
const PAIR_TYPE_BY_LOWER = PAIR_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value.toLowerCase()] = option.value;
  return acc;
}, {});

const Portal = ({ children }) => {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
};

export default function Taxonomy({
  games = [],
  onAddGame,
  onEditGame,
  onDeleteGame,
  catalogLoading = false,
  catalogError = null,
  catalogSaving = false,
  catalogDeleting = false,
  onRefreshCatalogs,
}: any) {
  const pairIdRef = useRef(0);
  const nextPairId = useCallback(() => {
    pairIdRef.current += 1;
    return `pair-${pairIdRef.current}`;
  }, []);

  const handleAddModule = () => {
    if (typeof onAddGame === "function") {
      onAddGame();
    }
  };

  const handleEditModule = (game) => {
    if (typeof onEditGame === "function") {
      onEditGame(game);
    }
  };

  const handleDeleteModule = (game) => {
    if (typeof onDeleteGame === "function") {
      onDeleteGame(game);
    }
  };

  const [termsPanel, setTermsPanel] = useState({ open: false, entry: null, catalogId: null, terms: [] });
  const [termEditor, setTermEditor] = useState({ active: false, termId: null, name: "", description: "", jsonPairs: [], jsonError: null });
  const [termModal, setTermModal] = useState({ open: false, name: "", description: "" });
  const [termDeleteConfirm, setTermDeleteConfirm] = useState({ open: false, term: null });
  const [termsStatus, setTermsStatus] = useState({ loading: false, error: null });
  const [termActionError, setTermActionError] = useState(null);
  const [termSaving, setTermSaving] = useState(false);
  const [termCreating, setTermCreating] = useState(false);
  const [termDeleting, setTermDeleting] = useState(false);
  const [rawJsonEditor, setRawJsonEditor] = useState({ enabled: false, value: "[]", error: null });

  const inferPairType = useCallback((value, explicitType = null) => {
    const normalizedExplicit = explicitType ? PAIR_TYPE_BY_LOWER[String(explicitType).toLowerCase()] : null;
    if (normalizedExplicit) return normalizedExplicit;
    if (Array.isArray(value)) return "listOption";
    if (value && typeof value === "object") return "json";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "string";
  }, []);

  const serializePairValue = useCallback((value, type) => {
    if (type === "json" || type === "listOption") {
      try {
        const fallback = type === "listOption" ? [] : {};
        return JSON.stringify(value ?? fallback, null, 2);
      } catch {
        return type === "listOption" ? "[]" : "{}";
      }
    }
    if (value === null || typeof value === "undefined") return "";
    return String(value);
  }, []);

  const interpretPairValue = useCallback((pair) => {
    const raw = pair?.value ?? "";
    const type = (pair?.type || "string").toLowerCase();
    if (type === "number") {
      const parsed = Number(raw);
      return { value: Number.isNaN(parsed) ? 0 : parsed, error: false };
    }
    if (type === "boolean") {
      return { value: raw === true || String(raw).toLowerCase() === "true", error: false };
    }
    if (type === "json") {
      try {
        return { value: raw ? JSON.parse(raw) : {}, error: false };
      } catch {
        return { value: raw, error: true };
      }
    }
    if (type === "date") {
      const date = raw ? new Date(raw) : null;
      if (!date || Number.isNaN(date.getTime())) {
        return { value: raw, error: true };
      }
      return { value: date.toISOString(), error: false };
    }
    if (type === "listoption") {
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          return { value: parsed, error: false };
        }
      } catch {
        /* fall through */
      }
      const list = String(raw || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      return { value: list, error: false };
    }
    return { value: raw, error: false };
  }, []);

  const buildPreviewRowsFromPairs = useCallback(
    (pairs = []) =>
      pairs
      .filter((pair) => pair.key?.trim())
      .map((pair) => {
        const interpreted = interpretPairValue(pair);
        return {
          key: pair.key.trim(),
          value: interpreted.value,
          type: pair.type || "string",
        };
      }),
    [interpretPairValue]
  );

  const previewRows = useMemo(() => buildPreviewRowsFromPairs(termEditor.jsonPairs || []), [termEditor.jsonPairs, buildPreviewRowsFromPairs]);
  const previewJsonText = useMemo(() => JSON.stringify(previewRows, null, 2), [previewRows]);

  useEffect(() => {
    if (!rawJsonEditor.enabled) {
      setRawJsonEditor((prev) => ({ ...prev, value: previewJsonText, error: null }));
    }
  }, [previewJsonText, rawJsonEditor.enabled]);

  const parseRawJsonToPairs = useCallback(
    (rawText) => {
      let parsed;
      try {
        parsed = JSON.parse(rawText || "[]");
      } catch {
        return { pairs: null, error: "Invalid JSON format." };
      }

      let rows = [];
      if (Array.isArray(parsed)) {
        const malformed = parsed.find((item) => !item || typeof item !== "object" || Array.isArray(item) || !("key" in item));
        if (malformed) {
          return { pairs: null, error: 'Array JSON must contain objects with at least "key" (and optional "value"/"type").' };
        }
        rows = parsed.map((item) => ({
          key: item.key,
          value: item.value,
          type: item.type,
        }));
      } else if (parsed && typeof parsed === "object") {
        rows = Object.entries(parsed).map(([key, value]) => ({ key, value }));
      } else {
        return { pairs: null, error: "JSON must be an object or an array of { key, value, type }." };
      }

      const mappedPairs = rows
        .map((row) => {
          const key = String(row.key ?? "").trim();
          if (!key) return null;
          const type = inferPairType(row.value, row.type);
          return {
            id: nextPairId(),
            key,
            type,
            value: serializePairValue(row.value, type),
          };
        })
        .filter(Boolean);

      return { pairs: mappedPairs, error: null };
    },
    [inferPairType, nextPairId, serializePairValue]
  );

  const applyRawJsonToFields = useCallback(() => {
    const { pairs, error } = parseRawJsonToPairs(rawJsonEditor.value);
    if (error) {
      setRawJsonEditor((prev) => ({ ...prev, error }));
      return null;
    }
    setTermEditor((prev) => ({
      ...prev,
      jsonPairs: pairs,
      jsonError: null,
    }));
    const nextPreview = JSON.stringify(buildPreviewRowsFromPairs(pairs), null, 2);
    setRawJsonEditor({ enabled: false, value: nextPreview, error: null });
    return pairs;
  }, [buildPreviewRowsFromPairs, parseRawJsonToPairs, rawJsonEditor.value]);

  const canonicalizeCatalogId = useCallback((entry) => entry?._id || entry?.id || entry?.catalogKey || entry?.internalId || null, []);

  const refreshTerms = useCallback(
    async (catalogId) => {
      if (!catalogId) return;
      setTermsStatus({ loading: true, error: null });
      try {
        const terms = await listTerms(catalogId);
        const mapped = (terms || []).map((term) => ({
          id: term._id || term.id,
          value: term.label,
          description: term.description ?? term.raw?.description ?? "",
          json: term.pairs || [],
          raw: term,
        }));
        setTermsPanel((prev) => ({ ...prev, terms: mapped }));
      } catch (err) {
        setTermsStatus({ loading: false, error: err?.message || "Failed to load fields" });
        return;
      }
      setTermsStatus({ loading: false, error: null });
    },
    []
  );

  const openTermsPanel = useCallback(
    (entry) => {
      const catalogId = canonicalizeCatalogId(entry);
      setTermsPanel({ open: true, entry, catalogId, terms: [] });
      setTermEditor({ active: false, termId: null, name: "", description: "", jsonPairs: [], jsonError: null });
      setTermModal({ open: false, name: "", description: "" });
      setRawJsonEditor({ enabled: false, value: "[]", error: null });
      refreshTerms(catalogId);
    },
    [canonicalizeCatalogId, refreshTerms]
  );

  const closeTermsPanel = useCallback(() => {
    setTermsPanel({ open: false, entry: null, catalogId: null, terms: [] });
    setTermEditor({ active: false, termId: null, name: "", description: "", jsonPairs: [], jsonError: null });
    setTermModal({ open: false, name: "", description: "" });
    setTermsStatus({ loading: false, error: null });
    setTermActionError(null);
    setRawJsonEditor({ enabled: false, value: "[]", error: null });
  }, []);

  const deriveKeyValuePairs = useCallback(
    (json = []) => {
      const rows = Array.isArray(json)
        ? json
        : json && typeof json === "object"
        ? Object.entries(json).map(([key, value]) => ({ key, value }))
        : [];
      return rows.map((row) => {
        const source = typeof row?.value !== "undefined" ? row.value : row?.name;
        const inferredType = row?.type
          ? row.type
          : typeof source === "number"
          ? "number"
          : typeof source === "boolean"
          ? "boolean"
          : typeof source === "object"
          ? "json"
          : "string";
        const normalizedValue = (() => {
          if (typeof source === "object" && source !== null) {
            try {
              return JSON.stringify(source, null, 2);
            } catch {
              return "{}";
            }
          }
          if (typeof source === "undefined" || source === null) return "";
          return String(source);
        })();
        return {
          id: nextPairId(),
          key: row?.key || "",
          value: normalizedValue,
          type: inferredType,
        };
      });
    },
    [nextPairId]
  );

  const startTermEdit = useCallback(
    (term) => {
      if (!term) return;
      const draftJson = term.raw?.pairs || term.json || {};
      const initialPairs = deriveKeyValuePairs(draftJson);
      const initialPreview = JSON.stringify(buildPreviewRowsFromPairs(initialPairs), null, 2);
      setTermEditor({
        active: true,
        termId: term.id,
        name: term.raw?.label || term.value,
        description: term.raw?.description || term.description || "",
        jsonPairs: initialPairs,
        jsonError: null,
      });
      setRawJsonEditor({ enabled: false, value: initialPreview, error: null });
      setTermActionError(null);
    },
    [buildPreviewRowsFromPairs, deriveKeyValuePairs]
  );

  const cancelTermEdit = useCallback(() => {
    setTermEditor({ active: false, termId: null, name: "", description: "", jsonPairs: [], jsonError: null });
    setRawJsonEditor({ enabled: false, value: "[]", error: null });
    setTermActionError(null);
  }, []);

  const saveTermEdit = useCallback(async () => {
    if (!termsPanel.catalogId || !termEditor.termId) return;
    if (!termEditor.termId) return;
    const pairs = rawJsonEditor.enabled ? applyRawJsonToFields() : termEditor.jsonPairs || [];
    if (!pairs) return;
    const interpretedPairs = pairs.map((pair) => ({ pair, interpreted: interpretPairValue(pair) }));
    const invalidJson = interpretedPairs.find(({ pair, interpreted }, idx) => {
      const type = (pair.type || "string").toLowerCase();
      return type === "json" && interpreted.error;
    });

    if (invalidJson) {
      setTermEditor((prev) => ({
        ...prev,
        jsonError: `Invalid JSON in "${invalidJson.pair.key?.trim() || "Field"}"`,
      }));
      return;
    }

    setTermEditor((prev) => ({ ...prev, jsonError: null }));

    const jsonArray = interpretedPairs
      .filter(({ pair }) => pair?.key?.trim())
      .map(({ pair, interpreted }) => ({
        key: pair.key.trim(),
        value: interpreted.value,
        type: pair.type || "string",
      }));

    setTermSaving(true);
    setTermActionError(null);
    try {
      await updateTerm(termsPanel.catalogId, termEditor.termId, {
        label: termEditor.name.trim() || "Unnamed Field",
        description: termEditor.description.trim(),
        pairs: jsonArray,
      });
      setTermEditor({ active: false, termId: null, name: "", description: "", jsonPairs: [], jsonError: null });
      refreshTerms(termsPanel.catalogId);
    } catch (err) {
      setTermActionError(err?.message || "Failed to save field");
    } finally {
      setTermSaving(false);
    }
  }, [applyRawJsonToFields, interpretPairValue, rawJsonEditor.enabled, refreshTerms, termEditor, termsPanel.catalogId]);

  const openTermModal = useCallback(() => {
    setTermModal({ open: true, name: "", description: "" });
    setTermActionError(null);
  }, []);

  const normalizeTermKey = useCallback(
    (value = "") =>
      value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, ""),
    []
  );

  const handleSaveTerm = useCallback(async () => {
    if (!termsPanel.catalogId) return;
    const name = termModal.name.trim();
    if (!name) return;
    const description = termModal.description.trim();
    const defaultKey = normalizeTermKey(name);
    const defaultPairs = [{ key: defaultKey || name.replace(/\s+/g, "_"), value: name, type: "string" }];
    setTermCreating(true);
    setTermActionError(null);
    try {
      await createTerm(termsPanel.catalogId, {
        label: name,
        description,
        key: defaultKey,
        pairs: defaultPairs,
      });
      setTermModal({ open: false, name: "", description: "" });
      refreshTerms(termsPanel.catalogId);
    } catch (err) {
      setTermActionError(err?.message || "Failed to add field");
    } finally {
      setTermCreating(false);
    }
  }, [normalizeTermKey, refreshTerms, termModal.description, termModal.name, termsPanel.catalogId]);

  const confirmDeleteTerm = useCallback(async () => {
    const target = termDeleteConfirm.term;
    if (!target || !termsPanel.catalogId) return;
    setTermDeleting(true);
    setTermActionError(null);
    try {
      await deleteTerm(termsPanel.catalogId, target.id);
      setTermDeleteConfirm({ open: false, term: null });
      if (termEditor.termId === target.id) {
        setTermEditor({ active: false, termId: null, name: "", description: "", jsonPairs: [], jsonError: null });
      }
      refreshTerms(termsPanel.catalogId);
    } catch (err) {
      setTermActionError(err?.message || "Failed to delete field");
      setTermDeleteConfirm({ open: false, term: null });
    } finally {
      setTermDeleting(false);
    }
  }, [refreshTerms, termDeleteConfirm.term, termEditor.termId, termsPanel.catalogId]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">Modules</h2>
          <p className="text-slate-500 mt-1 font-medium italic">Define canonical titles, tags, and identifiers for the SEAM ecosystem.</p>
          {catalogError && <p className="text-xs text-rose-500 mt-2">{catalogError}</p>}
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md"
          onClick={handleAddModule}
          disabled={catalogSaving}
        >
          <PlusCircle size={14} /> {catalogSaving ? "Saving..." : "Add Module"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {catalogLoading ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            Loading modules…
          </div>
        ) : games.length === 0 ? (
          <div className="col-span-full text-center text-sm text-slate-500">No catalogs found.</div>
        ) : (
          games.map((game, index) => (
            <div
              key={game.id || index}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 transition-all hover:shadow-md group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                  <Gamepad2 size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditModule(game)}
                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    aria-label="Edit module"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModule(game)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    aria-label="Delete module"
                    disabled={catalogDeleting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-black text-slate-800 text-[14px] leading-tight mb-1">{game.title}</h3>
              <p className="text-slate-500 text-xs line-clamp-2">{game.description || ""}</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter italic border-t border-slate-50 pt-3 mt-3">
                KEY: {game.catalogKey || game.internalId || "—"}
              </p>
              <button
                type="button"
                onClick={() => openTermsPanel(game)}
                className="mt-4 inline-flex items-center justify-center gap-2 w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wide rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <List size={14} /> View Fields
              </button>
            </div>
          ))
        )}
      </div>
      {termsPanel.open && (
        <Portal>
          <div className="fixed inset-0 z-[230] flex justify-end">
            <div className="flex-1 bg-slate-900/30 backdrop-blur-[1px]" onClick={closeTermsPanel} />
            <aside className="relative h-full w-full max-w-[80vw] bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right flex flex-col">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Module Fields</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{termsPanel.entry?.title}</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-xl">
                  {termsPanel.entry?.description || "Explore taxonomy metadata mapped to this module."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTermsPanel}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {termsStatus.loading && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                  Loading fields…
                </div>
              )}
              {termsStatus.error && (
                <div className="text-xs text-rose-500">{termsStatus.error}</div>
              )}
              {termActionError && (
                <div className="text-xs text-rose-500">{termActionError}</div>
              )}
              {termEditor.active ? (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Name
                        <input
                          value={termEditor.name}
                          onChange={(e) => setTermEditor((prev) => ({ ...prev, name: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Description
                        <input
                          value={termEditor.description}
                          onChange={(e) => setTermEditor((prev) => ({ ...prev, description: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={cancelTermEdit}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveTermEdit}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50"
                        disabled={termSaving}
                      >
                        {termSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">JSON Form</label>
                      <div className="mt-3 space-y-3">
                        {(termEditor.jsonPairs || []).map((pair, idx) => (
                          <div key={pair.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <input
                              value={pair.key}
                              onChange={(e) =>
                                setTermEditor((prev) => {
                                  const next = [...(prev.jsonPairs || [])];
                                  next[idx] = { ...next[idx], key: e.target.value };
                                  return { ...prev, jsonPairs: next };
                                })
                              }
                              placeholder="Key"
                              className="md:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                            />
                            {pair.type === "json" ? (
                              <textarea
                                value={pair.value}
                                onChange={(e) =>
                                  setTermEditor((prev) => {
                                    const next = [...(prev.jsonPairs || [])];
                                    next[idx] = { ...next[idx], value: e.target.value };
                                    return { ...prev, jsonPairs: next };
                                  })
                                }
                                placeholder='{"key":"Day3"}'
                                className="md:col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                                rows={pair.type === "json" ? 3 : 1}
                              />
                            ) : (
                              <input
                                value={pair.value}
                                onChange={(e) =>
                                  setTermEditor((prev) => {
                                    const next = [...(prev.jsonPairs || [])];
                                    next[idx] = { ...next[idx], value: e.target.value };
                                    return { ...prev, jsonPairs: next };
                                  })
                                }
                                placeholder="Value"
                                className="md:col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                              />
                            )}
                            <select
                              value={pair.type}
                              onChange={(e) =>
                                setTermEditor((prev) => {
                                  const next = [...(prev.jsonPairs || [])];
                                  next[idx] = { ...next[idx], type: e.target.value };
                                  return { ...prev, jsonPairs: next };
                                })
                              }
                              className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                            >
                              {PAIR_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                setTermEditor((prev) => ({
                                  ...prev,
                                  jsonPairs: (prev.jsonPairs || []).filter((row) => row !== pair),
                                }))
                              }
                              className="md:col-span-1 px-3 py-2 text-xs font-bold text-rose-600"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setTermEditor((prev) => ({
                              ...prev,
                              jsonPairs: [
                                ...(prev.jsonPairs || []),
                                { id: nextPairId(), key: "", value: "", type: "string" },
                              ],
                            }))
                          }
                          className="px-3 py-2 text-xs font-bold text-indigo-600 border border-indigo-100 rounded-lg"
                        >
                          Add Field
                        </button>
                        {termEditor.jsonError && (
                          <p className="text-[11px] font-bold text-rose-600">{termEditor.jsonError}</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Preview</label>
                        <button
                          type="button"
                          onClick={() =>
                            setRawJsonEditor((prev) => ({
                              ...prev,
                              enabled: !prev.enabled,
                              error: null,
                              value: !prev.enabled ? previewJsonText : previewJsonText,
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          title="Edit raw JSON"
                        >
                          <Pencil size={12} /> {rawJsonEditor.enabled ? "Close" : "Edit JSON"}
                        </button>
                      </div>
                      {rawJsonEditor.enabled ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={rawJsonEditor.value}
                            onChange={(e) => setRawJsonEditor((prev) => ({ ...prev, value: e.target.value, error: null }))}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono px-3 py-3 min-h-[220px]"
                          />
                          {rawJsonEditor.error ? (
                            <p className="text-[11px] font-bold text-rose-600">{rawJsonEditor.error}</p>
                          ) : null}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRawJsonEditor({ enabled: false, value: previewJsonText, error: null })}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={applyRawJsonToFields}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                            >
                              Apply JSON
                            </button>
                          </div>
                        </div>
                      ) : (
                        <pre className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono px-3 py-3 min-h-[220px]">
                          {previewJsonText}
                        </pre>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={cancelTermEdit}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={saveTermEdit}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50"
                      disabled={termSaving}
                    >
                      {termSaving ? "Saving..." : "Save JSON"}
                    </button>
                  </div>
                </div>
              ) : termsPanel.terms.length === 0 ? (
                <div className="h-full min-h-[320px] grid place-items-center rounded-2xl border border-dashed border-slate-200 text-center px-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">No fields available yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Use the action bar to seed taxonomy metadata.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {termsPanel.terms.map((term, index) => (
                    <div key={term.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-800">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="w-8 text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                        <div className="flex items-baseline gap-3 flex-1 min-w-0">
                          <span className="font-semibold tracking-tight truncate">{term.value}</span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {term.description || ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startTermEdit(term)}
                          className="px-3 py-1 text-xs font-bold text-indigo-600 border border-indigo-100 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setTermDeleteConfirm({ open: true, term })}
                          className="px-3 py-1 text-xs font-bold text-rose-600 border border-rose-100 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <div className="text-xs text-slate-400 uppercase tracking-[0.35em]">
                FIELDS {String(termsPanel.terms.length).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={openTermModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow hover:bg-slate-800 disabled:opacity-50"
                disabled={termCreating}
              >
                {termCreating ? "Adding..." : "Add Field"}
              </button>
            </div>
            </aside>
          </div>
        </Portal>
      )}

      {termDeleteConfirm.open && (
        <Portal>
          <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400">Delete Field</p>
              <h3 className="text-xl font-black text-slate-900">Remove module field?</h3>
              <p className="text-xs text-slate-500 mt-2">
                This will remove &quot;{termDeleteConfirm.term?.value}&quot; from the list.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTermDeleteConfirm({ open: false, term: null })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTerm}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50"
                disabled={termDeleting}
              >
                {termDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
            </div>
          </div>
        </Portal>
      )}

      {termModal.open && (
        <Portal>
          <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Add Field</p>
              <h3 className="text-xl font-black text-slate-900">Module Field</h3>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Name
                <input
                  type="text"
                  value={termModal.name}
                  onChange={(e) => setTermModal((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Enter field name"
                  autoFocus
                />
              </label>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Description
                <textarea
                  value={termModal.description}
                  onChange={(e) => setTermModal((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Optional description"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTermModal({ open: false, name: "", description: "" })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTerm}
                disabled={!termModal.name.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Field
              </button>
            </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
