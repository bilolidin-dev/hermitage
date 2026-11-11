import type { Locale } from "../config";
import { ky } from "./ky";
import { ru, type Dictionary, type PublicDictionary } from "./ru";
import { uz } from "./uz";

const DICTIONARIES: Record<Locale, Dictionary> = { ru, ky, uz };

/** Full dictionary (public + admin). Used by the admin panel and server code. */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/**
 * Public-site strings for one language. The public layout calls this on the
 * server and passes the result to the client, so public pages ship neither
 * the admin strings nor the other two languages.
 */
export function getPublicDictionary(locale: Locale): PublicDictionary {
  const { admin: _admin, ...rest } = DICTIONARIES[locale];
  void _admin;
  return rest;
}
