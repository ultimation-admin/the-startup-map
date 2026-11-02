"use client";

import { useCallback, useEffect, useState } from "react";
import { ArticleBlock, Listing, ProfileArticle } from "@/lib/db";
import { uploadFileToR2 } from "@/lib/uploadClient";

interface ProfileArticlesProps {
  profile: Listing;
  canManageArticles: boolean;
}

type TextBlockType = "paragraph" | "h1" | "h2" | "h3";
type EditorCommand = TextBlockType | "image" | "link";

const commands: Array<{ type: EditorCommand; label: string; description: string }> = [
  { type: "h1", label: "H1", description: "Large heading" },
  { type: "h2", label: "H2", description: "Medium heading" },
  { type: "h3", label: "H3", description: "Small heading" },
  { type: "paragraph", label: "Paragraph", description: "Plain text block" },
  { type: "image", label: "Image", description: "Upload an image" },
  { type: "link", label: "Link", description: "Add a linked page" },
];

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankParagraph(): ArticleBlock {
  return { id: makeId(), type: "paragraph", text: "" };
}

function articleTitle(blocks: ArticleBlock[]) {
  const firstHeading = blocks.find((block) => block.type === "h1" && block.text.trim());
  if (firstHeading && "text" in firstHeading) return firstHeading.text.trim().slice(0, 180);
  const firstText = blocks.find((block) => "text" in block && block.text.trim());
  if (firstText && "text" in firstText) return firstText.text.trim().split(/\r?\n/)[0].slice(0, 180);
  const firstLink = blocks.find((block) => block.type === "link" && block.label.trim());
  if (firstLink && firstLink.type === "link") return firstLink.label.trim().slice(0, 180);
  return "Untitled article";
}

function updateEditorUrl(mode: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set("profileTab", "articles");
  if (mode) url.searchParams.set("articleEditor", mode);
  else url.searchParams.delete("articleEditor");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function editableTextBlock(block: ArticleBlock): block is Extract<ArticleBlock, { text: string }> {
  return block.type === "text" || block.type === "paragraph" || block.type === "h1" || block.type === "h2" || block.type === "h3";
}

export function ProfileArticles({ profile, canManageArticles }: ProfileArticlesProps) {
  const [articles, setArticles] = useState<ProfileArticle[]>([]);
  const [canManage, setCanManage] = useState(canManageArticles);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?profile_id=${encodeURIComponent(profile.id)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Articles could not be loaded.");
      const data = await res.json();
      const loaded: ProfileArticle[] = data.articles || [];
      setArticles(loaded);
      setCanManage(canManageArticles || Boolean(data.can_manage));

      const editorMode = new URLSearchParams(window.location.search).get("articleEditor");
      if (editorMode && editorMode !== "new") {
        const article = loaded.find((item) => item.slug === editorMode);
        if (article) {
          setEditing(true);
          setEditingSlug(article.slug);
          setBlocks(article.blocks.length ? article.blocks : [blankParagraph()]);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Articles could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [canManageArticles, profile.id]);

  useEffect(() => {
    const editorMode = new URLSearchParams(window.location.search).get("articleEditor");
    if (editorMode === "new") {
      setEditing(true);
      const paragraph = blankParagraph();
      setBlocks([paragraph]);
      setFocusBlockId(paragraph.id);
    }
  }, [profile.id]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (!focusBlockId) return;
    document.getElementById(`article-block-${focusBlockId}`)?.focus();
    setFocusBlockId(null);
  }, [blocks, focusBlockId]);

  const startNewArticle = () => {
    const paragraph = blankParagraph();
    setEditingSlug(null);
    setBlocks([paragraph]);
    setSlashMenuBlockId(null);
    setFocusBlockId(paragraph.id);
    setMessage("");
    setEditing(true);
    updateEditorUrl("new");
  };

  const startEditArticle = (article: ProfileArticle) => {
    setEditingSlug(article.slug);
    setBlocks(article.blocks.length ? article.blocks : [blankParagraph()]);
    setSlashMenuBlockId(null);
    setMessage("");
    setEditing(true);
    updateEditorUrl(article.slug);
  };

  const closeEditor = () => {
    setEditing(false);
    setEditingSlug(null);
    setSlashMenuBlockId(null);
    setMessage("");
    updateEditorUrl(null);
  };

  const updateBlock = (id: string, update: Partial<ArticleBlock>) => {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, ...update } as ArticleBlock : block));
  };

  const insertParagraphAfter = (id: string) => {
    const paragraph = blankParagraph();
    setFocusBlockId(paragraph.id);
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      if (index < 0) return [...current, paragraph];
      const next = [...current];
      next.splice(index + 1, 0, paragraph);
      return next;
    });
  };

  const applyCommand = (id: string, command: EditorCommand) => {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      if (index < 0) return current;
      const next = [...current];
      if (command === "image") {
        next[index] = { id, type: "image", url: "", alt: "" };
        next.splice(index + 1, 0, blankParagraph());
      } else if (command === "link") {
        next[index] = { id, type: "link", url: "", label: "" };
        next.splice(index + 1, 0, blankParagraph());
      } else next[index] = { id, type: command, text: "" };
      return next;
    });
    setSlashMenuBlockId(null);
    if (command === "h1" || command === "h2" || command === "h3" || command === "paragraph") setFocusBlockId(id);
  };

  const uploadImage = async (id: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file.");
      return;
    }
    setUploadingBlockId(id);
    setMessage("");
    try {
      const result = await uploadFileToR2(file, "posts");
      updateBlock(id, { url: result.url } as Partial<ArticleBlock>);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingBlockId(null);
    }
  };

  const saveArticle = async () => {
    setSaving(true);
    setMessage("");
    try {
      const title = articleTitle(blocks);
      const endpoint = editingSlug ? `/api/articles/${encodeURIComponent(editingSlug)}` : "/api/articles";
      const res = await fetch(endpoint, {
        method: editingSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profile.id, title, blocks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The article could not be published.");
      const article = data.article as ProfileArticle;
      setArticles((current) => editingSlug
        ? current.map((item) => item.slug === editingSlug ? article : item)
        : [article, ...current]);
      setEditing(false);
      setEditingSlug(null);
      updateEditorUrl(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The article could not be published.");
    } finally {
      setSaving(false);
    }
  };

  const copyArticleLink = async (slug: string) => {
    const url = `${window.location.origin}/articles/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Article link copied.");
    } catch {
      window.prompt("Copy this article link", url);
    }
  };

  const deleteArticle = async (article: ProfileArticle) => {
    if (!window.confirm(`Delete “${article.title}”? Its shared link will stop working.`)) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(article.slug)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("The article could not be deleted.");
      setArticles((current) => current.filter((item) => item.slug !== article.slug));
      setMessage("Article deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The article could not be deleted.");
    }
  };

  if (loading && !editing) return <div className="profile-articles-loading">Loading articles…</div>;

  return (
    <section className="profile-articles" aria-label="Profile articles">
      {!editing ? (
        <>
          <header className="profile-articles-heading">
            <div>
              <h2>Articles</h2>
              <p>Long-form notes, ideas, and updates from {profile.name}.</p>
            </div>
            {canManage && <button className="profile-article-primary" type="button" onClick={startNewArticle}>Write an article</button>}
          </header>

          {message && <p className="profile-article-notice" role="status">{message}</p>}

          {articles.length === 0 ? (
            <div className="profile-articles-empty">
              <span className="profile-articles-empty-mark" aria-hidden="true">A</span>
              <h3>{canManage ? "Your stories belong here" : "No articles published yet"}</h3>
              <p>{canManage ? "Start with a blank page. Type / to add a heading, paragraph, image, or link." : `${profile.name} hasn’t published any articles yet.`}</p>
              {canManage && <button className="profile-article-secondary" type="button" onClick={startNewArticle}>Start writing</button>}
            </div>
          ) : (
            <div className="profile-article-list">
              {articles.map((article) => (
                <article className="profile-article-row" key={article.id}>
                  <div className="profile-article-row-copy">
                    <h3><a href={`/articles/${article.slug}`}>{article.title}</a></h3>
                    <time dateTime={article.updated_at}>Updated {new Date(article.updated_at).toLocaleDateString()}</time>
                  </div>
                  <div className="profile-article-row-actions">
                    <button type="button" onClick={() => void copyArticleLink(article.slug)}>Copy link</button>
                    {canManage && <button type="button" onClick={() => startEditArticle(article)}>Edit</button>}
                    {canManage && <button type="button" className="profile-article-delete" onClick={() => void deleteArticle(article)}>Delete</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="profile-article-editor">
          <div className="profile-article-editor-topline">
            <button className="profile-article-back" type="button" onClick={closeEditor}>← Articles</button>
            <span>Type / in a blank line for blocks</span>
          </div>

          <div className="profile-article-notion-page">
            <div className="profile-article-block-list">
              {blocks.map((block) => (
                <div className="profile-article-block-wrap" key={block.id}>
                  {editableTextBlock(block) && (
                    <textarea
                      id={`article-block-${block.id}`}
                      className={`profile-article-editor-text ${block.type === "text" ? "paragraph" : block.type}`}
                      aria-label={block.type === "text" || block.type === "paragraph" ? "Paragraph block" : `Heading ${block.type.slice(1)} block`}
                      rows={1}
                      placeholder={block.type === "h1" ? "Heading 1" : block.type === "h2" ? "Heading 2" : block.type === "h3" ? "Heading 3" : "Type '/' for commands"}
                      value={block.text}
                      onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "/" && !block.text.trim()) {
                          event.preventDefault();
                          setSlashMenuBlockId(block.id);
                        } else if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          insertParagraphAfter(block.id);
                        } else if (event.key === "Backspace" && !block.text && blocks.length > 1) {
                          event.preventDefault();
                          setBlocks((current) => current.filter((item) => item.id !== block.id));
                        }
                      }}
                    />
                  )}

                  {block.type === "image" && (
                    <div className="profile-article-image-fields">
                      <button className="profile-article-remove-block" type="button" aria-label="Remove image block" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}>×</button>
                      {block.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={block.url} alt={block.alt || "Article image preview"} />
                      ) : (
                        <label className="profile-article-image-upload">
                          <input type="file" accept="image/*" onChange={(event) => void uploadImage(block.id, event.target.files?.[0])} />
                          <span>{uploadingBlockId === block.id ? "Uploading image…" : "Choose an image"}</span>
                        </label>
                      )}
                      <input aria-label="Image description" maxLength={240} placeholder="Add a caption (optional)" value={block.alt} onChange={(event) => updateBlock(block.id, { alt: event.target.value })} />
                    </div>
                  )}

                  {block.type === "link" && (
                    <div className="profile-article-link-fields">
                      <button className="profile-article-remove-block" type="button" aria-label="Remove link block" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}>×</button>
                      <input aria-label="Link text" placeholder="Link text" value={block.label} onChange={(event) => updateBlock(block.id, { label: event.target.value })} />
                      <input aria-label="Link URL" type="url" placeholder="https://example.com" value={block.url} onChange={(event) => updateBlock(block.id, { url: event.target.value })} />
                    </div>
                  )}

                  {slashMenuBlockId === block.id && (
                    <div className="profile-article-slash-menu" role="menu" aria-label="Insert a block">
                      {commands.map((command) => (
                        <button key={command.type} type="button" role="menuitem" onClick={() => applyCommand(block.id, command.type)}>
                          <b>{command.label}</b><span>{command.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {message && <p className="profile-article-notice" role="alert">{message}</p>}

          <footer className="profile-article-editor-footer">
            <p>The article will be public and shareable by link.</p>
            <div>
              <button className="profile-article-secondary" type="button" onClick={closeEditor}>Cancel</button>
              <button className="profile-article-primary" type="button" disabled={saving || uploadingBlockId !== null} onClick={() => void saveArticle()}>
                {saving ? "Publishing…" : editingSlug ? "Save changes" : "Publish article"}
              </button>
            </div>
          </footer>
        </div>
      )}
    </section>
  );
}
