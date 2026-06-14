export const extractText = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const wordFreq = (text: string): Map<string, number> => {
  const freq = new Map<string, number>();
  for (const word of text.split(/\W+/).filter(w => w.length > 2)) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return freq;
};

export const cosineSimilarity = (a: Map<string, number>, b: Map<string, number>): number => {
  let dot = 0, normA = 0, normB = 0;
  for (const [w, v] of a) { normA += v * v; if (b.has(w)) dot += v * b.get(w)!; }
  for (const [, v] of b) normB += v * v;
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const similarityColor = (score: number): string => {
  const r = score < 0.5 ? 255 : Math.round(255 * (1 - (score - 0.5) * 2));
  const g = score > 0.5 ? 255 : Math.round(255 * score * 2);
  return `rgb(${r},${g},60)`;
};
