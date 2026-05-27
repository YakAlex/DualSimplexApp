import { dualSimplex } from "./dualSimplex";

const EPS      = 1e-6;
const MAX_CUTS = 20;

function frac(v) {
    return v - Math.floor(v);
}

function isInteger(v) {
    const f = frac(v);
    return f < EPS || f > 1 - EPS;
}

export function solveGomory(A, b, c, basis, sense = "min") {
    let curA     = A.map(row => [...row]);
    let curB     = [...b];
    let curC     = [...c];
    let curBasis = [...basis];

    const allSteps       = [];
    let gomoryIterations = 0;

    for (let cut = 0; cut <= MAX_CUTS; cut++) {

        // ── 1. Розв'язуємо поточну LP двоїстим симплекс-методом ──────────────
        const dsResult = dualSimplex(curA, curB, curC, curBasis, sense);
        allSteps.push(...dsResult.steps);

        // ── 2. Обробка нефінальних статусів ──────────────────────────────────
        if (dsResult.status !== "optimal") {
            return {
                steps:             allSteps,
                status:            dsResult.status,
                solution:          null,
                objectiveValue:    null,
                gomoryIterations,
            };
        }

        // ── 3. Отримуємо фінальну таблицю ─────────────────────────────────────
        const lastStep = dsResult.steps[dsResult.steps.length - 1];
        const tableau  = lastStep.tableau;       // [m × n]
        const rhs      = lastStep.rhs;           // [m]
        const objRow   = lastStep.objectiveRow;  // [n]
        const basisNow = lastStep.basis;         // [m]
        const m        = tableau.length;
        const n        = tableau[0].length;

        // ── 4. Шукаємо рядок з найбільшою дробовою частиною ──────────────────
        let sourceRow = -1;
        let maxFrac   = EPS;

        for (let i = 0; i < m; i++) {
            const f = frac(rhs[i]);
            const effectiveFrac = f > 1 - EPS ? 0 : f;
            if (effectiveFrac > maxFrac) {
                maxFrac   = effectiveFrac;
                sourceRow = i;
            }
        }

        // ── Цілочисловий оптимум знайдено ─────────────────────────────────────
        if (sourceRow === -1) {
            return {
                steps:             allSteps,
                status:            "optimal_integer",
                solution:          dsResult.solution,
                objectiveValue:    dsResult.objectiveValue,
                gomoryIterations,
            };
        }

        gomoryIterations++;

        // ── 5. Будуємо відсікання Гоморі ──────────────────────────────────────
        // Нове обмеження: -Σ frac(a_ij)·xj + s_new = -frac(rhs[i])
        const fi             = frac(rhs[sourceRow]);
        const sourceVarIndex = basisNow[sourceRow];

        const cutCoeffs = tableau[sourceRow].map(aij => {
            const f = frac(aij);
            return f > 1 - EPS ? 0 : -f;   // -frac(aij)
        });

        // ── 6. Розширюємо таблицю: новий стовпець + новий рядок ───────────────
        const newColIdx  = n;                           // індекс нової змінної s_new
        const newTableau = tableau.map(row => [...row, 0]);   // +0 у кожен існуючий рядок
        const newRhs     = [...rhs];
        const newObjRow  = [...objRow, 0];              // с̄ для s_new = 0
        const newBasis   = [...basisNow];
        const newC       = [...curC, 0];                // c для s_new = 0

        // Рядок відсікання: [...cutCoeffs, +1] | rhs = -fi
        newTableau.push([...cutCoeffs, 1]);
        newRhs.push(-fi);
        newBasis.push(newColIdx);

        // ── 7. Крок-маркер gomory_cut ─────────────────────────────────────────
        const nonZeroTerms = cutCoeffs
            .map((v, j) => (Math.abs(v) > EPS ? `(${v.toFixed(4)})·x${j + 1}` : null))
            .filter(Boolean)
            .join(" + ");

        const cutMsg =
            `✂ Відсікання Гоморі #${gomoryIterations}: ` +
            `обрано рядок ${sourceRow + 1} ` +
            `(базисна змінна x${sourceVarIndex + 1}, ` +
            `b = ${rhs[sourceRow].toFixed(6)}, ` +
            `дробова частина f = ${fi.toFixed(6)}). ` +
            `Нове обмеження: ${nonZeroTerms || "0"} + s${newColIdx + 1} = ${(-fi).toFixed(6)}.`;

        allSteps.push({
            tableau:        newTableau.map(r => [...r]),
            rhs:            [...newRhs],
            objectiveRow:   [...newObjRow],
            objectiveValue: dsResult.objectiveValue,
            basis:          [...newBasis],
            pivotRow:       newTableau.length - 1,
            pivotCol:       null,
            pivotElement:   null,
            status:         "gomory_cut",
            message:        cutMsg,
            gomoryRowIndex: newTableau.length - 1,
            cutIteration:   gomoryIterations,
        });

        // ── 8. Готуємо наступну ітерацію ──────────────────────────────────────
        curA     = newTableau;
        curB     = newRhs;
        curC     = newC;
        curBasis = [...newBasis];
    }

    // Перевищено ліміт відсікань
    allSteps.push({
        tableau:        curA.map(r => [...r]),
        rhs:            [...curB],
        objectiveRow:   [],
        objectiveValue: 0,
        basis:          [...curBasis],
        pivotRow:       null,
        pivotCol:       null,
        pivotElement:   null,
        status:         "infeasible",
        message:        `Перевищено ліміт відсікань (${MAX_CUTS}). Перевірте вхідні дані.`,
    });

    return {
        steps:             allSteps,
        status:            "max_iter_exceeded",
        solution:          null,
        objectiveValue:    null,
        gomoryIterations,
    };
}