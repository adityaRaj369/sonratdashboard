"use client";

import { useMemo, useState } from "react";
import { getServiceSubpages } from "@/data/serviceSubpages";
import type { ServiceDefinition } from "@/data/services";

const normalizeLoose = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCompact = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const queryMatchesText = (query: string, text: string) => {
  const looseQuery = normalizeLoose(query);
  if (!looseQuery) return true;

  const looseText = normalizeLoose(text);
  if (looseText.includes(looseQuery)) return true;

  const compactQuery = normalizeCompact(query);
  const compactText = normalizeCompact(text);
  if (compactQuery && compactText.includes(compactQuery)) return true;

  const tokens = looseQuery.split(" ").filter(Boolean);
  return (
    tokens.length > 1 &&
    tokens.every(
      (token) => looseText.includes(token) || compactText.includes(normalizeCompact(token)),
    )
  );
};

const getServiceSearchText = (svc: ServiceDefinition) => {
  const subpages = svc.subpages || getServiceSubpages(svc.key);
  const subpageText = subpages.map((item) => `${item.label || ""} ${item.route || ""}`).join(" ");
  return [
    svc.title,
    svc.key,
    svc.route,
    svc.description,
    svc.group,
    svc.permission,
    subpageText,
  ]
    .filter(Boolean)
    .join(" ");
};

const getServiceDirectSearchText = (svc: ServiceDefinition) =>
  [svc.title, svc.key, svc.route, svc.description, svc.group, svc.permission]
    .filter(Boolean)
    .join(" ");

export const serviceMatchesQuery = (svc: ServiceDefinition, query: string) =>
  queryMatchesText(query, getServiceSearchText(svc));

export const getMatchingServiceSubpages = (svc: ServiceDefinition, query: string) => {
  if (!svc || !String(query || "").trim()) return [];
  const subpages = svc.subpages || getServiceSubpages(svc.key);
  return subpages.filter((subpage) =>
    queryMatchesText(query, `${subpage.label || ""} ${subpage.route || ""}`),
  );
};

export const getServiceSearchTargets = (svc: ServiceDefinition, query: string) => {
  if (!svc) return [];
  const hasQuery = Boolean(String(query || "").trim());
  if (!hasQuery) {
    return [{ type: "service" as const, service: svc, target: svc, key: `service:${svc.key}` }];
  }

  const targets: Array<{
    type: "service" | "subpage";
    service: ServiceDefinition;
    subpage?: { label: string; route: string };
    key: string;
    target: ServiceDefinition & { subpageLabel?: string };
  }> = [];

  if (queryMatchesText(query, getServiceDirectSearchText(svc))) {
    targets.push({ type: "service", service: svc, target: svc, key: `service:${svc.key}` });
  }

  getMatchingServiceSubpages(svc, query).forEach((subpage) => {
    targets.push({
      type: "subpage",
      service: svc,
      subpage,
      key: `subpage:${svc.key}:${subpage.route}`,
      target: {
        ...svc,
        route: subpage.route,
        title: subpage.label,
        subpageLabel: subpage.label,
      },
    });
  });

  return targets;
};

export const findServiceSearchTarget = (svc: ServiceDefinition, query: string) => {
  const targets = getServiceSearchTargets(svc, query);
  return targets.find((target) => target.type === "subpage")?.target || targets[0]?.target || svc || null;
};

export default function useServiceSearch(services: ServiceDefinition[] = []) {
  const [serviceQuery, setServiceQuery] = useState("");

  const filteredServices = useMemo(() => {
    if (!String(serviceQuery || "").trim()) return services;
    return services.filter((svc) => serviceMatchesQuery(svc, serviceQuery));
  }, [serviceQuery, services]);

  const groupedServices = useMemo(() => {
    const map = new Map<string, ServiceDefinition[]>();
    filteredServices.forEach((svc) => {
      const key = svc.group || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(svc);
    });
    return Array.from(map.entries());
  }, [filteredServices]);

  return {
    serviceQuery,
    setServiceQuery,
    filteredServices,
    groupedServices,
  };
}
