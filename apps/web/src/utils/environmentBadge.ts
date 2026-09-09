/**
 * Resolves the environment badge (label + colors) shown in the sidebar/header.
 */
export function resolveEnvironmentBadge(envFromProp?: string | null) {
  const fromEnv = String(process.env.NEXT_PUBLIC_ENV_TO_CALL || "").trim().toLowerCase();
  const fromProp = String(envFromProp || "").trim().toLowerCase();
  const source = fromEnv || fromProp;

  if (source === "integration" || source === "dev" || source === "development") {
    return {
      label: "DEV",
      wrapperClass: "border-emerald-600 bg-emerald-50",
      textClass: "text-emerald-700",
    };
  }

  if (source === "qa" || source === "test") {
    return {
      label: "QA",
      wrapperClass: "border-orange-600 bg-orange-50",
      textClass: "text-orange-700",
    };
  }

  if (source === "prod" || source === "production" || source === "master") {
    return {
      label: "PROD",
      wrapperClass: "border-rose-600 bg-rose-50",
      textClass: "text-rose-700",
    };
  }

  return {
    label: process.env.NODE_ENV === "production" ? "PROD" : "DEV",
    wrapperClass:
      process.env.NODE_ENV === "production"
        ? "border-rose-600 bg-rose-50"
        : "border-emerald-600 bg-emerald-50",
    textClass:
      process.env.NODE_ENV === "production" ? "text-rose-700" : "text-emerald-700",
  };
}
