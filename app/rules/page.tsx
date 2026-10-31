import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

// Всегда загружаем опубликованные правила из Supabase при запросе страницы,
// а не используем HTML, сохранённый во время сборки Vercel.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Rules() {
  const { data: items, error } = await supabase
    .from("articles")
    .select("id,title,summary,body,category,kind,published,sort_order,created_at")
    .eq("kind", "rule")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <Shell active="rules">
      <div className="content">
        <div className="eyebrow">Документация</div>
        <h1>Правила сервера</h1>
        <p className="muted">
          Официальные правила и пояснения к ним.
        </p>

        {error ? (
          <div className="notice">
            Не удалось загрузить правила из базы данных.
            <p className="muted">
              Ошибка Supabase: {error.message}
            </p>
          </div>
        ) : items && items.length > 0 ? (
          items.map((article) => (
            <article className="article" key={article.id}>
              <span className="pill">{article.category || "Общее"}</span>
              <h3>{article.title}</h3>
              <p>{article.summary || article.body}</p>
            </article>
          ))
        ) : (
          <div className="notice">
            Опубликованных правил пока нет. Проверь в админке, что у материала
            тип «rule» и статус «Опубликовано».
          </div>
        )}
      </div>
    </Shell>
  );
}
