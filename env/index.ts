import { z } from "zod";

/**
 * Environment schema and loader.
 * - Parses process.env at runtime on the server only.
 * - Provides typed, validated configuration with sensible defaults for dev.
 * - Do NOT import this file in client components.
 */

// Helpers
const parseBool = (v: unknown, def = false): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return def;
};

const BoolFromEnv = (def = false) =>
  z.preprocess((v) => parseBool(v, def), z.boolean());

const IntFromEnv = (def: number, min?: number) =>
  z.preprocess((v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.length > 0) {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    }
    return def;
  }, z.number().int().refine((n) => (min == null ? true : n >= min), `must be >= ${min}`));

const EnvSchema = z.object({
  // Server connection
  PROXMOX_BASE_URL: z.string().url().default("https://proxmox.example.local:8006"),
  PROXMOX_API_TOKEN_ID: z.string().optional(),
  PROXMOX_API_TOKEN_SECRET: z.string().optional(),

  // TLS
  PROXMOX_INSECURE_TLS: BoolFromEnv(false),

  // Optional SSH tunnel
  PROXMOX_SSH_HOST: z.string().optional(),
  PROXMOX_SSH_PORT: IntFromEnv(22, 1).optional(),
  PROXMOX_SSH_USERNAME: z.string().optional(),
  PROXMOX_SSH_PRIVATE_KEY_PATH: z.string().optional(),
  PROXMOX_SSH_PASSWORD: z.string().optional(),

  // Runtime behavior
  ENABLE_MOCK: BoolFromEnv(false),
  POLL_INTERVAL_MS: IntFromEnv(5000, 500),
  SERVER_CACHE_TTL_MS: IntFromEnv(2000, 0),

  // App
  PORT: IntFromEnv(15000, 1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type Env = z.infer<typeof EnvSchema>;

// Load and cache parsed env (singleton)
let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;

  // Construct a plain object from process.env with only keys we care about
  const raw = {
    PROXMOX_BASE_URL: process.env.PROXMOX_BASE_URL,
    PROXMOX_API_TOKEN_ID: process.env.PROXMOX_API_TOKEN_ID,
    PROXMOX_API_TOKEN_SECRET: process.env.PROXMOX_API_TOKEN_SECRET,
    PROXMOX_INSECURE_TLS: process.env.PROXMOX_INSECURE_TLS,

    PROXMOX_SSH_HOST: process.env.PROXMOX_SSH_HOST,
    PROXMOX_SSH_PORT: process.env.PROXMOX_SSH_PORT,
    PROXMOX_SSH_USERNAME: process.env.PROXMOX_SSH_USERNAME,
    PROXMOX_SSH_PRIVATE_KEY_PATH: process.env.PROXMOX_SSH_PRIVATE_KEY_PATH,
    PROXMOX_SSH_PASSWORD: process.env.PROXMOX_SSH_PASSWORD,

    ENABLE_MOCK: process.env.ENABLE_MOCK,
    POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
    SERVER_CACHE_TTL_MS: process.env.SERVER_CACHE_TTL_MS,

    PORT: process.env.PORT,
    NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"] | undefined) ?? "development",
  };

  const parsed = EnvSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    const allowMissingCreds =
      (raw.NODE_ENV === "development" || raw.NODE_ENV === "test") &&
      parseBool(raw.ENABLE_MOCK, false) === true;
    if (!allowMissingCreds) {
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
  }

  // If credentials are missing but mock is enabled, still produce defaults
  const value = (parsed.success ? parsed.data : EnvSchema.parse({
    ...raw,
    ENABLE_MOCK: "true",
  })) as Env;

  // Additional cross-field validations
  const usingSSH =
    !!value.PROXMOX_SSH_HOST ||
    !!value.PROXMOX_SSH_PRIVATE_KEY_PATH ||
    !!value.PROXMOX_SSH_PASSWORD;
  if (usingSSH && !value.PROXMOX_SSH_HOST) {
    throw new Error("SSH configuration incomplete: PROXMOX_SSH_HOST is required when using SSH options.");
  }

  cached = value;
  return cached;
}

/**
 * Convenience getters. Use only on the server.
 */
export const env = {
  get: loadEnv,
};