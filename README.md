# Объявления о квартирах — C# (ASP.NET Core) + Angular

Единый проект по урокам 1–7: API на C# с базой SQLite (EF Core) и сайт на Angular
(список, фильтр, страницы объявлений, формы, вход по JWT). Сервер отдаёт и API, и сайт — **одно приложение, один порт**.

```
api/        ASP.NET Core 10: endpoint'ы, EF Core, SQLite, валидаторы, JWT, listings.http
web-src/    исходники Angular (src/), накладываются на свежесозданный Angular-проект
deploy/     шаблоны systemd и nginx для сервера
build.mjs   сборка всего проекта одной командой
```

## Что умеет

**API**
- `GET /api/listings` (фильтры `districtId`, `maxPrice`), `/api/listings/{id}`, `/api/listings/count`, `/api/listings/mine` (мои, нужен токен)
- `POST` / `PUT` / `DELETE /api/listings` — **нужен токен**; менять и удалять может только автор (иначе 403). Автор — `ownerId` в ответе
- Валидация FluentValidation (урок 6), ошибки — `application/problem+json`; 400 с `errors` по полям в camelCase, 404/500 тоже ProblemDetails
- `POST /api/auth/register`, `/login`, `/change-password`, `GET /api/auth/me` — пароли только хешем, токен JWT (60 минут)
- `GET /api/districts` — районы с числом объявлений; `POST` / `PUT` / `DELETE` — под ключом `X-Admin-Key`
- Администратор по ключу (`Admin:ApiKey`) может менять и удалять **любые** объявления

**Сайт (Angular 22, сигналы)**
- `/` список + фильтр (район со счётчиком, цена, сортировка, «только избранное»), кнопка «Обновить», скелетон загрузки, состояния ошибки/пусто
- `/listings/:id` объявление; кнопки «Редактировать»/«Удалить» — только автору
- `/listings/new`, `/listings/:id/edit` — форма на signal forms, ошибки сервера под полями, предупреждение о несохранённых изменениях
- `/login`, `/register`, `/my` (мои объявления), `/admin` (админка по ключу; старый адрес `/#admin` перенаправляется)
- Русская локаль, бейджи «выгодно»/«новое», избранное запоминается в браузере

## Первый запуск после обновления до уроков 5–7

1. Ключ подписи токенов (обязателен, без него API не стартует):
   ```bash
   cd api
   dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
   ```
   (PowerShell: `[Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))`). На сервере — переменная окружения `Jwt__Key`.
2. **База.** Таблица `Users` и столбец `Listings.OwnerId` создаются сами при старте, в том числе в уже существующей
   базе (см. `DatabaseBootstrap.cs`) — данные сохраняются. Если вы уже ведёте миграции EF (`api/Migrations/`),
   добавьте миграцию: `dotnet ef migrations add AddUsers`.
3. Фронтенд при `ng serve` ходит на `http://localhost:5000` (`src/environments/environment.ts`); свой порт API впишите там.

## Требования на вашем компьютере (для сборки)

.NET 10 SDK, Node.js 22+, Angular CLI (`npm i -g @angular/cli`) — как в уроке 1. Нужен интернет (NuGet и npm).

## Запуск локально (разработка)

```bash
# терминал 1 — API
cd api
dotnet run --urls http://localhost:5000      # Swagger: http://localhost:5000/swagger

# терминал 2 — Angular (первый раз создайте каркас: node build.mjs, или вручную — см. build.mjs)
cd web
ng serve --open                              # http://localhost:4200
```

## Сборка для сервера

```bash
node build.mjs
```

Скрипт сам: создаёт Angular-проект `web/` (если его нет) → накладывает `web-src/` → `ng build` →
кладёт результат в `api/wwwroot` → `dotnet publish` для Linux → делает `listings-publish.tar.gz`.

Параметры: `--rid=linux-arm64` (если сервер на ARM), `--fx` (не вшивать .NET; тогда на сервере нужен .NET 10 Runtime).

## Развёртывание на сервере с ispmanager

> **Важно.** Нужен **VPS / выделенный сервер с root-доступом по SSH**. На обычном виртуальном (shared)
> хостинге ASP.NET Core не запустить — там только PHP/статика.

1. **Сайт.** В ispmanager создайте WWW-домен (и SSL Let's Encrypt, если нужно).
2. **Загрузка.** Через «Менеджер файлов» загрузите `listings-publish.tar.gz` в
   `/var/www/ПОЛЬЗОВАТЕЛЬ/data/listings-app/` и распакуйте (или по SSH: `tar -xzf listings-publish.tar.gz`).
3. **Сервис (по SSH под root).**
   ```bash
   cd /var/www/ПОЛЬЗОВАТЕЛЬ/data/listings-app
   chmod +x ListingsApi
   nano /etc/systemd/system/listings.service     # вставьте deploy/listings.service, поправьте пути, пользователя и ключ
   systemctl daemon-reload
   systemctl enable --now listings
   systemctl status listings                      # должно быть active (running)
   curl http://127.0.0.1:5000/api/districts       # должен вернуть JSON
   ```
4. **Проксирование.** В ispmanager откройте настройки вашего сайта и добавьте содержимое
   `deploy/nginx-directives.conf` в дополнительные директивы nginx сайта (название пункта зависит от версии
   панели; запасной вариант — править конфиг сайта в `/etc/nginx/vhosts/...`). Сохраните — панель перечитает nginx.
   Если у сайта включён PHP/Apache-обработчик, переключите обработчик на «нет/статика», чтобы он не перехватывал `/`.
5. Откройте ваш домен — должна загрузиться страница с объявлениями.

### Обновление

1. Соберите заново: `node build.mjs`.
2. На сервере: `systemctl stop listings`.
3. Сделайте копию базы: `cp App_Data/listings.db App_Data/listings.db.bak`.
4. Распакуйте новый архив поверх старого **кроме папки `App_Data`** (там база): `tar -xzf listings-publish.tar.gz --exclude=App_Data`.
5. `systemctl start listings` — при старте приложение само применит новые миграции (если они есть).

### База данных

Файл `App_Data/listings.db` рядом с приложением. Резервная копия — просто скопировать файл (сервис лучше остановить).

### Безопасность

- В `listings.service` замените `Admin__ApiKey` (ключ администратора: районы и правка любых объявлений) и `Jwt__Key`
  (подпись токенов входа, от 32 символов) на длинные случайные строки. Пока `Admin__ApiKey` пуст, управление районами открыто всем,
  а администратора для объявлений нет. Запросы администратора идут с заголовком `X-Admin-Key` (см. `api/listings.http`).
- Swagger на сервере выключен. Включить временно: `Environment=Swagger__Enabled=true` в unit-файле.

### Работа с базой: данные и схема

**Данные** (объявления, районы) меняются без пересборки:

| Способ | Когда удобно |
|---|---|
| Страница `/admin` | основной способ: форма добавления/правки/удаления, нужен ключ `Admin__ApiKey` |
| Swagger (`/swagger`, на сервере включается `Swagger__Enabled=true`) | быстро проверить запрос |
| `api/listings.http` (REST Client в VS Code) | запросы из редактора |
| DB Browser for SQLite | прямая правка файла `App_Data/listings.db` (сервис остановить!) |

**Схема** (новое поле, новая таблица) меняется через миграции EF Core.

Один раз установите инструмент: `dotnet tool install --global dotnet-ef`.

*Первая миграция (делается один раз):*

```
cd api
dotnet ef migrations add InitialCreate
dotnet run --urls http://localhost:5000     # применит миграцию
```

Папку `api/Migrations/` обязательно закоммитьте в Git. Удалять локальный `listings.db` не нужно:
`DatabaseBootstrap` увидит, что база создана раньше через `EnsureCreated`, и сам пометит `InitialCreate` как применённую.
То же произойдёт на сервере с рабочей базой — данные сохранятся.
**Важно:** первую миграцию выкладывайте на сервер отдельным релизом, до следующих изменений схемы.

*Каждое следующее изменение схемы:*

1. Измените класс в `api/Data/Entities/` (например, `public int Floor { get; set; }` в `Listing`).
2. При необходимости обновите DTO в `api/Contracts/`, сервис, endpoint и Angular (`models/listing.ts`, форму в `admin/`).
3. `cd api && dotnet ef migrations add AddFloor` — появится новый файл в `Migrations/`.
4. Запустите локально, проверьте, закоммитьте, выложите (см. «Обновление»). При старте на сервере миграция применится автоматически.

Если поле обязательное, а в таблице уже есть строки, задайте для него значение по умолчанию (`HasDefaultValue(...)`
в `OnModelCreating`), иначе миграция не применится. Неудачную миграцию, которую ещё не выкладывали:
`dotnet ef migrations remove`.

## Вариант без своего сервера: GitHub + Render (Docker)

В корне проекта есть `Dockerfile` и `render.yaml`. Загрузите проект на GitHub и подключите репозиторий к
Render — сервис сам соберёт Angular и .NET и опубликует сайт по ссылке. Подробная пошаговая инструкция — в чате/в файле DEPLOY-RENDER.md.

## Заметки по заданиям

- **Ленивая загрузка** (`loadComponent` в `app.routes.ts`): страницы объявления, формы и админки вынесены в отдельные
  chunk'и и скачиваются при первом заходе. Начальный бандл меньше, главная страница открывается быстрее, а редкие
  страницы не тянут код, который большинству посетителей не нужен.
- Сортировка и «только избранное» работают на клиенте и не перезапрашивают API: на сервер уходят только район и цена.
- Не сделаны необязательные задания ★: фильтр в адресе, автоповтор с отсчётом, уникальный заголовок в районе,
  фокус на первой ошибке, юнит-тест валидатора, форма на reactive forms, роль Admin в таблице, лимит попыток входа,
  таймер сессии, refresh-токен.
