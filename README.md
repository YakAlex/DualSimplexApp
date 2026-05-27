# Dual Simplex Visualizer — Інструкція зі встановлення

## Структура файлів

Скопіюйте всі файли до `src/` вашого Vite-проекту:

```text
src/
├── dualSimplex.js            ← незмінне математичне ядро (ESM export)
├── gomory.js                 ← обгортка Гоморі
├── DualSimplexApp.jsx        ← оркестратор
├── MatrixInput.jsx           ← форма + Gomory checkbox
├── StepVisualizer.jsx        ← покроковий рендер
└── SimplexApp.module.scss    ← всі стилі SCSS Modules
```

Ключові моменти реалізації: `gomory_cut`-крок зберігає `gomoryRowIndex` для точного підсвічування фіолетового рядка. Мітки змінних (`varLabels`) будуються від першого кроку — тому x₁, x₂, s₁, s₂ стабільні, а нові слабкі змінні від відсікань автоматично отримують назви s₃, s₄... Чіп розв'язку показує лише оригінальні змінні та має фіолетовий варіант зі значком ∈ ℤ для цілочислового результату.

## 1. Створення Vite-проекту (якщо ще немає)

```bash
npm create vite@latest dual-simplex -- --template react
cd dual-simplex
npm install
```

## 2. Встановлення SCSS та пакету для деплою

```bash
npm install -D sass gh-pages
```

Vite підтримує SCSS Modules без додаткових плагінів — файли `*.module.scss`
обробляються автоматично після встановлення `sass`.

## 3. Підключення шрифтів (index.html)

Додайте у файл `index.html` (всередину тегу `<head>`):

```html
<link href="[https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;600;700&display=swap](https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;600;700&display=swap)" rel="stylesheet">
```

## 4. Підключення головного компонента

Відредагуйте `src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import DualSimplexApp from './DualSimplexApp'
import './index.css'   // або видаліть якщо не потрібен

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DualSimplexApp />
  </React.StrictMode>
)
```

## 5. Базові глобальні стилі (src/index.css)

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f8f7f4; font-family: 'Syne', sans-serif; }
```

## 6. Деплой на GitHub Pages

1. У `vite.config.js` додайте: `base: '/назва-репозиторію/',`
2. У `package.json` в `"scripts"` додайте дві команди:
```json
  {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
    }
```
3. Виконайте команду для публікації:
```bash
npm run deploy
```

## 7. Запуск

```bash
npm run dev
```

---

## Тестові приклади (завантажуються кнопками)

**Приклад 1: Двоїстий симплекс (неперервний)**
* **Задача:** мінімізувати z = 2x₁ + 3x₂
* **За умов:** x₁ + x₂ ≥ 4,  x₁ + 3x₂ ≥ 6,  x₁, x₂ ≥ 0
* **Очікуваний результат:** x₁ = 3, x₂ = 1, z* = 9

**Приклад 2: Метод Гоморі (цілочисловий)**
* **Задача:** мінімізувати z = 3x₁ + 4x₂
* **За умов:** 2x₁ + 3x₂ ≥ 8, x₁ + 2x₂ ≥ 5, x₁, x₂ ≥ 0 та цілі
* **Очікуваний результат:** x₁ = 1, x₂ = 2, z* = 11

---

## Примітки щодо вхідних даних

Застосунок очікує таблицю вже у **канонічній формі для двоїстого методу**:
- Рядок оцінок `c̄ⱼ ≤ 0` (для min) або `≥ 0` (для max) — двоїста допустимість (інакше форма видасть помилку).
- Деякі `bᵢ < 0` — пряма недопустимість.

При заповненні вручну:
1. Множте рядки-нерівності `≥` на -1 (щоб bᵢ стало від'ємним)
2. Додайте одиничні стовпці для слабких змінних (s₁, s₂, ...)
3. Оберіть слабкі змінні як початковий базис