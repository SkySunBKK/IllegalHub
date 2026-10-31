"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type ArticleImage = { url: string; path: string; name: string };
type Article = {
  id: string;
  title: string;
  body: string;
  summary: string | null;
  category: string | null;
  kind: "rule" | "case" | "punishment" | "training";
  published: boolean;
  images: ArticleImage[] | null;
  created_at: string;
};

const emptyForm = {
  title: "",
  body: "",
  summary: "",
  category: "",
  kind: "rule" as Article["kind"],
};

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<Article[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Проверяем доступ…");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    if (authError || !currentUser) {
      window.location.href = "/login";
      return;
    }
    setUser(currentUser);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (profileError || !profile || !["owner", "senior_mod"].includes(profile.role)) {
      setMessage("У этой учётной записи нет доступа к панели управления.");
      return;
    }

    setRole(profile.role);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setMessage(`Не удалось загрузить материалы: ${error.message}`);
    else {
      setRows((data || []) as Article[]);
      setMessage("");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setImages([]);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !user) return;

    setBusy(true);
    setMessage("");
    const uploaded: ArticleImage[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setMessage(`${file.name}: файл не является изображением.`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setMessage(`${file.name}: размер изображения больше 8 МБ.`);
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) {
        setMessage(`Ошибка загрузки ${file.name}: ${error.message}`);
        continue;
      }

      const { data } = supabase.storage.from("article-images").getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, path, name: file.name });
    }

    setImages((current) => [...current, ...uploaded]);
    setBusy(false);
    if (uploaded.length) setMessage(`Загружено изображений: ${uploaded.length}. Не забудь сохранить статью.`);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveArticle(event: FormEvent<HTMLFormElement> | null, publish: boolean) {
    event?.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.body.trim()) {
      setMessage("Заполни название и содержание статьи.");
      return;
    }

    setBusy(true);
    setMessage("");
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      summary: form.summary.trim() || form.body.trim().slice(0, 180),
      category: form.category.trim() || null,
      kind: form.kind,
      images,
      published: publish,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("articles").update(payload).eq("id", editingId)
      : await supabase.from("articles").insert({ ...payload, created_by: user.id });

    setBusy(false);
    if (result.error) {
      setMessage(`Не удалось сохранить материал: ${result.error.message}`);
      return;
    }

    setMessage(publish ? "Материал опубликован." : "Черновик сохранён.");
    resetForm();
    await load();
  }

  function editArticle(article: Article) {
    setEditingId(article.id);
    setForm({
      title: article.title || "",
      body: article.body || "",
      summary: article.summary || "",
      category: article.category || "",
      kind: article.kind,
    });
    setImages(Array.isArray(article.images) ? article.images : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePublish(article: Article) {
    setBusy(true);
    const { error } = await supabase
      .from("articles")
      .update({ published: !article.published, updated_at: new Date().toISOString() })
      .eq("id", article.id);
    setBusy(false);
    setMessage(error ? `Ошибка изменения публикации: ${error.message}` : "Статус публикации обновлён.");
    await load();
  }

  async function deleteArticle(article: Article) {
    if (!window.confirm(`Удалить материал «${article.title}»? Это действие нельзя отменить.`)) return;
    setBusy(true);
    const { error } = await supabase.from("articles").delete().eq("id", article.id);
    setBusy(false);
    setMessage(error ? `Не удалось удалить материал: ${error.message}` : "Материал удалён.");
    if (!error && editingId === article.id) resetForm();
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const visibleRows = rows.filter((row) => filter === "all" || row.kind === filter);

  return (
    <main className="content" style={{ maxWidth: 1120 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <div className="eyebrow">IllegalHub · Control panel</div>
          <h1>Редактор базы знаний</h1>
          <p className="muted">Создавай, редактируй и публикуй статьи с изображениями и скриншотами.</p>
        </div>
        <button className="button secondary" onClick={logout}>Выйти</button>
      </div>

      {message && <div className="notice" style={{ margin: "18px 0" }}>{message}</div>}

      {role && (
        <>
          <p className="muted">Вход: {user?.email} · Роль: {role}</p>

          <section className="card" style={{ marginTop: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>{editingId ? "Редактирование материала" : "Новая статья"}</h2>
              {editingId && <button type="button" className="button secondary" onClick={resetForm}>Отменить</button>}
            </div>

            <form id="article-editor-form" onSubmit={(event) => void saveArticle(event, false)}>
              <div className="field">
                <label>Раздел</label>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Article["kind"] })}>
                  <option value="rule">Правило</option>
                  <option value="case">Пример нарушения</option>
                  <option value="punishment">Наказание</option>
                  <option value="training">Обучение</option>
                </select>
              </div>

              <div className="field">
                <label>Название</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Например: 1.1 — Запрещено оскорбление участников" />
              </div>

              <div className="field">
                <label>Категория</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Например: Общение, Читы, Реклама" />
              </div>

              <div className="field">
                <label>Краткое описание</label>
                <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Краткий текст для карточки (необязательно)" />
              </div>

              <div className="field">
                <label>Содержание статьи</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
                  {[
                    ["Заголовок", "\n## Заголовок\n"],
                    ["Подзаголовок", "\n### Подзаголовок\n"],
                    ["Жирный текст", "**важный текст**"],
                    ["Список", "\n- пункт списка\n"],
                    ["Нумерация", "\n1. первый пункт\n"],
                  ].map(([label, snippet]) => (
                    <button key={label} type="button" className="button secondary" style={{ padding: "7px 10px", fontSize: 12 }}
                      onClick={() => setForm((current) => ({ ...current, body: current.body + snippet }))}>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={"Опиши правило или ситуацию подробно…\n\nМожно использовать ## для заголовков, - для списков и **текст** для выделения."}
                  style={{ minHeight: 240 }} />
                <small className="muted">Поддерживаются заголовки ## и ###, списки через -, нумерованные списки и **жирный текст**.</small>
              </div>

              <div className="field">
                <label>Скриншоты и изображения</label>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={uploadImages} />
                <small className="muted">PNG, JPG, WEBP и другие изображения. До 8 МБ на файл. Изображения будут храниться в Supabase Storage.</small>
              </div>

              {images.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, margin: "12px 0 20px" }}>
                  {images.map((image, index) => (
                    <div key={`${image.path}-${index}`} style={{ background: "#191a23", border: "1px solid #343746", borderRadius: 10, padding: 8 }}>
                      <img src={image.url} alt={image.name} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 7 }} />
                      <div style={{ fontSize: 11, color: "#a5a8b8", overflowWrap: "anywhere", margin: "7px 0" }}>{image.name}</div>
                      <button type="button" className="button secondary" style={{ padding: "6px 9px", fontSize: 11 }}
                        onClick={() => setImages((current) => current.filter((_, i) => i !== index))}>Убрать из статьи</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button className="button" type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить черновик"}</button>
                <button className="button" type="button" disabled={busy} onClick={() => {
                  const formElement = document.querySelector<HTMLFormElement>("#article-editor-form");
                  if (formElement && !formElement.reportValidity()) return;
                  void saveArticle(null, true);
                }}>Опубликовать</button>
              </div>
            </form>
          </section>

          <div className="sectionhead">
            <h2>Материалы</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pill">{rows.length} записей</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: "#191a23", color: "white", border: "1px solid #343746", borderRadius: 8, padding: 8 }}>
                <option value="all">Все</option>
                <option value="rule">Правила</option>
                <option value="case">Нарушения</option>
                <option value="punishment">Наказания</option>
                <option value="training">Обучение</option>
              </select>
            </div>
          </div>

          {visibleRows.map((article) => (
            <article className="article" key={article.id}>
              <span className="pill">{article.kind} · {article.published ? "Опубликовано" : "Черновик"}</span>
              <h3>{article.title}</h3>
              <p>{article.summary || article.body}</p>
              {!!article.images?.length && <small className="muted">Изображений: {article.images.length}</small>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <button className="button secondary" onClick={() => editArticle(article)}>Редактировать</button>
                <button className="button secondary" disabled={busy} onClick={() => void togglePublish(article)}>
                  {article.published ? "Снять с публикации" : "Опубликовать"}
                </button>
                {role === "owner" && <button className="button secondary" disabled={busy} onClick={() => void deleteArticle(article)}>Удалить</button>}
              </div>
            </article>
          ))}
        </>
      )}
    </main>
  );
}
