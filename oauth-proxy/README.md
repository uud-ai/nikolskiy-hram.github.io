# OAuth-прокси для админки (Decap CMS)

Сайт статичный (GitHub Pages), поэтому вход в админку `/admin` через GitHub
не может быть проверен самим сайтом — GitHub OAuth требует секретный
`client_secret`, который нельзя хранить в браузере. Эта папка — маленький
сервер (2 функции), который берёт код авторизации от GitHub и отдаёт токен
обратно окну админки. Разворачивается один раз на Vercel, дальше настоятель
просто заходит на `/admin` и жмёт «Login with GitHub» — никаких токенов и
терминала.

## Шаг 1. Создать GitHub OAuth App

1. Зайдите на https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.
   (Нужны права владельца/админа на репозиторий `uud-ai/nikolskiy-hram.github.io`.)
2. Заполните:
   - **Application name**: `Nikolskiy Hram CMS` (любое)
   - **Homepage URL**: `https://nikolskiyhram.site`
   - **Authorization callback URL**: `https://ВАШ-ПРОЕКТ.vercel.app/api/callback`
     (точный адрес узнаете после шага 2 — сюда его впишете уже после первого деплоя)
3. Нажмите **Register application**.
4. Скопируйте **Client ID**.
5. Нажмите **Generate a new client secret** и скопируйте **Client secret**
   (он показывается один раз).

## Шаг 2. Развернуть эту папку на Vercel

В вашем аккаунте Vercel:

1. **Add New → Project** → импортируйте репозиторий `uud-ai/nikolskiy-hram.github.io`.
2. В настройках проекта укажите **Root Directory**: `oauth-proxy`.
3. Framework Preset можно оставить `Other` — сборка не нужна.
4. В **Environment Variables** добавьте:
   - `OAUTH_CLIENT_ID` = Client ID из шага 1
   - `OAUTH_CLIENT_SECRET` = Client secret из шага 1
5. Нажмите **Deploy**.
6. После деплоя скопируйте адрес проекта, например
   `https://nikolskiy-hram-oauth.vercel.app`.

## Шаг 3. Дописать callback URL в GitHub OAuth App

Вернитесь в настройки OAuth App (шаг 1) и укажите точный
**Authorization callback URL**:

```
https://ВАШ-ПРОЕКТ.vercel.app/api/callback
```

## Шаг 4. Указать адрес прокси в конфиге админки

В файле `admin/config.yml` (в корне сайта) замените:

```yaml
base_url: https://REPLACE-WITH-YOUR-VERCEL-URL.vercel.app/api
```

на реальный адрес:

```yaml
base_url: https://nikolskiy-hram-oauth.vercel.app/api
```

Закоммитьте и запушьте — GitHub Pages обновит сайт за минуту-две.

## Проверка

Откройте `https://nikolskiyhram.site/admin/`, нажмите «Login with GitHub».
Должно открыться окно авторизации GitHub, после подтверждения — попасть в
интерфейс редактирования новостей. Логиниться сможет любой, у кого есть
доступ на запись в репозиторий (Settings → Collaborators на GitHub).
