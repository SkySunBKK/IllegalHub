import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;


function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

function ArticleText({ body }: { body: string }) {
  const lines = (body || "").split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      nodes.push(<ul key={`list-${nodes.length}`}>{list.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ul>);
      list = [];
    }
  };
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) { flush(); return; }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) { list.push(trimmed.slice(2)); return; }
    flush();
    if (trimmed.startsWith("### ")) nodes.push(<h4 key={index}>{renderInline(trimmed.slice(4))}</h4>);
    else if (trimmed.startsWith("## ")) nodes.push(<h3 key={index}>{renderInline(trimmed.slice(3))}</h3>);
    else if (/^\d+\.\s/.test(trimmed)) nodes.push(<p key={index}>{renderInline(trimmed)}</p>);
    else nodes.push(<p key={index} style={{ whiteSpace: "pre-wrap" }}>{renderInline(trimmed)}</p>);
  });
  flush();
  return <div className="article-body">{nodes}</div>;
}

export default async function Cases() {
  const { data: items, error } = await supabase
    .from("articles")
    .select("id,title,summary,body,category,images")
    .eq("kind", "case")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <Shell active="cases">
      <div className="content">
        <div className="eyebrow">Практика</div>
        <h1>База нарушений</h1>
        <p className="muted">Примеры ситуаций, признаки нарушения и рекомендуемые действия.</p>
        {error ? (
          <div className="notice">Не удалось загрузить примеры: {error.message}</div>
        ) : items?.length ? items.map((article: any) => (
          <article className="article" key={article.id}>
            <span className="pill">{article.category || "Разбор"}</span>
            <h3>{article.title}</h3>
            {article.summary && <p className="muted">{article.summary}</p>}
            <ArticleText body={article.body || ""} />
            {!!article.images?.length && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 16 }}>
                {article.images.map((image: any, index: number) => (
                  <a key={image.path || index} href={image.url} target="_blank" rel="noreferrer">
                    <img src={image.url} alt={image.name || `Скриншот ${index + 1}`} loading="lazy"
                      style={{ width: "100%", maxHeight: 420, objectFit: "contain", background: "#191a23", border: "1px solid #343746", borderRadius: 10 }} />
                  </a>
                ))}
              </div>
            )}
          </article>
        )) : <div className="notice">Примеры нарушений появятся здесь после публикации материалов.</div>}
      </div>
    </Shell>
  );
}
