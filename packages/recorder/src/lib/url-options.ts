export const URL_OPTION_QUERY_KEY = "rrr";

function readRawOptions(search: string | undefined): string[] {
  if (search == null || search.length === 0) {
    return [];
  }

  try {
    const params = new URLSearchParams(search);
    const values = params.getAll(URL_OPTION_QUERY_KEY);
    return values
      .flatMap((value) => value.split(","))
      .map((option) => option.trim().toLowerCase())
      .filter((option) => option.length > 0);
  } catch {
    return [];
  }
}

export function readUrlOptions(search?: string): Set<string> {
  const source = search ?? (typeof window === "undefined" ? undefined : window.location?.search);
  return new Set(readRawOptions(source));
}

export function hasUrlOption(option: string, search?: string): boolean {
  return readUrlOptions(search).has(option.toLowerCase());
}
