import Fraction from "fraction.js";
import { dualSimplex } from "./dualSimplex";

const MAX_CUTS = 20;

function fracStr(v) {
    return v.d === 1 ? String(v.n * v.s) : `${v.s < 0 ? '-' : ''}${v.n}/${v.d}`;
}

// Функція для отримання ідеально точної дробової частини (f = x - floor(x))
function getFrac(f) {
    const fl = Math.floor(f.valueOf());
    return f.sub(new Fraction(fl));
}

export function solveGomory(A, b, c, basis, sense = "min") {
    // Якщо прийшли звичайні числа - перетворюємо. Якщо дроби - не страшно.
    let curA     = A.map(row => row.map(v => new Fraction(v)));
    let curB     = b.map(v => new Fraction(v));
    let curC     = c.map(v => new Fraction(v));
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
        const tableau  = lastStep.tableau;
        const rhs      = lastStep.rhs;
        const objRow   = lastStep.objectiveRow;
        const basisNow = lastStep.basis;
        const m        = tableau.length;
        const n        = tableau[0].length;

        // ── 4. Шукаємо рядок з найбільшою дробовою частиною ──────────────────
        let sourceRow = -1;
        let maxFrac   = new Fraction(0);

        for (let i = 0; i < m; i++) {
            const f = getFrac(rhs[i]);
            if (f.n !== 0) { // Якщо дробова частина строго не нуль
                if (f.compare(maxFrac) > 0) {
                    maxFrac   = f;
                    sourceRow = i;
                }
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
        const fi             = getFrac(rhs[sourceRow]);
        const sourceVarIndex = basisNow[sourceRow];

        const cutCoeffs = tableau[sourceRow].map(aij => {
            const f = getFrac(aij);
            return f.n === 0 ? new Fraction(0) : f.mul(-1); // -frac(aij)
        });

        // ── 6. Розширюємо таблицю: новий стовпець + новий рядок ───────────────
        const newColIdx  = n;
        const newTableau = tableau.map(row => [...row, new Fraction(0)]);
        const newRhs     = [...rhs];
        const newObjRow  = [...objRow, new Fraction(0)];
        const newBasis   = [...basisNow];
        const newC       = [...curC, new Fraction(0)];

        // Рядок відсікання: [...cutCoeffs, +1] | rhs = -fi
        newTableau.push([...cutCoeffs, new Fraction(1)]);
        newRhs.push(fi.mul(-1));
        newBasis.push(newColIdx);

        // ── 7. Крок-маркер gomory_cut ─────────────────────────────────────────
        const nonZeroTerms = cutCoeffs
            .map((v, j) => (v.n !== 0 ? `(${fracStr(v)})·x${j + 1}` : null))
            .filter(Boolean)
            .join(" + ");

        const cutMsg =
            `✂ Відсікання Гоморі #${gomoryIterations}: ` +
            `обрано рядок ${sourceRow + 1} ` +
            `(базисна змінна x${sourceVarIndex + 1}, ` +
            `b = ${fracStr(rhs[sourceRow])}, ` +
            `дробова частина f = ${fracStr(fi)}). ` +
            `Нове обмеження: ${nonZeroTerms || "0"} + s${newColIdx + 1} = ${fracStr(fi.mul(-1))}.`;

        allSteps.push({
            tableau:        newTableau.map(r => [...r]),
            rhs:            [...newRhs],
            objectiveRow:   [...newObjRow],
            objectiveValue: new Fraction(lastStep.objectiveValue),
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
        objectiveValue: new Fraction(0),
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