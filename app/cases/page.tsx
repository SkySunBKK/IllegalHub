import { supabase } from "@/lib/supabase";
import ArticleBrowser from "@/components/ArticleBrowser";
import Shell from "@/components/Shell";

export const revalidate = 0;

export default async function CasesPage() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, summary, body, category, images")
    .eq("kind", "case")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <Shell active="cases">
      {error ? (
        <main className="content">
          <div className="error">
            Не удалось загрузить нарушения: {error.message}
          </div>
        </main>
      ) : (
        <ArticleBrowser
          articles={articles ?? []}
          heading="Нарушения и ситуации"
          description="Разборы нарушений, спорных ситуаций и примеры для модераторов. Используй поиск и фильтры, чтобы быстро найти нужную информацию."
          emptyText="Опубликованные разборы нарушений появятся здесь."
        />
      )}
    </Shell>
  );
}