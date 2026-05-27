# Dual Simplex Visualizer — Інструкція зі встановлення

## Структура файлів

Скопіюйте всі файли до `src/` вашого Vite-проекту:

```
src/
├── dualSimplex.js            ← математичне ядро (ESM)
├── DualSimplexApp.jsx        ← головний компонент
├── MatrixInput.jsx           ← форма введення даних
├── StepVisualizer.jsx        ← покрокова таблиця
└── SimplexApp.module.scss    ← стилі SCSS Modules
```

## 1. Створення Vite-проекту (якщо ще немає)

```bash
npm create vite@latest dual-simplex -- --template react
cd dual-simplex
npm install
```

## 2. Встановлення SCSS

```bash
npm install -D sass
```

Vite підтримує SCSS Modules без додаткових плагінів — файли `*.module.scss`
обробляються автоматично після встановлення `sass`.

## 3. Підключення головного компонента

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

## 4. Базові глобальні стилі (src/index.css)

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f8f7f4; }
```

## 5. Запуск

```bash
npm run dev
```

---

## Тестовий приклад (завантажується кнопкою «Завантажити приклад»)

**Задача:** мінімізувати z = 2x₁ + 3x₂  
**За умов:** x₁ + x₂ ≥ 4,  x₁ + 3x₂ ≥ 6,  x₁, x₂ ≥ 0

**Очікуваний результат:** x₁ = 3, x₂ = 1, z* = 9

---

## Примітки щодо вхідних даних

Застосунок очікує таблицю вже у **канонічній формі для двоїстого методу**:
- Рядок оцінок `c̄ⱼ ≤ 0` (для min) — двоїста допустимість
- Деякі `bᵢ < 0` — пряма недопустимість

При заповненні вручну:
1. Множте рядки-нерівності `≥` на -1 (щоб bᵢ стало від'ємним)
2. Додайте одиничні стовпці для слабких змінних (s₁, s₂, ...)
3. Оберіть слабкі змінні як початковий базис
