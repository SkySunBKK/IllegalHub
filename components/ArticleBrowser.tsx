"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Search,
  X,
  SlidersHorizontal,
  Image as ImageIcon,
  ArrowUpDown,
} from "lucide-react";

type ArticleImage = {
  url: string;
  path?: string;
  name?: string;
};

type Article = {
  id: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  images?: ArticleImage[] | null;
};

function inlineText(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }

      return <span key={index}>{part}</span>;
    });
}

function FormattedBody({ body }: { body: string }) {
  const content = body || "";

  // Новые материалы из rich-text редактора сохраняются как HTML.
  // Старые материалы в Markdown продолжаем отображать прежним способом.
  const containsHtml = /<\/?[a-z][^>]*>/i.test(content);

  if (containsHtml) {
    const cleanHtml = DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["style", "class", "rel"],
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["onerror", "onclick", "onload"],
    });

    return (
      <div
        className="kb-body"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  // Совместимость с уже опубликованными материалами в Markdown/обычном тексте.
  const lines = content.split(/\r?\n/);
  const output: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;

    output.push(
      <ul className="kb-list" key={`list-${output.length}`}>
        {bullets.map((item, index) => (
          <li key={index}>{inlineText(item)}</li>
        ))}
      </ul>
    );

    bullets = [];
  };

  lines.forEach((line, index) => {
    const value = line.trim();

    if (!value) {
      flush();
      return;
    }

    if (value.startsWith("- ") || value.startsWith("* ")) {
      bullets.push(value.slice(2));
      return;
    }

    flush();

    if (value.startsWith("### ")) {
      output.push(<h4 key={index}>{inlineText(value.slice(4))}</h4>);
    } else if (value.startsWith("## ")) {
      output.push(<h3 key={index}>{inlineText(value.slice(3))}</h3>);
    } else {
      output.push(<p key={index}>{inlineText(value)}</p>);
    }
  });

  flush();

  return <div className="kb-body">{output}</div>;
}


type SelectOption = {
  value: string;
  label: string;
};

function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  icon: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className={`kb-custom-select ${open ? "is-open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="kb-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="kb-select-icon">{icon}</span>
        <span className="kb-select-value">
          {selected?.label ?? value}
        </span>
        <svg
          className="kb-select-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="kb-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                key={option.value}
                className={`kb-select-option ${active ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {active && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m5 12 4 4L19 6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ArticleBrowser({
  articles,
  heading,
  description,
  emptyText,
}: {
  articles: Article[];
  heading: string;
  description: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все категории");
  const [sort, setSort] = useState("default");
  const [expanded, setExpanded] = useState<string[]>([]);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        articles
          .map((item) => item.category?.trim())
          .filter(Boolean)
      )
    ) as string[];

    return [
      "Все категории",
      ...values.sort((a, b) => a.localeCompare(b, "ru")),
    ];
  }, [articles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");

    const result = articles.filter((item) => {
      const matchesCategory =
        category === "Все категории" || item.category === category;

      const searchable = [
        item.title,
        item.summary,
        item.body,
        item.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru");

      return matchesCategory && (!needle || searchable.includes(needle));
    });

    if (sort === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    }

    if (sort === "title-desc") {
      result.sort((a, b) => b.title.localeCompare(a.title, "ru"));
    }

    return result;
  }, [articles, category, query, sort]);

  function toggleExpanded(id: string) {
    setExpanded((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function resetFilters() {
    setQuery("");
    setCategory("Все категории");
    setSort("default");
  }

  return (
    <div className="kb-page">
      <header className="kb-heading">
        <div>
          <div className="eyebrow">ILLEGALHUB / KNOWLEDGE BASE</div>
          <h1>{heading}</h1>
          <p className="kb-lead">{description}</p>
        </div>

        <div className="kb-total">
          <span>{filtered.length.toString().padStart(2, "0")}</span>
          <small>материалов</small>
        </div>
      </header>

      <section className="kb-toolbar" aria-label="Поиск и фильтры">
        <label className="kb-search">
          <Search size={18} aria-hidden="true" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по правилам и ключевым словам..."
            aria-label="Поиск по материалам"
          />

          {query && (
            <button
              type="button"
              className="kb-clear"
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
            >
              <X size={16} />
            </button>
          )}
        </label>

        <div className="kb-filter-row">
          <CustomSelect
            value={category}
            onChange={setCategory}
            ariaLabel="Фильтр по категории"
            icon={<SlidersHorizontal size={15} />}
            options={categories.map((item) => ({
              value: item,
              label: item,
            }))}
          />

          <CustomSelect
            value={sort}
            onChange={setSort}
            ariaLabel="Сортировка"
            icon={<ArrowUpDown size={15} />}
            options={[
              { value: "default", label: "По порядку" },
              { value: "title", label: "По названию: А–Я" },
              { value: "title-desc", label: "По названию: Я–А" },
            ]}
          />

          {(query ||
            category !== "Все категории" ||
            sort !== "default") && (
            <button
              type="button"
              className="kb-reset"
              onClick={resetFilters}
            >
              Сбросить фильтры
            </button>
          )}
        </div>

        <div className="kb-category-strip">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`kb-chip ${
                category === item ? "is-active" : ""
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {filtered.length ? (
        <div className="kb-results">
          {filtered.map((article, index) => {
            const isExpanded = expanded.includes(article.id);
            const body = article.body || "";

            const hasLongBody =
              body.length > 320 ||
              body.split(/\r?\n/).length > 5;

            return (
              <article className="kb-article" key={article.id}>
                <div className="kb-article-index">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="kb-article-main">
                  <div className="kb-article-meta">
                    <span className="kb-category">
                      {article.category || "ОБЩЕЕ"}
                    </span>

                    {!!article.images?.length && (
                      <span className="kb-image-count">
                        <ImageIcon size={13} />
                        {article.images.length}
                      </span>
                    )}
                  </div>

                  <h2>{article.title}</h2>

                  {article.summary && (
                    <p className="kb-summary">{article.summary}</p>
                  )}

                  {body && (
                    <>
                      <div
                        className={
                          isExpanded || !hasLongBody
                            ? ""
                            : "kb-body-collapsed"
                        }
                      >
                        <FormattedBody body={body} />
                      </div>

                      {hasLongBody && (
                        <button
                          type="button"
                          className="kb-expand"
                          onClick={() => toggleExpanded(article.id)}
                        >
                          {isExpanded
                            ? "Свернуть"
                            : "Читать полностью"}
                        </button>
                      )}
                    </>
                  )}

                  {!!article.images?.length && (
                    <div className="kb-gallery">
                      {article.images.map((image, imageIndex) => (
                        <a
                          className="kb-image-link"
                          key={image.path || image.url || imageIndex}
                          href={image.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={image.url}
                            alt={
                              image.name ||
                              `Иллюстрация ${imageIndex + 1}`
                            }
                            loading="lazy"
                          />

                          <span>
                            <ImageIcon size={13} />
                            Открыть изображение
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="kb-empty">
          <Search size={22} />

          <h3>
            {articles.length
              ? "Ничего не найдено"
              : emptyText}
          </h3>

          <p>
            {articles.length
              ? "Попробуй изменить запрос или сбросить фильтры."
              : "Опубликованные материалы появятся здесь."}
          </p>

          {(query || category !== "Все категории") && (
            <button
              className="kb-reset"
              onClick={resetFilters}
            >
              Очистить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  );
}