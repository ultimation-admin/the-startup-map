import { ArticleBlock } from "./db";

export function cleanArticleInput(body: unknown): { title: string; blocks: ArticleBlock[] } | null {
  if (!body || typeof body !== "object") return null;
  const input = body as { title?: unknown; blocks?: unknown };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 180 || !Array.isArray(input.blocks) || input.blocks.length > 40) return null;

  const blocks: ArticleBlock[] = [];
  for (const raw of input.blocks) {
    if (!raw || typeof raw !== "object") return null;
    const block = raw as Record<string, unknown>;
    const id = typeof block.id === "string" ? block.id.slice(0, 80) : crypto.randomUUID();
    if ((block.type === "text" || block.type === "paragraph" || block.type === "h1" || block.type === "h2" || block.type === "h3") && typeof block.text === "string") {
      if (block.text.length > 12000) return null;
      const type = block.type === "text" ? "paragraph" : block.type;
      blocks.push({ id, type, text: block.text });
      continue;
    }
    if ((block.type === "image" || block.type === "link") && typeof block.url === "string") {
      let url: URL | null = null;
      try {
        url = new URL(block.url);
      } catch {
        if (block.type !== "image" || !block.url.startsWith("/api/media?key=")) return null;
      }
      if (url && !["http:", "https:"].includes(url.protocol)) return null;
      if (block.type === "image") {
        const alt = typeof block.alt === "string" ? block.alt.slice(0, 240) : "";
        blocks.push({ id, type: "image", url: block.url.slice(0, 2000), alt });
      } else {
        const label = typeof block.label === "string" ? block.label.trim().slice(0, 240) : "";
        if (!label) return null;
        blocks.push({ id, type: "link", url: block.url.slice(0, 2000), label });
      }
      continue;
    }
    return null;
  }

  if (!blocks.some((block) =>
    ((block.type === "text" || block.type === "paragraph" || block.type === "h1" || block.type === "h2" || block.type === "h3") && block.text.trim()) ||
    (block.type === "image" && block.url) ||
    (block.type === "link" && block.url)
  )) return null;

  return { title, blocks };
}
