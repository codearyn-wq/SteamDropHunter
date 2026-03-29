# 🚀 Інструкція з розгортання на Render

## ✅ Що було додано для Render

1. **Keep-Alive служба** (`src/keep-alive.ts`) - пінгує сервер кожні 4 хвилини для запобігання засинання
2. **render.yaml** - конфігураційний файл для деплою
3. **Оновлений package.json** - додано скрипт `render:start`

## 📋 Кроки розгортання

### Крок 1: Підготовка

1. **Створіть Telegram бота:**
   - Відкрийте [@BotFather](https://t.me/BotFather)
   - Надішліть `/newbot`
   - Дотримуйтесь інструкцій
   - Збережіть токен

2. **Дізнайтеся свій Telegram ID:**
   - Відкрийте [@userinfobot](https://t.me/userinfobot)
   - Надішліть будь-яке повідомлення
   - Збережіть ваш ID

3. **Завантажте код на GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/steam-drop-hunter.git
   git push -u origin main
   ```

### Крок 2: Створення сервісу на Render

1. **Увійдіть на [Render.com](https://render.com)**

2. **Створіть новий Web Service:**
   - Натисніть **New +** → **Web Service**
   - Оберіть **Connect a repository**
   - Знайдіть свій репозиторій `steam-drop-hunter`

3. **Налаштуйте сервіс:**

   | Поле | Значення |
   |------|----------|
   | **Name** | `steam-drop-hunter` |
   | **Region** | `Frankfurt, Germany (eu-central)` |
   | **Branch** | `main` |
   | **Root Directory** | (залиште пустим) |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `node dist/index.js` |
   | **Instance Type** | `Free` |

### Крок 3: Додайте змінні оточення

У вкладці **Environment** додайте:

```
NODE_ENV = production
TELEGRAM_BOT_TOKEN = 1234567890:AAFgHjKlMnOpQrStUvWxYz (ваш токен)
TELEGRAM_ADMIN_ID = 123456789 (ваш ID)
POLL_INTERVAL_MS = 300000
KEEP_ALIVE_INTERVAL_MS = 240000
LOG_LEVEL = info
API_KEY = your-secure-random-string-here
RENDER_EXTERNAL_URL = https://steam-drop-hunter.onrender.com (після створення)
```

### Крок 4: Додайте Persistent Disk

У вкладці **Disks** натисніть **Add Disk**:

```
Name: steam-data
Mount Path: /opt/render/project/src/data
Size: 1 GB
```

### Крок 5: Запустіть деплой

1. Натисніть **Create Web Service**
2. Зачекайте завершення деплою (~2-5 хвилин)
3. Скопіюйте URL вашого додатку

### Крок 6: Налаштуйте Keep-Alive

1. Скопіюйте URL додатку (наприклад, `https://steam-drop-hunter.onrender.com`)
2. Додайте його як змінну `RENDER_EXTERNAL_URL`
3. Перезапустіть сервіс (вкладка **Manual Deploy** → **Restart**)

## 🔍 Перевірка роботи

### 1. Перевірте health endpoint

```bash
curl https://YOUR_APP_URL.onrender.com/health
```

Очікуваний результат:
```json
{
  "status": "ok",
  "timestamp": "2026-03-29T12:00:00.000Z",
  "uptime": 120
}
```

### 2. Перевірте API статистики

```bash
curl https://YOUR_APP_URL.onrender.com/api/stats
```

### 3. Протестуйте Telegram бота

1. Знайдіть свого бота в Telegram
2. Надішліть `/start`
3. Перевірте відповідь

## 📊 Логи

Для перегляду логів:
1. Відкрийте Dashboard на Render
2. Оберіть ваш сервіс
3. Перейдіть на вкладку **Logs**

## ⚠️ Важливі моменти

### Free тариф обмеження:
- **750 годин/місяць** - достатньо для 24/7 роботи
- **512 MB RAM** - достатньо для цього бота
- **1 GB диск** - достатньо для бази даних
- **Засинає після 15 хв** - keep-alive запобігає цьому

### Keep-Alive не працює?
1. Перевірте, що `RENDER_EXTERNAL_URL` встановлено правильно
2. Перевірте логи на наявність помилок
3. Переконайтеся, що health endpoint доступний

### Помилки бази даних?
1. Переконайтеся, що диск примонтовано
2. Перевірте шлях: `/opt/render/project/src/data`

## 🎯 Команди бота

| Команда | Опис |
|---------|------|
| `/start` | Привітання та інформація |
| `/free` | Поточні безкоштовні ігри |
| `/subscribe` | Підписатися на сповіщення |
| `/unsubscribe` | Відписатися від сповіщень |
| `/stats` | Статистика бота |
| `/help` | Довідка |

## 💰 Тарифи

### Free (безкоштовно)
- ✅ 750 годин на місяць
- ✅ 512 MB RAM
- ✅ 1 GB диск
- ⚠️ Засинає (keep-alive вирішує)

### Standard ($7/міс)
- ✅ Не засинає
- ✅ 4 GB диск
- ✅ 512 MB RAM
- ✅ Пріоритетна підтримка

## 🆘 Troubleshooting

### Сервіс не запускається
1. Перевірте логи в Render
2. Переконайтеся, що всі змінні оточення встановлено
3. Перевірте правильність токену бота

### Бот не відповідає
1. Перевірте, чи бот доданий в контакти
2. Перевірте `TELEGRAM_BOT_TOKEN`
3. Перегляньте логи

### Помилки бази даних
1. Переконайтеся, що диск примонтовано правильно
2. Перевірте права доступу в логах

## 📚 Корисні посилання

- [Render Documentation](https://render.com/docs)
- [Render Pricing](https://render.com/pricing)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Node.js on Render](https://render.com/docs/node)

## 🎉 Готово!

Ваш бот тепер працює на Render 24/7 і моніторить Steam на наявність безкоштовних ігор!
