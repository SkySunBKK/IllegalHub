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
      <main className="content">
        <div className="error">
          Не удалось загрузить правила: {error.message}
        </div>
      </main>
    );
  }

  return (
    <ArticleBrowser
      articles={articles ?? []}
      heading="Правила сервера"
      description="Все основные правила и требования сообщества в одном месте. Используй поиск и фильтры, чтобы быстро найти нужную информацию."
      emptyText="Опубликованные правила появятся здесь."
    />
  );
}