// Account pages are never listed in search results.
export const noIndex = { robots: { index: false, follow: false } } as const;
