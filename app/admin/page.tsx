"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Shell from "@/components/Shell";
import "./admin-editor.css";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlertCircle,
  Bold,
  ClipboardPaste,
  Code2,
  Eraser,
  FileText,
  Heading2,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Undo2,
  Underline,
  Unlink,
} from "lucide-react";
import type { ReactNode } from "react";

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


function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const lastEmittedHtmlRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "insert" | "format">("home");
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  function updateStats() {
    const text = editorRef.current?.innerText || "";
    setStats({
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      chars: text.length,
    });
  }

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (
      editor &&
      selection &&
      selection.rangeCount > 0 &&
      selection.anchorNode &&
      editor.contains(selection.anchorNode)
    ) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;

    const savedRange = selectionRef.current;
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastEmittedHtmlRef.current === value) return;

    const html = /<\/?[a-z][\s\S]*>/i.test(value || "")
      ? value
      : (value || "")
          .split(/\n{2,}/)
          .map((paragraph) => {
            const escaped = paragraph
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br>");
            return `<p>${escaped}</p>`;
          })
          .join("");

    if (editor.innerHTML !== html) editor.innerHTML = html;
    lastEmittedHtmlRef.current = value;
    updateStats();
    // The editor intentionally synchronizes only when its external value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function sync() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    lastEmittedHtmlRef.current = html;
    onChange(html);
    updateStats();
    rememberSelection();
  }

  function command(name: string, arg?: string) {
    restoreSelection();
    document.execCommand(name, false, arg);
    sync();
  }

  function insert(html: string) {
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    sync();
  }

  function escapeHtml(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeWebUrl(raw: string) {
    try {
      const parsed = new URL(raw.trim(), window.location.origin);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function addLink() {
    const raw = window.prompt("Вставь адрес ссылки (https://…):");
    if (!raw) return;
    const url = safeWebUrl(raw);
    if (!url) {
      window.alert("Допустимы только ссылки http:// и https://.");
      return;
    }
    command("createLink", url);
  }

  function removeLink() {
    command("unlink");
  }

  function addImage() {
    const raw = window.prompt("Вставь прямой URL изображения (https://…):");
    if (!raw) return;
    const url = safeWebUrl(raw);
    if (!url) {
      window.alert("Укажи корректный адрес изображения с http:// или https://.");
      return;
    }
    const alt = window.prompt("Описание изображения (необязательно):", "Иллюстрация") || "Иллюстрация";
    insert(
      `<p><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;border-radius:10px;margin:12px 0" /></p><p><br></p>`
    );
  }

  function addTable() {
    const rowsInput = window.prompt("Количество строк (включая заголовок)", "3");
    if (rowsInput === null) return;
    const colsInput = window.prompt("Количество столбцов", "2");
    if (colsInput === null) return;

    const rows = Math.max(1, Math.min(12, Number(rowsInput) || 3));
    const cols = Math.max(1, Math.min(8, Number(colsInput) || 2));
    const cellStyle = "border:1px solid #d9e2d7;padding:9px;min-width:50px;text-align:left";
    const header = `<tr>${Array.from(
      { length: cols },
      (_, index) => `<th style="${cellStyle};background:#eff5ee">Заголовок ${index + 1}</th>`
    ).join("")}</tr>`;
    const bodyRows = Array.from(
      { length: Math.max(0, rows - 1) },
      () => `<tr>${Array.from(
        { length: cols },
        () => `<td style="${cellStyle}"><br></td>`
      ).join("")}</tr>`
    ).join("");

    insert(
      `<table style="width:100%;border-collapse:collapse;margin:14px 0" border="1"><tbody>${header}${bodyRows}</tbody></table><p><br></p>`
    );
  }

  async function pastePlainText() {
    let text = "";
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard API недоступен");
      text = await navigator.clipboard.readText();
    } catch {
      text = window.prompt("Вставка из буфера недоступна. Вставь текст сюда:") || "";
    }
    if (!text) return;

    restoreSelection();
    const inserted = document.execCommand("insertText", false, text);
    if (!inserted) {
      const safeText = escapeHtml(text).replace(/\r?\n/g, "<br>");
      document.execCommand("insertHTML", false, safeText);
    }
    sync();
  }

  function applyLineHeight(lineHeight: string) {
    restoreSelection();
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const block = (node as Element | null)?.closest(
      "p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,div"
    );
    const target = block && editor.contains(block) ? block : editor;
    (target as HTMLElement).style.lineHeight = lineHeight;
    sync();
  }

  const btn = (label: string, icon: ReactNode, action: () => void) => (
    <button
      type="button"
      className="rich-tool-button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        rememberSelection();
        event.preventDefault();
      }}
      onClick={action}
    >
      <span className="rich-tool-icon" aria-hidden="true">{icon}</span>
      <span className="rich-tool-label">{label}</span>
    </button>
  );

  return (
    <div className="word-editor-layout">
      <section className="rich-editor">
        <div className="word-ribbon">
          <div className="word-ribbon-tabs" role="tablist" aria-label="Разделы инструментов редактора">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "home"}
              className={activeTab === "home" ? "is-active" : ""}
              onClick={() => setActiveTab("home")}
            >
              <FileText size={15} /> Главная
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "insert"}
              className={activeTab === "insert" ? "is-active" : ""}
              onClick={() => setActiveTab("insert")}
            >
              <Plus size={15} /> Вставка
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "format"}
              className={activeTab === "format" ? "is-active" : ""}
              onClick={() => setActiveTab("format")}
            >
              <Palette size={15} /> Формат
            </button>
          </div>

          <div className="rich-editor-toolbar" aria-label="Панель инструментов редактора">
            {activeTab === "home" && (
              <>
                <div className="rich-toolbar-group">
                  {btn("Отменить", <Undo2 size={16} />, () => command("undo"))}
                  {btn("Повторить", <Redo2 size={16} />, () => command("redo"))}
                  <i aria-hidden="true" />
                  {btn("Жирный", <Bold size={16} />, () => command("bold"))}
                  {btn("Курсив", <Italic size={16} />, () => command("italic"))}
                  {btn("Подчёркнутый", <Underline size={16} />, () => command("underline"))}
                  {btn("Зачёркнутый", <Strikethrough size={16} />, () => command("strikeThrough"))}
                  {btn("Нижний индекс", <Subscript size={16} />, () => command("subscript"))}
                  {btn("Верхний индекс", <Superscript size={16} />, () => command("superscript"))}
                </div>
                <div className="rich-toolbar-group">
                  {btn("Маркированный список", <List size={16} />, () => command("insertUnorderedList"))}
                  {btn("Нумерованный список", <ListOrdered size={16} />, () => command("insertOrderedList"))}
                  {btn("Цитата", <Quote size={16} />, () => command("formatBlock", "<blockquote>"))}
                  {btn("Горизонтальная линия", <Minus size={16} />, () => command("insertHorizontalRule"))}
                </div>
              </>
            )}

            {activeTab === "insert" && (
              <>
                <div className="rich-toolbar-group">
                  {btn("Вставить текст из буфера", <ClipboardPaste size={16} />, () => void pastePlainText())}
                  {btn("Добавить ссылку", <Link2 size={16} />, addLink)}
                  {btn("Удалить ссылку", <Unlink size={16} />, removeLink)}
                  {btn("Вставить изображение", <ImagePlus size={16} />, addImage)}
                  {btn("Вставить таблицу", <Table2 size={16} />, addTable)}
                  {btn("Горизонтальная линия", <Minus size={16} />, () => command("insertHorizontalRule"))}
                </div>
                <p className="rich-toolbar-note">
                  Вставка текста выполняется без внешнего форматирования. Для ссылки сначала выдели нужный фрагмент.
                </p>
              </>
            )}

            {activeTab === "format" && (
              <>
                <div className="rich-toolbar-group">
                  <label className="rich-select-control">
                    <span>Стиль абзаца</span>
                    <select
                      defaultValue="p"
                      onMouseDown={rememberSelection}
                      onChange={(event) => command("formatBlock", `<${event.target.value}>`)}
                    >
                      <option value="p">Обычный текст</option>
                      <option value="h1">Заголовок 1</option>
                      <option value="h2">Заголовок 2</option>
                      <option value="h3">Заголовок 3</option>
                      <option value="h4">Заголовок 4</option>
                      <option value="pre">Блок кода</option>
                    </select>
                  </label>
                  <label className="rich-select-control">
                    <span>Шрифт</span>
                    <select defaultValue="Arial" onMouseDown={rememberSelection} onChange={(event) => command("fontName", event.target.value)}>
                      <option>Arial</option>
                      <option>Georgia</option>
                      <option>Verdana</option>
                      <option>Tahoma</option>
                      <option>Times New Roman</option>
                    </select>
                  </label>
                  <label className="rich-select-control rich-size-control">
                    <span>Размер</span>
                    <select defaultValue="3" onMouseDown={rememberSelection} onChange={(event) => command("fontSize", event.target.value)}>
                      <option value="1">8 pt</option>
                      <option value="2">10 pt</option>
                      <option value="3">12 pt</option>
                      <option value="4">14 pt</option>
                      <option value="5">18 pt</option>
                      <option value="6">24 pt</option>
                      <option value="7">36 pt</option>
                    </select>
                  </label>
                </div>

                <div className="rich-toolbar-group">
                  <label className="rich-color-control">
                    <Palette size={16} />
                    <span>Цвет текста</span>
                    <input type="color" defaultValue="#263b2b" onMouseDown={rememberSelection} onChange={(event) => command("foreColor", event.target.value)} />
                  </label>
                  <label className="rich-color-control">
                    <Highlighter size={16} />
                    <span>Выделение</span>
                    <input type="color" defaultValue="#fff2a8" onMouseDown={rememberSelection} onChange={(event) => command("hiliteColor", event.target.value)} />
                  </label>
                  <label className="rich-select-control rich-line-height-control">
                    <span>Межстрочный интервал</span>
                    <select defaultValue="1.8" onMouseDown={rememberSelection} onChange={(event) => applyLineHeight(event.target.value)}>
                      <option value="1">Одинарный · 1.0</option>
                      <option value="1.15">Компактный · 1.15</option>
                      <option value="1.5">Полуторный · 1.5</option>
                      <option value="1.8">Обычный · 1.8</option>
                      <option value="2">Двойной · 2.0</option>
                      <option value="2.5">Широкий · 2.5</option>
                    </select>
                  </label>
                </div>

                <div className="rich-toolbar-group">
                  {btn("По левому краю", <AlignLeft size={16} />, () => command("justifyLeft"))}
                  {btn("По центру", <AlignCenter size={16} />, () => command("justifyCenter"))}
                  {btn("По правому краю", <AlignRight size={16} />, () => command("justifyRight"))}
                  {btn("По ширине", <AlignJustify size={16} />, () => command("justifyFull"))}
                  {btn("Уменьшить отступ", <IndentDecrease size={16} />, () => command("outdent"))}
                  {btn("Увеличить отступ", <IndentIncrease size={16} />, () => command("indent"))}
                  {btn("Очистить форматирование", <Eraser size={16} />, () => command("removeFormat"))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="word-page-wrap">
          <div
            ref={editorRef}
            className="rich-editor-content"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Содержание статьи"
            aria-multiline="true"
            data-placeholder="Начни писать статью… Выдели текст и выбери действие на панели инструментов."
            onInput={sync}
            onBlur={sync}
            onMouseUp={rememberSelection}
            onKeyUp={rememberSelection}
            onFocus={rememberSelection}
          />
        </div>

        <div className="rich-editor-hint">
          <strong>Как пользоваться:</strong> выдели текст и открой «Формат», чтобы изменить шрифт, цвет, выравнивание или межстрочный интервал. Во вкладке «Вставка» добавляются ссылки, изображения и таблицы.
        </div>
      </section>

      <aside className="word-editor-sidebar">
        <div className="word-side-card">
          <span className="word-side-kicker">ДОКУМЕНТ</span>
          <h3>Сводка статьи</h3>
          <div className="word-stat"><span>Слова</span><b>{stats.words}</b></div>
          <div className="word-stat"><span>Символы</span><b>{stats.chars}</b></div>
          <div className="word-stat"><span>Время чтения</span><b>{Math.max(1, Math.ceil(stats.words / 180))} мин.</b></div>
        </div>

        <div className="word-side-card">
          <span className="word-side-kicker">БЫСТРАЯ ВСТАВКА</span>
          <h3>Готовые блоки</h3>
          <button type="button" className="word-side-action" onMouseDown={rememberSelection} onClick={() => insert("<h2>Новый раздел</h2><p>Текст раздела…</p>")}>
            <Heading2 size={16} /><span>Заголовок и текст</span>
          </button>
          <button type="button" className="word-side-action" onMouseDown={rememberSelection} onClick={() => insert("<blockquote><p>Важная информация…</p></blockquote>")}>
            <Quote size={16} /><span>Блок-цитата</span>
          </button>
          <button type="button" className="word-side-action" onMouseDown={rememberSelection} onClick={() => insert('<div class="article-callout" style="padding:14px 16px;border-left:4px solid #42634b;background:#edf4ed;border-radius:8px;margin:14px 0"><strong>Важно</strong><p>Добавь пояснение для участников.</p></div><p><br></p>')}>
            <AlertCircle size={16} /><span>Важное примечание</span>
          </button>
          <button type="button" className="word-side-action" onMouseDown={rememberSelection} onClick={() => insert("<pre><code>Вставь пример или команду</code></pre><p><br></p>")}>
            <Code2 size={16} /><span>Блок кода</span>
          </button>
          <button type="button" className="word-side-action" onMouseDown={rememberSelection} onClick={addTable}>
            <Table2 size={16} /><span>Таблица</span>
          </button>
        </div>

        <div className="word-side-tip">
          <b>Подсказка</b>
          <p>Сначала выдели текст в документе, затем нажми нужную функцию. Межстрочный интервал применяется к абзацу, в котором стоит курсор.</p>
        </div>
      </aside>
    </div>
  );
}

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
    const bodyText = form.body.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
    if (!form.title.trim() || !bodyText) {
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
     <Shell active="admin">
      <div className="content admin-content">
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
                <RichTextEditor
                  key={editingId || "new-article"}
                  value={form.body}
                  onChange={(html) => setForm((current) => ({ ...current, body: html }))}
                />
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
      </div>
  </Shell>
  );
}
