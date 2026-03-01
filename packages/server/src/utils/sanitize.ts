import { FilterXSS } from 'xss';

const xssFilter = new FilterXSS({
  whiteList: {},          // no tags allowed
  stripIgnoreTag: true,   // strip all non-whitelisted tags
  stripIgnoreTagBody: ['script', 'style'],
});

/** Sanitize a string to remove XSS payloads */
export function sanitize(input: string): string {
  return xssFilter.process(input);
}

/** Sanitize an object's string values (shallow) */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = sanitize(result[key] as string);
    }
  }
  return result;
}
