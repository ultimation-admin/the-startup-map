import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProfileArticleBySlug } from "@/lib/db";
import { ShareArticleButton } from "@/components/ShareArticleButton";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchProfileArticleBySlug(slug);
  if (!article) return { title: "Article not found | The Startup Map" };
  return {
    title: `${article.title} | ${article.profile_name}`,
    description: `An article by ${article.profile_name} on The Startup Map.`,
    openGraph: {
      title: article.title,
      description: `An article by ${article.profile_name} on The Startup Map.`,
      type: "article",
      publishedTime: article.created_at,
      modifiedTime: article.updated_at,
      authors: [article.profile_name],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await fetchProfileArticleBySlug(slug);
  if (!article) notFound();

  const profileHref = article.profile_type === "person"
    ? `/p/${article.profile_slug}`
    : `/s/${article.profile_slug}`;
  const titleBlockIndex = article.blocks.findIndex((block) =>
    (block.type === "h1" || block.type === "h2" || block.type === "h3" || block.type === "paragraph" || block.type === "text") &&
    block.text.trim().split(/\r?\n/)[0] === article.title
  );

  return (
    <main className="public-article-page">
      <div className="public-article-topbar">
        <Link href={profileHref} className="public-article-back">← {article.profile_name}</Link>
        <ShareArticleButton title={article.title} />
      </div>

      <article className="public-article">
        <header className="public-article-header">
          <p className="public-article-kicker">ARTICLE</p>
          <h1>{article.title}</h1>
          <div className="public-article-byline">
            <Link href={profileHref} className="public-article-avatar" aria-label={`Visit ${article.profile_name}'s profile`}>
              {article.profile_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.profile_logo} alt="" />
              ) : article.profile_name.slice(0, 1).toUpperCase()}
            </Link>
            <div>
              <Link href={profileHref}>{article.profile_name}</Link>
              <time dateTime={article.created_at}>{new Date(article.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
            </div>
          </div>
        </header>

        <div className="public-article-body">
          {article.blocks.map((block, index) => {
            if (index === titleBlockIndex) return null;
            if (block.type === "text" || block.type === "paragraph") {
              return block.text.trim() ? <p className="public-article-text" key={block.id}>{block.text}</p> : null;
            }
            if (block.type === "h1") return <h1 className="public-article-heading-one" key={block.id}>{block.text}</h1>;
            if (block.type === "h2") return <h2 className="public-article-heading-two" key={block.id}>{block.text}</h2>;
            if (block.type === "h3") return <h3 className="public-article-heading-three" key={block.id}>{block.text}</h3>;
            if (block.type === "image") {
              return (
                <figure className="public-article-image" key={block.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={block.url} alt={block.alt} />
                  {block.alt && <figcaption>{block.alt}</figcaption>}
                </figure>
              );
            }
            return (
              <p className="public-article-link" key={block.id}>
                <a href={block.url} target="_blank" rel="noopener noreferrer">{block.label}<span aria-hidden="true"> ↗</span></a>
              </p>
            );
          })}
        </div>

        <footer className="public-article-footer">
          <span>Written by <Link href={profileHref}>{article.profile_name}</Link></span>
          <ShareArticleButton title={article.title} />
        </footer>
      </article>
    </main>
  );
}
