import Link from "next/link";
import {
  BookOpen,
  Shield,
  Gavel,
  GraduationCap,
  History,
  Home,
  AlertTriangle,
} from "lucide-react";

export default function Shell({
  children,
  active = "home",
}: {
  children: React.ReactNode;
  active?: string;
}) {
  const links = [
    { href: "/", label: "Обзор", id: "home", Icon: Home },
    { href: "/rules", label: "Правила", id: "rules", Icon: BookOpen },
    { href: "/cases", label: "Нарушения", id: "cases", Icon: AlertTriangle },
    { href: "/punishments", label: "Наказания", id: "punishments", Icon: Gavel },
    { href: "/training", label: "Обучение", id: "training", Icon: GraduationCap },
    { href: "/history", label: "История", id: "history", Icon: History },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brandmark">IH</span>
          <span className="brandname">
            ILLEGAL<span>HUB</span>
          </span>
        </Link>

        <div className="sidebar-caption">НАВИГАЦИЯ</div>

        <nav className="nav" aria-label="Основная навигация">
          {links.map(({ href, label, id, Icon }) => (
            <Link
              className={active === id ? "active" : ""}
              href={href}
              key={id}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidefoot">
          <span className="sidefoot-mark">
            <Shield size={14} />
          </span>
          <span>
            ILLEGALHUB
            <br />
            База знаний сообщества
          </span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="crumb">
            ILLEGALHUB
            <span>/</span>
            {links.find((item) => item.id === active)?.label || "Панель"}
          </span>

          <Link href="/login" className="team-link">
            Команда <span>↗</span>
          </Link>
        </header>

        {children}

        <footer className="site-footer">
          <span>
            ILLEGALHUB <i>·</i> MODERATION KNOWLEDGE BASE
          </span>

          <span>Материалы для последовательной модерации</span>
        </footer>
      </main>
    </div>
  );
}