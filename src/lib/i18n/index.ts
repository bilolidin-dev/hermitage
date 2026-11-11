/**
 * Locale helpers and formatting. Dictionaries are NOT re-exported here so
 * that client code importing helpers does not pull every translation into
 * the bundle. Import them from "@/lib/i18n/dictionaries".
 */
export type { Dictionary, PublicDictionary } from "./dictionaries/ru";
export * from "./config";
export * from "./format";
