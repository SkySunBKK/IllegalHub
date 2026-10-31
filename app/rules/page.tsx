import { supabase } from "@/lib/supabase";
import ArticleBrowser from "@/components/ArticleBrowser";

export const revalidate = 0;

export default async function RulesPage() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, summary, body, category, images")
    .eq("kind", "rule")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="page">
        <div className="error">
          Не удалось загрузить правила: {error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="eyebrow">ILLEGALHUB / KNOWLEDGE BASE</div>
        <h1>Правила сервера</h1>
        <p>
          Все основные правила и требования сообщества в одном месте.
          Используй поиск и фильтры, чтобы быстро найти нужную информацию.
        </p>
      </section>

      <ArticleBrowser
        articles={articles ?? []}
        emptyTitle="Правила пока не добавлены"
        emptyDescription="Опубликованные правила появятся здесь."
      />
    </main>
  );
}