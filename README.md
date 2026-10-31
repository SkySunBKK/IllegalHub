# IllegalHub — Discord Moderation Wiki

Стартовый проект публичной базы знаний с закрытой панелью управления.

## Стек
- Next.js 15 + TypeScript
- Supabase Auth (email/password) и Postgres с RLS
- Vercel для публикации

## 1. Подготовка Supabase
1. Создай проект на https://supabase.com/.
2. Открой SQL Editor и выполни `supabase/schema.sql`.
3. В Authentication → Providers включи Email.
4. В Authentication → URL Configuration добавь локальный URL `http://localhost:3000` и адрес сайта после публикации.
5. Создай пользователей модераторов через Authentication → Users (или регистрацию, если включишь её отдельно).
6. Для каждого пользователя создай профиль SQL-командой из `supabase/schema.sql`. Назначь владельца и старших модераторов через UPDATE из комментариев в файле.

Важно: публичную регистрацию на сайте не добавляй. Учётные записи выдаёт владелец вручную.

## 2. Локальный запуск
```bash
npm install
cp .env.example .env.local
```
Заполни `.env.local` значениями из Supabase → Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Затем:
```bash
npm run dev
```
Открой http://localhost:3000.

## 3. Публикация на Vercel
1. Загрузи проект в GitHub.
2. На https://vercel.com/ импортируй репозиторий.
3. Добавь две переменные окружения из `.env.local`.
4. Нажми Deploy.
5. Добавь домен Vercel в Supabase Authentication → URL Configuration.

## Важные замечания по безопасности
- Никогда не добавляй `service_role` key в `NEXT_PUBLIC_*` или клиентский код.
- RLS-политики обязательны: именно они защищают таблицы, а не скрытая ссылка `/admin`.
- Панель в этом стартовом шаблоне проверяет роль пользователя и ограничивает операции политиками RLS.
- Перед реальным запуском включи подтверждение email, настрой SMTP/лимиты Auth и проверь политики на тестовых аккаунтах.
- В этой первой версии создание и публикация материалов работают; полноценное редактирование существующих записей, удаление, загрузка вложений и журнал аудита — следующие этапы.
