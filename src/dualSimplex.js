import Fraction from "fraction.js";

// Допоміжна функція для красивого виводу дробів у текстові повідомлення
function fracStr(v) {
  if (v.d === 1) return String(v.n * v.s);
  return `${v.s < 0 ? '-' : ''}${v.n}/${v.d}`;
}

/**
 * dualSimplex.js  — ESM версія для Vite/React (Fraction.js)
 */
export function dualSimplex(A, b, c, basis, sense = 'max') {
  const m = A.length;
  const n = A[0].length;

  let tableau  = A.map(row => row.map(v => new Fraction(v)));
  let rhs      = b.map(v => new Fraction(v));
  let c_frac   = c.map(v => new Fraction(v));
  let basisIdx = [...basis];

  let objRow   = sense === 'max'
      ? c_frac.map(v => new Fraction(v))
      : c_frac.map(v => v.mul(-1));

  // 🛠 ФІКС: Канонізація рядка оцінок (objRow)
  // Відновлюємо правильні нулі під поточними базисними змінними
  for (let i = 0; i < m; i++) {
    const basicVar = basisIdx[i];
    const factor = objRow[basicVar];
    if (factor.n !== 0) {
      for (let j = 0; j < n; j++) {
        objRow[j] = objRow[j].sub(factor.mul(tableau[i][j]));
      }
    }
  }

  const steps    = [];
  const MAX_ITER = 100;

  function calcObjective() {
    let val = new Fraction(0);
    for (let i = 0; i < m; i++) {
      val = val.add(c_frac[basisIdx[i]].mul(rhs[i]));
    }
    return val;
  }

  function snapshot(pivotRow, pivotCol, status, message) {
    return {
      tableau:        tableau.map(row => row.map(v => new Fraction(v))),
      rhs:            rhs.map(v => new Fraction(v)),
      objectiveRow:   objRow.map(v => new Fraction(v)),
      objectiveValue: calcObjective(),
      basis:          [...basisIdx],
      pivotRow,
      pivotCol,
      pivotElement:   (pivotRow !== null && pivotCol !== null)
          ? new Fraction(tableau[pivotRow][pivotCol])
          : null,
      status,
      message,
    };
  }

  for (let iter = 0; iter < MAX_ITER; iter++) {

    // Крок 1: провідний рядок
    let pivotRow = null;
    let minVal   = new Fraction(0);

    for (let i = 0; i < m; i++) {
      if (rhs[i].s < 0) {
        if (pivotRow === null || rhs[i].compare(minVal) < 0) {
          minVal = rhs[i];
          pivotRow = i;
        }
      }
    }

    if (pivotRow === null) {
      steps.push(snapshot(null, null, 'optimal',
          "Усі праві частини ≥ 0. Знайдено оптимальний розв'язок!"));
      const solution = new Array(n).fill(new Fraction(0));
      for (let i = 0; i < m; i++) solution[basisIdx[i]] = new Fraction(rhs[i]);
      return { steps, status: 'optimal', solution, objectiveValue: calcObjective() };
    }

    // Крок 2: провідний стовпець
    let pivotCol = null;
    let minTheta = null;

    for (let j = 0; j < n; j++) {
      const aij = tableau[pivotRow][j];
      if (aij.s < 0) {
        const theta = objRow[j].div(aij).abs();
        if (minTheta === null || theta.compare(minTheta) < 0) {
          minTheta = theta;
          pivotCol = j;
        }
      }
    }

    if (pivotCol === null) {
      steps.push(snapshot(pivotRow, null, 'infeasible',
          `Рядок ${pivotRow + 1} (b = ${fracStr(rhs[pivotRow])}) не містить від'ємних елементів. Задача не має розв'язку.`));
      return { steps, status: 'infeasible', solution: null, objectiveValue: null };
    }

    steps.push(snapshot(pivotRow, pivotCol, 'iterating',
        `Ітерація ${iter + 1}: провідний елемент a[${pivotRow + 1}][${pivotCol + 1}] = ${fracStr(tableau[pivotRow][pivotCol])}. ` +
        `Змінна x${pivotCol + 1} входить у базис.`));

    // Крок 3: Жорданове виключення
    const pivot = tableau[pivotRow][pivotCol];
    for (let j = 0; j < n; j++) {
      tableau[pivotRow][j] = tableau[pivotRow][j].div(pivot);
    }
    rhs[pivotRow] = rhs[pivotRow].div(pivot);

    for (let i = 0; i < m; i++) {
      if (i === pivotRow) continue;
      const factor = tableau[i][pivotCol];
      for (let j = 0; j < n; j++) {
        tableau[i][j] = tableau[i][j].sub(factor.mul(tableau[pivotRow][j]));
      }
      rhs[i] = rhs[i].sub(factor.mul(rhs[pivotRow]));
    }

    const factorObj = objRow[pivotCol];
    for (let j = 0; j < n; j++) {
      objRow[j] = objRow[j].sub(factorObj.mul(tableau[pivotRow][j]));
    }

    basisIdx[pivotRow] = pivotCol;
  }

  steps.push(snapshot(null, null, 'infeasible', 'Перевищено ліміт ітерацій.'));
  return { steps, status: 'max_iter_exceeded', solution: null, objectiveValue: null };
}