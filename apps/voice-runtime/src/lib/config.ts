import { getConfig, loadConfig, type AppConfig } from "@sonrat/config";

export type VoiceRuntimeConfig = AppConfig & {
  port: number;
  apiInternalBaseUrl: string;
};

export function loadVoiceConfig(
  env: NodeJS.ProcessEnv = process.env,
): VoiceRuntimeConfig {
  const base = loadConfig(env);
  return {
    ...base,
    port: base.VOICE_RUNTIME_PORT,
    apiInternalBaseUrl: `${base.API_BASE_URL}/internal`,
  };
}

export function getVoiceConfig(): VoiceRuntimeConfig {
  const base = getConfig();
  return {
    ...base,
    port: base.VOICE_RUNTIME_PORT,
    apiInternalBaseUrl: `${base.API_BASE_URL}/internal`,
  };
}
