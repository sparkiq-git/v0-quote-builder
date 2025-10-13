// /lib/redis.ts
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL!;
const token = process.env.KV_REST_API_TOKEN!; // RW token for writers; readers may use RO token elsewhere

if (!url || !token) {
  throw new Error("Missing KV_REST_API_URL / KV_REST_API_TOKEN");
}

export const redis = new Redis({ url, token });

// Keys (can override index via env)
export const AIRPORTS_INDEX_KEY = process.env.AIRPORTS_INDEX_KEY || "airports:index";
export const AIRPORTS_INDEX_TMP_KEY = "airports:index:tmp";
export const AIRPORT_DOC = (id: string | number) => `airports:doc:${id}`;

// Text helpers
export const sanitize = (s = "") =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export const splitWords = (s?: string | null) => {
  const n = sanitize(s ?? "");
  return n ? Array.from(new Set(n.split(" ").filter(Boolean))) : [];
};
