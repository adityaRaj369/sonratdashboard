import {
  loadDemoStore,
  mutateDemoStore,
  pushAudit,
  uid,
  type DemoCatalog,
  type DemoTerm,
  type DemoTermPair,
} from "./demo-admin-store";

export async function listCatalogs(): Promise<DemoCatalog[]> {
  return loadDemoStore().catalogs;
}

export async function createCatalog(input: {
  title: string;
  description?: string;
  catalogKey?: string;
}): Promise<DemoCatalog> {
  let created: DemoCatalog | null = null;
  mutateDemoStore((state) => {
    const catalogKey =
      input.catalogKey ||
      input.title
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    const id = uid("cat");
    created = {
      _id: id,
      id,
      title: input.title,
      description: input.description || "",
      catalogKey,
      internalId: catalogKey,
    };
    state.catalogs.push(created);
    state.termsByCatalog[id] = [];
    pushAudit(state, {
      user: "Demo Admin",
      userEmail: "admin@sonrat.io",
      scope: "Taxonomy",
      action: "Created",
      details: `Created module ${created.title}`,
      pagePath: "Modules",
      module: "Modules",
      after: created,
    });
  });
  return created!;
}

export async function updateCatalog(
  catalogId: string,
  input: { title?: string; description?: string; catalogKey?: string },
): Promise<DemoCatalog> {
  let updated: DemoCatalog | null = null;
  mutateDemoStore((state) => {
    const catalog = state.catalogs.find(
      (c) => c._id === catalogId || c.id === catalogId || c.catalogKey === catalogId,
    );
    if (!catalog) throw new Error("Catalog not found");
    const before = { ...catalog };
    if (input.title !== undefined) catalog.title = input.title;
    if (input.description !== undefined) catalog.description = input.description;
    if (input.catalogKey !== undefined) {
      catalog.catalogKey = input.catalogKey;
      catalog.internalId = input.catalogKey;
    }
    updated = catalog;
    pushAudit(state, {
      user: "Demo Admin",
      userEmail: "admin@sonrat.io",
      scope: "Taxonomy",
      action: "Modified",
      details: `Updated module ${catalog.title}`,
      pagePath: "Modules",
      module: "Modules",
      before,
      after: { ...catalog },
    });
  });
  return updated!;
}

export async function deleteCatalog(catalogId: string): Promise<void> {
  mutateDemoStore((state) => {
    const idx = state.catalogs.findIndex(
      (c) => c._id === catalogId || c.id === catalogId || c.catalogKey === catalogId,
    );
    if (idx < 0) throw new Error("Catalog not found");
      const [removed] = state.catalogs.splice(idx, 1);
      if (!removed) throw new Error("Catalog not found");
      delete state.termsByCatalog[removed._id];
      delete state.termsByCatalog[removed.id];
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Taxonomy",
        action: "Deleted",
        details: `Deleted module ${removed.title}`,
        pagePath: "Modules",
        module: "Modules",
        before: removed,
      });
  });
}

export async function listTerms(catalogId: string): Promise<DemoTerm[]> {
  const state = loadDemoStore();
  return state.termsByCatalog[catalogId] || [];
}

export async function createTerm(
  catalogId: string,
  input: { label: string; description?: string; key?: string; pairs?: DemoTermPair[] },
): Promise<DemoTerm> {
  let created: DemoTerm | null = null;
  mutateDemoStore((state) => {
    if (!state.termsByCatalog[catalogId]) state.termsByCatalog[catalogId] = [];
    const id = uid("term");
    created = {
      _id: id,
      id,
      label: input.label,
      description: input.description || "",
      key: input.key,
      pairs: input.pairs || [],
    };
    state.termsByCatalog[catalogId].push(created);
    pushAudit(state, {
      user: "Demo Admin",
      userEmail: "admin@sonrat.io",
      scope: "Taxonomy",
      action: "Created",
      details: `Created field ${created.label}`,
      pagePath: "Modules",
      module: "Modules",
      after: created,
    });
  });
  return created!;
}

export async function updateTerm(
  catalogId: string,
  termId: string,
  input: { label?: string; description?: string; pairs?: DemoTermPair[] },
): Promise<DemoTerm> {
  let updated: DemoTerm | null = null;
  mutateDemoStore((state) => {
    const terms = state.termsByCatalog[catalogId] || [];
    const term = terms.find((t) => t.id === termId || t._id === termId);
    if (!term) throw new Error("Term not found");
    const before = { ...term, pairs: [...(term.pairs || [])] };
    if (input.label !== undefined) term.label = input.label;
    if (input.description !== undefined) term.description = input.description;
    if (input.pairs !== undefined) term.pairs = input.pairs;
    updated = term;
    pushAudit(state, {
      user: "Demo Admin",
      userEmail: "admin@sonrat.io",
      scope: "Taxonomy",
      action: "Modified",
      details: `Updated field ${term.label}`,
      pagePath: "Modules",
      module: "Modules",
      before,
      after: { ...term },
    });
  });
  return updated!;
}

export async function deleteTerm(catalogId: string, termId: string): Promise<void> {
  mutateDemoStore((state) => {
    const terms = state.termsByCatalog[catalogId] || [];
    const idx = terms.findIndex((t) => t.id === termId || t._id === termId);
    if (idx < 0) throw new Error("Term not found");
    const [removed] = terms.splice(idx, 1);
    if (!removed) throw new Error("Term not found");
    pushAudit(state, {
      user: "Demo Admin",
      userEmail: "admin@sonrat.io",
      scope: "Taxonomy",
      action: "Deleted",
      details: `Deleted field ${removed.label}`,
      pagePath: "Modules",
      module: "Modules",
      before: removed,
    });
  });
}
