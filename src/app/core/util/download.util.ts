export function sanitizeSlug(slug: string): string {
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'board';
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildExportFilename(slug: string, date: Date): string {
  return `${sanitizeSlug(slug)}-${toIsoDate(date)}.md`;
}

export function downloadMarkdown(slug: string, content: string, date: Date = new Date()): void {
  const filename = buildExportFilename(slug, date);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
