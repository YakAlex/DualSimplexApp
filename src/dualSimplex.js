/**
 * dualSimplex.js  — ESM версія для Vite/React
 *
 * Двоїстий симплекс-метод з повним записом кроків для покрокової візуалізації.
 *
 * @param {number[][]} A      Матриця обмежень [m × n]
 * @param {number[]}   b      Вектор правих частин [m]
 * @param {number[]}   c      Коефіцієнти ЦФ [n]
 * @param {number[]}   basis  Початковий базис — індекси змінних [m]
 * @param {'max'|'min'} sense Напрямок оптимізації
 * @returns {{ steps, status, solution, objectiveValue }}
 */
export function dualSimplex(A, b, c, basis, sense = 'max') {
  const m = A.length;
  const n = A[0].length;

  let tableau  = A.map(row => [...row]);
  let rhs      = [...b];
  let basisIdx = [...basis];
  let objRow   = sense === 'max' ? [...c] : c.map(v => -v);

  const steps    = [];
  const MAX_ITER = 100;

  function calcObjective() {
    let val = 0;
    for (let i = 0; i < m; i++) val += c[basisIdx[i]] * rhs[i];
    return val;
  }

  function snapshot(pivotRow, pivotCol, status, message) {
    return {
      tableau:        tableau.map(row => [...row]),
      rhs:            [...rhs],
      objectiveRow:   [...objRow],
      objectiveValue: calcObjective(),
      basis:          [...basisIdx],
      pivotRow,
      pivotCol,
      pivotElement:   (pivotRow !== null && pivotCol !== null)
                        ? tableau[pivotRow][pivotCol]
                        : null,
      status,
      message,
    };
  }

  for (let iter = 0; iter < MAX_ITER; iter++) {

    // Крок 1: провідний рядок
    let pivotRow = null;
    let minVal   = -1e-10;
    for (let i = 0; i < m; i++) {
      if (rhs[i] < minVal) { minVal = rhs[i]; pivotRow = i; }
    }

    // Умова оптимальності
    if (pivotRow === null) {
      steps.push(snapshot(null, null, 'optimal',
        "Усі праві частини ≥ 0. Знайдено оптимальний розв'язок!"));
      const solution = new Array(n).fill(0);
      for (let i = 0; i < m; i++) solution[basisIdx[i]] = rhs[i];
      return { steps, status: 'optimal', solution, objectiveValue: calcObjective() };
    }

    // Крок 2: провідний стовпець
    let pivotCol = null;
    let minTheta = Infinity;
    for (let j = 0; j < n; j++) {
      const aij = tableau[pivotRow][j];
      if (aij < -1e-10) {
        const theta = objRow[j] / aij;
        if (theta < minTheta) { minTheta = theta; pivotCol = j; }
      }
    }

    if (pivotCol === null) {
      steps.push(snapshot(pivotRow, null, 'infeasible',
        `Рядок ${pivotRow + 1} (b = ${rhs[pivotRow].toFixed(4)}) не містить від'ємних елементів. Задача не має розв'язку.`));
      return { steps, status: 'infeasible', solution: null, objectiveValue: null };
    }

    // Знімок ДО перетворення
    steps.push(snapshot(pivotRow, pivotCol, 'iterating',
      `Ітерація ${iter + 1}: провідний елемент a[${pivotRow + 1}][${pivotCol + 1}] = ${tableau[pivotRow][pivotCol].toFixed(4)}. ` +
      `Змінна x${pivotCol + 1} входить у базис замість x${basisIdx[pivotRow] + 1}.`));

    // Крок 3: Жорданове виключення
    const pivot = tableau[pivotRow][pivotCol];
    for (let j = 0; j < n; j++) tableau[pivotRow][j] /= pivot;
    rhs[pivotRow] /= pivot;

    for (let i = 0; i < m; i++) {
      if (i === pivotRow) continue;
      const factor = tableau[i][pivotCol];
      for (let j = 0; j < n; j++) tableau[i][j] -= factor * tableau[pivotRow][j];
      rhs[i] -= factor * rhs[pivotRow];
    }

    const factorObj = objRow[pivotCol];
    for (let j = 0; j < n; j++) objRow[j] -= factorObj * tableau[pivotRow][j];

    basisIdx[pivotRow] = pivotCol;
  }

  steps.push(snapshot(null, null, 'infeasible', 'Перевищено ліміт ітерацій.'));
  return { steps, status: 'max_iter_exceeded', solution: null, objectiveValue: null };
}
