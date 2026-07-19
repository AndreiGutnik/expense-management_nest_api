# Expense Management API — Документация проекта

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]:
  https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Содержание

- [Технологический стек](#технологический-стек)
- [Структура проекта](#структура-проекта)
- [Конфигурация приложения](#конфигурация-приложения-maints)
- [Переменные окружения](#переменные-окружения-env)
- [Все маршруты API](#все-маршруты-api)
- [Аутентификация](#аутентификация)
- [Работа с токенами](#работа-с-токенами)
- [Система ролей и разрешений](#система-ролей-и-разрешений)
- [Проверка владельца ресурса](#ownershipguard--проверка-владельца-ресурса)
- [Проверка лицензии](#проверка-лицензии)
  - [Назначение и схема ключей](#назначение-и-схема-ключей)
  - [Где подключена проверка](#где-подключена-проверка)
  - [Алгоритм онлайн-проверки](#алгоритм-онлайн-проверки)
  - [Ошибки и офлайн-режим](#ошибки-и-офлайн-режим)
  - [Файл `storage/license-cache.json`](#файл-storagelicense-cachejson)
  - [Подключение к другому NestJS-проекту](#подключение-проверки-лицензии-к-другому-nestjs-проекту)
- [Процесс регистрации и верификации](#процесс-регистрации-и-верификации)
- [Сущности базы данных](#сущности-базы-данных)
- [Безопасность](#безопасность)

---

## Технологический стек

| Технология      | Версия / Назначение                             |
| --------------- | ----------------------------------------------- |
| NestJS          | 10.0.0 — основной фреймворк                     |
| PostgreSQL      | база данных                                     |
| TypeORM         | ORM для работы с БД                             |
| Passport.js     | стратегии аутентификации                        |
| @nestjs/jwt     | работа с JWT-токенами                           |
| Argon2          | хеширование паролей и refresh-токенов           |
| Nodemailer      | отправка email                                  |
| class-validator | валидация DTO                                   |
| cookie-parser   | парсинг cookies (для refresh-токена)            |
| Node.js Crypto  | проверка цифровой подписи ответа license server |

---

## Структура проекта

```
src/
├── core/
│   └── authorization/
│       ├── decorators/
│       │   ├── check-ownership.decorator.ts   # декоратор проверки владельца
│       │   └── permissions.decorator.ts       # декоратор разрешений
│       └── guards/
│           ├── ownership.guard.ts             # охранник проверки владельца
│           └── permissions.guard.ts           # охранник проверки разрешений
├── modules/
│   ├── auth/            # аутентификация
│   ├── user/            # пользователи
│   ├── role/            # роли
│   ├── permission/      # разрешения
│   ├── token/           # работа с токенами
│   ├── category/        # категории расходов
│   ├── transaction/     # транзакции
│   ├── license/         # проверка лицензии и подписанный локальный кэш
│   └── mail/            # email-сервис
├── utils/
│   └── generateKey.ts
├── app.module.ts
└── main.ts
```

---

## Конфигурация приложения (main.ts)

```typescript
app.setGlobalPrefix('api')          // все маршруты начинаются с /api
app.enableCors()
app.use(cookieParser())             // для чтения refresh-токена из cookie

// Глобальная валидация DTO
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,                  // отсекает лишние поля
  transform: true,
  forbidNonWhitelisted: true,       // кидает ошибку на неизвестные поля
}))

// Исключает @Exclude() поля (пароль) из ответа
app.useGlobalInterceptors(new ClassSerializerInterceptor(...))
```

---

## Переменные окружения (.env)

```env
PORT=
API_URL=                # URL этого API
CLIENT_URL=             # URL фронтенда
ADMIN_EMAIL=            # email администратора (получает письма об одобрении)

DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_NAME=

JWT_ACCESS_SECRET=      # секрет для access-токенов
JWT_REFRESH_SECRET=     # секрет для refresh-токенов

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# License server
LICENSE_SERVER_URL=http://localhost:3500/api/licenses/check
LICENSE_KEY=             # ключ лицензии конкретного клиента
LICENSE_DEVICE_ID=       # уникальный идентификатор установки/клиентского backend
LICENSE_CHECK_TIMEOUT_MS=3000
LICENSE_PUBLIC_KEY_PATH=secrets/license_public.pem
LICENSE_CACHE_PATH=storage/license-cache.json
```

Относительные пути `LICENSE_PUBLIC_KEY_PATH` и `LICENSE_CACHE_PATH` разрешаются
относительно `process.cwd()` — рабочей директории, из которой запущен Node.js.
Файл публичного ключа должен существовать до запуска приложения. Каталог для
кэша создаётся автоматически после первой успешной проверки лицензии.

---

## Все маршруты API

### AUTH — `/api/auth`

| Метод | Путь                | Guard                              | Описание                                                                                                                |
| ----- | ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| POST  | `/api/auth/login`   | `LicenseGuard` → `LocalAuthGuard`  | Проверка лицензии, затем вход по email/паролю. Возвращает `accessToken`, устанавливает `refreshToken` в httpOnly cookie |
| POST  | `/api/auth/refresh` | `LicenseGuard` → `JwtRefreshGuard` | Проверка лицензии, затем обновление пары токенов по refresh-токену из cookie                                            |

---

### USER — `/api/user`

| Метод  | Путь                           | Guard                                 | Разрешение        | Описание                                             |
| ------ | ------------------------------ | ------------------------------------- | ----------------- | ---------------------------------------------------- |
| POST   | `/api/user/signup`             | —                                     | —                 | Регистрация. Отправляет письмо для верификации email |
| GET    | `/api/user/verify/:link`       | —                                     | —                 | Верификация email по ссылке из письма                |
| GET    | `/api/user/verify-admin/:link` | —                                     | —                 | Одобрение пользователя администратором               |
| GET    | `/api/user`                    | `JwtAccessGuard` + `PermissionsGuard` | `user:read`       | Список всех пользователей                            |
| GET    | `/api/user/email?email=...`    | `JwtAccessGuard` + `PermissionsGuard` | `user:read`       | Поиск пользователя по email                          |
| PATCH  | `/api/user/:id/role`           | `JwtAccessGuard` + `PermissionsGuard` | `user:updateRole` | Изменение роли пользователя                          |
| PATCH  | `/api/user/email`              | `JwtAccessGuard`                      | —                 | Изменение своего email                               |
| PATCH  | `/api/user/password`           | `JwtAccessGuard`                      | —                 | Изменение своего пароля                              |
| DELETE | `/api/user/:id`                | `JwtAccessGuard` + `PermissionsGuard` | `user:delete`     | Удаление пользователя                                |

---

### ROLES — `/api/roles`

| Метод  | Путь                                       | Разрешение    | Описание                     |
| ------ | ------------------------------------------ | ------------- | ---------------------------- |
| POST   | `/api/roles`                               | `role:create` | Создание роли                |
| GET    | `/api/roles`                               | `role:read`   | Список всех ролей            |
| GET    | `/api/roles/:id`                           | `role:read`   | Роль по ID (с разрешениями)  |
| PATCH  | `/api/roles/:id`                           | `role:update` | Обновление роли              |
| POST   | `/api/roles/:id/permissions`               | `role:update` | Добавление разрешений к роли |
| DELETE | `/api/roles/:id/permissions/:permissionId` | `role:update` | Удаление разрешения из роли  |
| DELETE | `/api/roles/:id`                           | `role:delete` | Удаление роли                |

> Все маршруты защищены `JwtAccessGuard` + `PermissionsGuard`

---

### PERMISSIONS — `/api/permissions`

| Метод  | Путь                   | Разрешение          | Описание              |
| ------ | ---------------------- | ------------------- | --------------------- |
| POST   | `/api/permissions`     | `permission:create` | Создание разрешения   |
| GET    | `/api/permissions`     | `permission:read`   | Список разрешений     |
| GET    | `/api/permissions/:id` | `permission:read`   | Разрешение по ID      |
| PATCH  | `/api/permissions/:id` | `permission:update` | Обновление разрешения |
| DELETE | `/api/permissions/:id` | `permission:delete` | Удаление разрешения   |

> Все маршруты защищены `JwtAccessGuard` + `PermissionsGuard`

---

### CATEGORIES — `/api/categories`

| Метод  | Путь                  | Guard                               | Описание                                     |
| ------ | --------------------- | ----------------------------------- | -------------------------------------------- |
| POST   | `/api/categories`     | `JwtAccessGuard`                    | Создание категории для текущего пользователя |
| GET    | `/api/categories`     | `JwtAccessGuard`                    | Категории текущего пользователя              |
| GET    | `/api/categories/:id` | `JwtAccessGuard` + `OwnershipGuard` | Категория по ID (только своя)                |
| PATCH  | `/api/categories/:id` | `JwtAccessGuard` + `OwnershipGuard` | Обновление категории (только своей)          |
| DELETE | `/api/categories/:id` | `JwtAccessGuard` + `OwnershipGuard` | Удаление категории (только своей)            |

---

### TRANSACTIONS — `/api/transactions`

| Метод  | Путь                           | Guard                               | Описание                                  |
| ------ | ------------------------------ | ----------------------------------- | ----------------------------------------- |
| POST   | `/api/transactions`            | `JwtAccessGuard`                    | Создание транзакции                       |
| GET    | `/api/transactions`            | `JwtAccessGuard`                    | Транзакции пользователя (DESC по дате)    |
| GET    | `/api/transactions/:type/find` | `JwtAccessGuard`                    | Сумма транзакций по типу (income/expense) |
| GET    | `/api/transactions/pagination` | `JwtAccessGuard`                    | Транзакции с пагинацией (`?page=&limit=`) |
| GET    | `/api/transactions/:id`        | `JwtAccessGuard` + `OwnershipGuard` | Транзакция по ID (только своя)            |
| PATCH  | `/api/transactions/:id`        | `JwtAccessGuard` + `OwnershipGuard` | Обновление транзакции (только своей)      |
| DELETE | `/api/transactions/:id`        | `JwtAccessGuard` + `OwnershipGuard` | Удаление транзакции (только своей)        |

---

## Аутентификация

### Стратегии Passport

#### 1. Local Strategy (вход по email/паролю)

- Извлекает `email` и `password` из тела запроса
- Вызывает `authService.validateUser()`:
  - Ищет пользователя по email
  - Проверяет, что email верифицирован (`user.verify === true`)
  - Проверяет пароль через `argon2.verify()`
  - Возвращает объект пользователя или `UnauthorizedException`

#### 2. JWT Access Strategy (`jwt-access`)

- Извлекает токен из заголовка `Authorization: Bearer <token>`
- Верифицирует подпись через `JWT_ACCESS_SECRET`
- `validate(payload)` → возвращает полный объект пользователя из БД (с ролью и
  разрешениями)

#### 3. JWT Refresh Strategy (`jwt-refresh`)

- Извлекает токен из `req.cookies.refreshToken`
- Верифицирует подпись через `JWT_REFRESH_SECRET`
- `validate(payload)` → возвращает `{ id, email }` (без загрузки из БД)

### Guards

```
LocalAuthGuard      → AuthGuard('local')
JwtAccessGuard      → AuthGuard('jwt-access')
JwtRefreshGuard     → AuthGuard('jwt-refresh')
PermissionsGuard    → проверка разрешений пользователя
OwnershipGuard      → проверка, что ресурс принадлежит пользователю
LicenseGuard        → проверка лицензии через LicenseService
```

В одном `@UseGuards(...)` guards выполняются слева направо. Поэтому в текущем
`AuthController` лицензия проверяется до логина или проверки refresh-токена.
Если `LicenseGuard` выбрасывает исключение, следующие guards и метод контроллера
не выполняются.

---

## Работа с токенами

### Структура токенов

| Токен         | Срок жизни | Хранение              | Передача                       |
| ------------- | ---------- | --------------------- | ------------------------------ |
| Access Token  | 15 минут   | нигде (stateless)     | `Authorization: Bearer` header |
| Refresh Token | 30 дней    | хеш в таблице `token` | httpOnly cookie                |

### JWT Payload

```typescript
interface IJwtPayload {
  id: number
  email: string
}
```

### Алгоритм обновления токенов

1. Клиент отправляет `POST /api/auth/refresh` (refresh-токен приходит
   автоматически из cookie)
2. `LicenseGuard` проверяет лицензию
3. `JwtRefreshGuard` верифицирует JWT-подпись
4. `tokenService.refreshTokens()` вызывает `verifyRefreshToken()`:
   - Проверяет JWT-подпись ещё раз через `jwtService.verify()`
   - Находит хешированный токен в БД
   - Сравнивает через `argon2.verify(storedHash, incomingToken)`
   - Если токен не совпадает — удаляет токен из БД и выбрасывает ошибку
5. Старый refresh-токен **удаляется** из БД (ротация токенов)
6. Генерируется новая пара токенов

### Сохранение refresh-токена

- Токен хешируется через Argon2 перед сохранением в БД
- В таблице `token` хранится один токен на пользователя (`OneToOne` с `User`)
- При повторном входе старый токен перезаписывается

---

## Система ролей и разрешений

### Модели данных

```
Role                Permission
─────────────       ────────────────
id                  id
name (unique)       resource   ← например: "user"
description         action     ← например: "read"
permissions[]       roles[]

Role ←ManyToMany→ Permission (через таблицу role_permissions)
```

### Формат разрешений

`resource:action`

| Разрешение          | Описание                        |
| ------------------- | ------------------------------- |
| `user:read`         | Чтение списка пользователей     |
| `user:updateRole`   | Изменение роли пользователя     |
| `user:delete`       | Удаление пользователя           |
| `role:create`       | Создание роли                   |
| `role:read`         | Чтение ролей                    |
| `role:update`       | Обновление роли и её разрешений |
| `role:delete`       | Удаление роли                   |
| `permission:create` | Создание разрешения             |
| `permission:read`   | Чтение разрешений               |
| `permission:update` | Обновление разрешения           |
| `permission:delete` | Удаление разрешения             |

### Как работает PermissionsGuard

```typescript
// Декоратор на маршруте
@Permissions('user:read')

// Guard:
// 1. Читает требуемые разрешения из метаданных маршрута
// 2. Берёт user.role.permissions из req.user (загружается JwtAccessStrategy)
// 3. Формирует массив строк: ["user:read", "role:create", ...]
// 4. Проверяет, есть ли хотя бы одно совпадение (some)
// 5. Если нет — ForbiddenException
```

### Иерархия ролей

Роли с `id = 1` (super-admin) и `id = 2` (admin) имеют особые права:

- Только роли 1 и 2 могут менять роли пользователей
- Роль 2 (admin) **не может** назначать роли 1 и 2 другим пользователям
- Роль 1 (super-admin) может назначать любые роли кроме 1 и 2

---

## OwnershipGuard — проверка владельца ресурса

Используется для категорий и транзакций. Работает через декоратор
`@CheckOwnership`.

```typescript
// Применение в контроллере:
@UseGuards(JwtAccessGuard, OwnershipGuard)
@CheckOwnership(Category)      // или Transaction
findOne(@Param('id') id: string)
```

**Алгоритм:**

1. Читает метаданные из `@CheckOwnership(Entity)`
2. Берёт `id` из `req.params`
3. Ищет запись в БД с загрузкой связи `user`
4. Сравнивает `entity.user.id` с `req.user.id`
5. Если не совпадает — `ForbiddenException`
6. Если совпадает — кладёт `entity` в `req.entity` (для использования в
   контроллере)

---

## Проверка лицензии

### Назначение и схема ключей

License server подтверждает право конкретной установки использовать приложение.
На license server хранится **приватный ключ**, которым подписывается ответ. На
каждом клиентском backend хранится только соответствующий **публичный ключ**,
которым проверяется подпись. Приватный ключ нельзя копировать в клиентский
проект, `.env`, Git или Docker-образ клиента.

Одна пара ключей может использоваться для нескольких клиентов: license server
подписывает ответы одним приватным ключом, а публичный ключ копируется на каждый
клиентский backend. Клиенты различаются значениями `LICENSE_KEY`,
`LICENSE_DEVICE_ID` и полями подписанного payload.

```text
license server                         клиентский backend
──────────────                         ──────────────────
private key                            public key
     │                                      │
     └─ подписывает payload ───────────────► └─ проверяет подпись
```

### Где подключена проверка

`LicenseModule` импортирован в `AuthModule`. `LicenseGuard` используется только
на маршрутах:

- `POST /api/auth/login`;
- `POST /api/auth/refresh`.

Access token действует 15 минут, поэтому после отключения лицензии уже выданный
access token может работать не более оставшегося срока его действия. Новый
access token через login или refresh без успешной проверки лицензии выдан не
будет. Остальные бизнес-маршруты напрямую через `LicenseGuard` не проверяются.

### Алгоритм онлайн-проверки

1. `LicenseGuard` вызывает `LicenseService.checkLicense()`.
2. Сервис отправляет `POST` на `LICENSE_SERVER_URL` с JSON:

   ```json
   {
     "key": "значение LICENSE_KEY",
     "deviceId": "значение LICENSE_DEVICE_ID"
   }
   ```

3. Запрос прерывается через `LICENSE_CHECK_TIMEOUT_MS`.
4. Для успешного ответа проверяются структура, `payload.valid`, идентификаторы,
   даты и соответствие `payload.deviceId` текущему `LICENSE_DEVICE_ID`.
5. Подпись `signature` декодируется из Base64 и проверяется публичным ключом над
   детерминированно сериализованным `payload` (`stableStringify`). License
   server обязан подписывать байты, сформированные по тому же алгоритму.
6. Только после успешной проверки ответ записывается в локальный кэш.

Параллельные вызовы внутри одного Node.js-процесса объединяются через
`pendingCheck`: пока одна проверка выполняется, остальные получают тот же
`Promise` и не создают дополнительные запросы к license server.

### Ошибки и офлайн-режим

- HTTP `401`/`403`, прочие клиентские HTTP-ошибки, неверный JSON, payload или
  подпись считаются отказом/некорректным ответом. Локальный кэш в этих случаях
  не используется.
- Таймаут, сетевая ошибка или HTTP-ответ `5xx` переводят проверку в
  офлайн-режим: сервис пытается прочитать подписанный локальный кэш.
- Кэш принимается только при корректной подписи, совпадающем `deviceId`,
  активном `graceUntil` и, если задано, неистёкшем `expiresAt`.
- Если допустимого кэша нет, выбрасывается `UnauthorizedException`, и доступ не
  предоставляется.

### Файл `storage/license-cache.json`

Путь задаёт `LICENSE_CACHE_PATH`. После успешной онлайн-проверки сервис сначала
записывает `license-cache.json.tmp`, а затем атомарно переименовывает его в
`license-cache.json`. Каталог создаётся автоматически с правами `0700`, файл — с
правами `0600` (на ОС, поддерживающих POSIX-права).

Кэш содержит подписанный ответ license server и предназначен только для
временной работы при его недоступности. Ручное изменение данных делает подпись
невалидной. Файл является runtime-данными и исключён из Git. В Docker каталог
`storage` следует подключать как persistent volume; процесс Node.js должен иметь
право записи в него. При нескольких экземплярах API каждый экземпляр имеет свой
кэш, если каталог не является общим.

### Подключение проверки лицензии к другому NestJS-проекту

1. Скопировать актуальный каталог `src/modules/license/` целиком:

   ```text
   license/
   ├── guards/license.guard.ts
   ├── types/license-response.types.ts
   ├── license.module.ts
   └── license.service.ts
   ```

   `license.service_old.ts` относится к старой проверке через PostgreSQL и для
   текущей схемы не нужен.

2. Убедиться, что установлены и настроены `@nestjs/config`, а `ConfigModule`
   доступен глобально или импортирован в нужный модуль:

   ```typescript
   ConfigModule.forRoot({ isGlobal: true })
   ```

3. Импортировать `LicenseModule` в модуль, содержащий auth-контроллер:

   ```typescript
   @Module({
     imports: [LicenseModule],
   })
   export class AuthModule {}
   ```

4. Добавить `LicenseGuard` на login и refresh. Текущий проект сначала проверяет
   лицензию:

   ```typescript
   @UseGuards(LicenseGuard, LocalAuthGuard)
   @Post('login')

   @UseGuards(LicenseGuard, JwtRefreshGuard)
   @Post('refresh')
   ```

   Если требуется сначала аутентифицировать запрос и только затем обращаться к
   license server, guards можно переставить местами. Важно применять одинаково
   выбранный порядок и помнить, что NestJS выполняет их слева направо.

5. Добавить переменные окружения из раздела конфигурации. Для каждого клиента
   выдать собственные `LICENSE_KEY` и `LICENSE_DEVICE_ID`. URL, timeout и пути
   задаются с учётом окружения нового проекта.

6. Скопировать соответствующий публичный ключ в путь `LICENSE_PUBLIC_KEY_PATH`.
   Если используется относительный путь, проверить фактический `process.cwd()`
   production-процесса. Приватный ключ остаётся только на license server.

7. Обеспечить запись в каталог `LICENSE_CACHE_PATH`, исключить
   `license-cache.json` и `license-cache.json.tmp` из Git и настроить persistent
   volume для контейнерного деплоя.

8. Проверить совместимость протокола: endpoint должен принимать `key` и
   `deviceId`, возвращать ожидаемые поля `payload` и Base64-подпись, созданную
   над той же `stableStringify(payload)` строкой.

9. Выполнить сборку и проверить минимум четыре сценария: валидная лицензия;
   отключённая/истёкшая лицензия; недоступный license server с действующим
   кэшем; недоступный server без кэша или с истёкшим `graceUntil`.

---

## Процесс регистрации и верификации

```
1. POST /api/user/signup
   └── Создаётся пользователь (verify=false, генерируется verificationLink)
   └── Отправляется письмо с ссылкой верификации

2. GET /api/user/verify/:link
   └── Находится пользователь по verificationLink
   └── Если нет pendingEmail → verify=true, генерируется adminLink
   └── Отправляется письмо администратору (ADMIN_EMAIL) с ссылкой одобрения

3. GET /api/user/verify-admin/:link
   └── Администратор кликает ссылку
   └── Пользователь получает финальное письмо "Регистрация одобрена"
   └── Теперь пользователь может войти через /api/auth/login
```

---

## Сущности базы данных

### User

```
id, email, password (argon2, @Exclude), verify, verificationLink,
pendingEmail, role (ManyToOne→Role, eager), categories[], transactions[],
refreshToken (OneToOne→Token), createdAt, updatedAt
```

### Role

```
id, name (unique), description, permissions[] (ManyToMany→Permission),
createdAt, updatedAt
```

### Permission

```
id, resource, action, roles[] (ManyToMany→Role),
createdAt, updatedAt
```

### Token

```
id, refreshToken (argon2 hash), user (OneToOne→User, CASCADE),
createdAt, updatedAt
```

### Category

```
id (category_id), title, user (ManyToOne→User),
transactions[] (OneToMany→Transaction, CASCADE),
createdAt, updatedAt
```

### Transaction

```
id (transaction_id), title, type, amount,
user (ManyToOne→User), category (ManyToOne→Category),
createdAt, updatedAt
```

---

## Безопасность

| Механизм                    | Реализация                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| Хеширование паролей         | Argon2                                                                          |
| Хеширование refresh-токенов | Argon2                                                                          |
| Access-токен                | JWT 15 мин, Bearer header                                                       |
| Refresh-токен               | JWT 30 дней, httpOnly cookie + хеш в БД                                         |
| Ротация токенов             | Старый refresh удаляется при каждом обновлении                                  |
| Верификация email           | Обязательна до первого входа                                                    |
| Одобрение администратором   | Обязательно для новых пользователей                                             |
| RBAC                        | Разрешения привязаны к роли, роль привязана к пользователю                      |
| Ownership check             | Пользователь может менять только свои ресурсы                                   |
| Исключение пароля           | `@Exclude()` + `ClassSerializerInterceptor`                                     |
| Валидация DTO               | `class-validator`, `whitelist: true`, `forbidNonWhitelisted: true`              |
| Лицензирование              | Подписанный ответ license server проверяется публичным ключом при login/refresh |
| Офлайн-проверка лицензии    | Локальный подписанный кэш ограничен `graceUntil` и `expiresAt`                  |
