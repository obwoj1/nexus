const STOP_WORDS = new Set(["the", "and", "for", "that", "with", "this", "from", "what", "when", "where", "which", "into", "about", "does", "have", "your", "are", "was", "were", "how", "why"]);

export function rankStudySources(query, sources, limit = 4) {
  const terms = [...new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter((term) => !STOP_WORDS.has(term));
  if (!terms.length) return [];
  return sources.map((source) => {
    const content = String(source.content ?? "");
    const searchable = `${source.title} ${source.source_name} ${content}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (searchable.match(new RegExp(term, "g"))?.length ?? 0), 0);
    const earliest = terms.map((term) => content.toLowerCase().indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
    return { id: source.id, title: source.title, sourceName: source.source_name, score, excerpt: content.slice(Math.max(0, earliest - 300), Math.min(content.length, earliest + 1500)).trim() };
  }).filter((source) => source.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
