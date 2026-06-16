# План: Система лицензирования

## Концепция

Каждый клиент (фирма) разворачивает своё приложение. В `.env` каждого развёртывания прописано уникальное имя лицензии (`LICENSE_NAME`). При каждом входе guard обращается к единой БД поставщика, находит лицензию по этому имени и проверяет, не истёк ли срок действия.

```
Клиент А (.env: LICENSE_NAME=firm_alpha)  ──┐
Клиент Б (.env: LICENSE_NAME=firm_beta)   ──┼──► Vendor DB (licenses)
Клиент В (.env: LICENSE_NAME=firm_gamma)  ──┘
```

---

## Зафиксированные архитектурные решения

### 1. Скрытность системы лицензирования

Пользователь **не должен знать** о существовании системы лицензий:

- Все ошибки лицензирования → `401 Unauthorized` с телом `{"statusCode":401,"message":"Unauthorized"}` — **идентично** тому, что возвращает Passport при неверном пароле. Без кастомных текстов.
- Реальная причина — **только в серверном логе** через NestJS `Logger`.
- Даже при недоступности vendor DB — тот же 401, не 503.

### 2. Порядок guards на `/api/auth/login`

```typescript
@UseGuards(LicenseGuard, LocalAuthGuard)
```

`LicenseGuard` идёт **первым**. При любой проблеме с лицензией — вход заблокирован до проверки пароля.

### 3. Fail Closed

При любой проблеме с лицензией или vendor DB — вход заблокирован. Исключений нет.

### 4. Подключение к vendor DB — `pg` напрямую, не TypeORM

**Причина:** TypeORM через `forRootAsync` пытается подключиться к БД при старте приложения. Если vendor DB недоступна в этот момент — всё приложение не запустится. Это неприемлемо.

Решение: использовать `pg` (node-postgres) напрямую в `LicenseService`. Пул создаётся при инициализации, но соединение устанавливается лениво — в момент первого запроса. Приложение всегда стартует. Ошибки соединения перехватываются в `catch`.

Следствие: **не нужна** License entity, **не нужен** именованный TypeORM коннект, **не нужно** менять список entities в `app.module.ts`.

### 5. Таймауты на pg пул

```
connectionTimeoutMillis: 3000
query_timeout: 3000
```

Без таймаутов медленная vendor DB подвесит HTTP-запрос на неопределённое время.

### 6. Только на login, не на refresh

Лицензия проверяется только на `/api/auth/login`. Пользователь с активным refresh-токеном продолжает работу до его истечения (30 дней).

### 7. Vendor DB: только чтение

Guard только читает данные. Схема vendor DB управляется вручную через SQL-скрипт. Клиент получает учётные данные с правами только `SELECT` на таблицу `licenses`.

---

## Архитектурное замечание на будущее

Прямое подключение клиентского приложения к vendor DB означает, что учётные данные (`LICENSE_DB_*`) хранятся у каждого клиента. В долгосрочной перспективе правильнее: vendor предоставляет REST API `GET /license/check`, клиент вызывает его. Прямой доступ к БД для текущей задачи приемлем, но это ограничение стоит иметь в виду.

---

## Шаги реализации

---

### Шаг 1 — SQL-скрипт для vendor DB

Создать `database/license-schema.sql` — применяется вручную на vendor DB.

**Таблица `licenses`:**

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | SERIAL | PK | — |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL | Уникальный идентификатор фирмы, совпадает с `LICENSE_NAME` в .env |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Дата и время истечения (UTC) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Экстренная ручная блокировка |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |

Скрипт создаёт таблицу + тестовую запись для разработки.

---

### Шаг 2 — Переменные окружения

Добавить в `.env`:

```env
# Vendor DB (база лицензий поставщика)
LICENSE_DB_HOST=
LICENSE_DB_PORT=5432
LICENSE_DB_USERNAME=
LICENSE_DB_PASSWORD=
LICENSE_DB_NAME=

# Уникальное имя лицензии этого развёртывания
LICENSE_NAME=
```

Если `LICENSE_NAME` не задан — приложение падает при старте с внятной ошибкой в консоль.

---

### Шаг 3 — Создать структуру LicenseModule

```
src/modules/license/
├── license.module.ts
├── license.service.ts
└── license.guard.ts
```

Entity не нужна — запрос делается через `pg` напрямую.

---

### Шаг 4 — LicenseService

Инжектирует `ConfigService`. При инициализации создаёт `pg.Pool` и проверяет наличие `LICENSE_NAME`.

**`onModuleInit()`:**
```
1. Читает LICENSE_NAME из ConfigService
2. Если не задан → throw Error('LICENSE_NAME is not defined') — приложение не стартует
3. Создаёт pg.Pool с параметрами из LICENSE_DB_* и таймаутами
```

**`checkLicense(): Promise<void>`:**
```
1. Делает запрос: SELECT expires_at, is_active FROM licenses WHERE name = $1
2. При ошибке подключения / таймауте (catch):
   → Logger.error('License check failed', error.message)
   → throw new UnauthorizedException()
3. Если строк 0 (лицензия не найдена):
   → Logger.warn(`License not found: ${licenseName}`)
   → throw new UnauthorizedException()
4. Если is_active = false:
   → Logger.warn(`License disabled: ${licenseName}`)
   → throw new UnauthorizedException()
5. Если expires_at < new Date():
   → Logger.warn(`License expired: ${licenseName}, expired at ${expiresAt}`)
   → throw new UnauthorizedException()
6. Всё ОК → return (guard пропускает)
```

**Принцип:** `throw new UnauthorizedException()` — **без аргументов**, чтобы тело ответа совпадало с тем, что возвращает Passport при неверном пароле.

---

### Шаг 5 — LicenseGuard

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  await this.licenseService.checkLicense()
  return true
}
```

Всё исключения пробрасываются из сервиса. Guard не содержит бизнес-логики.

---

### Шаг 6 — LicenseModule

```typescript
@Module({
  providers: [LicenseService, LicenseGuard],
  exports: [LicenseGuard],
})
export class LicenseModule {}
```

Не импортирует TypeOrmModule — только провайдеры.

---

### Шаг 7 — Подключение к AuthModule и контроллеру

**`auth.module.ts`** — добавить `LicenseModule` в `imports`.

**`auth.controller.ts`:**
```typescript
// Было:
@UseGuards(LocalAuthGuard)

// Станет:
@UseGuards(LicenseGuard, LocalAuthGuard)
```

---

## Итоговый список файлов

| Действие | Файл |
|---|---|
| Создать | `database/license-schema.sql` |
| Изменить | `.env` |
| Изменить | `src/modules/auth/auth.controller.ts` |
| Изменить | `src/modules/auth/auth.module.ts` |
| Создать | `src/modules/license/license.service.ts` |
| Создать | `src/modules/license/license.guard.ts` |
| Создать | `src/modules/license/license.module.ts` |

`app.module.ts` — **не меняется** (TypeORM не задействован для license).

---

## Поведение с точки зрения пользователя

| Реальная причина | Что видит пользователь | Что в серверных логах |
|---|---|---|
| Нормальный вход | Успешный вход | — |
| Неверный пароль | `401 {"message":"Unauthorized"}` | — (стандартный Passport) |
| Истекла лицензия | `401 {"message":"Unauthorized"}` | `WARN License expired: firm_alpha, expired at ...` |
| Лицензия отключена | `401 {"message":"Unauthorized"}` | `WARN License disabled: firm_alpha` |
| Лицензия не найдена | `401 {"message":"Unauthorized"}` | `WARN License not found: firm_alpha` |
| Vendor DB недоступна | `401 {"message":"Unauthorized"}` | `ERROR License check failed: <детали>` |

Все случаи неразличимы для пользователя и внешнего наблюдателя.
