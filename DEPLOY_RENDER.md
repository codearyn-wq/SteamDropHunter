# 🚀 Розгортання на Render

## Швидкий старт

### 1. Підготовка

1. Створіть Telegram бота через [@BotFather](https://t.me/BotFather)
2. Отримайте токен бота
3. Дізнайтеся свій Telegram ID через [@userinfobot](https://t.me/userinfobot)
4. Завантажте код на GitHub

### 2. Деплой

1. Відкрийте [Render Dashboard](https://dashboard.render.com)
2. Натисніть **New +** → **Web Service**
3. Підключіть свій GitHub репозиторій
4. Заповніть налаштування:

```
Name: steam-drop-hunter
Region: Frankfurt (eu-central)
Branch: main
Root Directory: (залиште пустим)
Runtime: Node
Build Command: npm install && npm run build
Start Command: node dist/index.js
Instance Type: Free
```

### 3. Змінні оточення

Додайте ці змінні в Render (Environment tab):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `TELEGRAM_BOT_TOKEN` | `1234567890:AAFgHjKlMnOpQrStUvWxYz` (ваш токен) |
| `TELEGRAM_ADMIN_ID` | `123456789` (ваш ID) |
| `POLL_INTERVAL_MS` | `300000` |
| `KEEP_ALIVE_INTERVAL_MS` | `240000` |
| `LOG_LEVEL` | `info` |
| `API_KEY` | `your-secure-random-string-here` |
| `RENDER_EXTERNAL_URL` | `https://steam-drop-hunter.onrender.com` (після створення) |

### 4. Диск

Додайте Persistent Disk (Disks tab):

```
Name: steam-data
Mount Path: /opt/render/project/src/data
Size: 1 GB
```

### 5. Перевірка

Після деплою перевірте:

```bash
# Замініть YOUR_APP_URL на вашу адресу
curl https://YOUR_APP_URL.onrender.com/health
curl https://YOUR_APP_URL.onrender.com/api/stats
```

## Keep-Alive

Для уникнення засинання на free tariff:

1. Після деплою скопіюйте URL вашого додатку
2. Додайте його як змінну `RENDER_EXTERNAL_URL`
3. Перезапустіть сервіс

Keep-alive служба буде пінгувати сервер кожні 4 хвилини.

## Команди бота

- `/start` - Привітання
- `/free` - Поточні безкоштовні ігри
- `/subscribe` - Підписатися на сповіщення
- `/unsubscribe` - Відписатися
- `/stats` - Статистика
- `/help` - Довідка

## Логи

Перегляд логів в Render:
1. Відкрийте Dashboard
2. Оберіть ваш сервіс
3. Перейдіть на вкладку **Logs**

## Вартість

**Free тариф:**
- ✅ 750 годин на місяць (достатньо для 24/7)
- ✅ 512 MB RAM
- ✅ 1 GB диск
- ⚠️ Засинає після 15 хв без активності (keep-alive вирішує)

**Paid тариф ($7/міс):**
- ✅ Не засинає
- ✅ 4 GB диск
- ✅ Пріоритетна підтримка

## Можливі проблеми

### Сервіс засинає
- Переконайтеся, що `RENDER_EXTERNAL_URL` встановлено правильно
- Перевірте логи на наявність помилок keep-alive

### Помилки бази даних
- Переконайтеся, що диск примонтовано в `/opt/render/project/src/data`
- Перевірте права доступу в логах

### Бот не працює
- Перевірте правильність `TELEGRAM_BOT_TOKEN`
- Перегляньте логи в Render

## Корисні посилання

- [Render Documentation](https://render.com/docs)
- [Render Pricing](https://render.com/pricing)
- [Telegram Bot API](https://core.telegram.org/bots/api)
