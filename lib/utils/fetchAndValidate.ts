import { z } from 'zod';

/**
 * Fetches data from a URL and validates the response against a Zod schema
 * @param url The URL to fetch from
 * @param schema The Zod schema to validate against
 * @param options Optional fetch options
 * @returns The validated response data
 * @throws Error if fetch fails or validation fails
 */
export async function fetchAndValidate<T extends z.ZodType>(
  url: string,
  schema: T,
  options?: RequestInit
): Promise<z.infer<T>> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new Error(
      `Validation error: ${result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`
    );
  }

  return result.data;
}
