import { supabase } from "@/lib/supabase";
import ArticleBrowser from "@/components/ArticleBrowser";

export const revalidate = 0;

export default async function CasesPage() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, summary, body, category, images")
    .eq("kind", "case")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="content">
        <div className="error">
          Не удалось загрузить нарушения: {error.message}
        </div>
      </main>
    );
  }

  return (
    <ArticleBrowser
      articles={articles ?? []}
      heading="Нарушения и ситуации"
      description="Разборы нарушений, спорных ситуаций и примеры для модераторов. Используй поиск и фильтры, чтобы быстро найти нужную информацию."
      emptyText="Опубликованные разборы нарушений появятся здесь."
    />
  );
}