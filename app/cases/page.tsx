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
      <main className="page">
        <div className="error">
          Не удалось загрузить нарушения: {error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="eyebrow">ILLEGALHUB / MODERATION</div>
        <h1>Нарушения и ситуации</h1>
        <p>
          Разборы нарушений, спорных ситуаций и примеры для модераторов.
          Используй поиск и фильтры, чтобы быстрее находить нужные случаи.
        </p>
      </section>

      <ArticleBrowser
        articles={articles ?? []}
        emptyTitle="Материалы пока не добавлены"
        emptyDescription="Опубликованные разборы нарушений появятся здесь."
      />
    </main>
  );
}