export const compactStringList = (items: string[]): string[] => items.map((item) => item.trim()).filter(Boolean);

export const toPrivacyRecord = (entries: Array<[string, string]>): Record<string, string> =>
  Object.fromEntries(entries.map(([key, value]) => [key.trim(), value.trim()]).filter(([key, value]) => key && value));

export const sameStringArray = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((item, index) => item === right[index]);

export const samePrivacyEntries = (left: Array<[string, string]>, right: Array<[string, string]>): boolean =>
  left.length === right.length && left.every(([key, value], index) => key === right[index][0] && value === right[index][1]);
