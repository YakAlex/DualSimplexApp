import styles from "./SimplexApp.module.scss";

function fmt(v) {
    if (typeof v !== "number") return "—";
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(4).replace(/\.?0+$/, "");
}

const STATUS_LABEL = {
    iterating:       "Ітерація (двоїстий симплекс)",
    optimal:         "✓ Оптимальний розв'язок LP",
    optimal_integer: "✓ Цілочисловий оптимальний розв'язок",
    infeasible:      "✗ Задача не має розв'язку",
    gomory_cut:      "✂ Відсікання Гоморі",
};

// ── Одна картка-крок ─────────────────────────────────────────────────────────
function StepCard({ step, stepNumber, varLabels, baseCols }) {
    const isGomoryStep = step.status === "gomory_cut";

    function cellClass(i, j) {
        if (isGomoryStep && i === step.gomoryRowIndex) return styles.cellGomoryRow;
        const isPivotRow = i === step.pivotRow;
        const isPivotCol = j === step.pivotCol;
        if (isPivotRow && isPivotCol) return styles.cellPivot;
        if (isPivotRow)               return styles.cellPivotRow;
        if (isPivotCol)               return styles.cellPivotCol;
        return "";
    }

    function rowClass(i) {
        if (isGomoryStep && i === step.gomoryRowIndex) return styles.gomoryRowTr;
        if (i === step.pivotRow) return styles.pivotRowTr;
        return "";
    }

    function rhsCellClass(i) {
        const isGomoryRow = isGomoryStep && i === step.gomoryRowIndex;
        const isPivotRow  = i === step.pivotRow && !isGomoryStep;
        return [
            styles.dataCell,
            styles.rhsCell,
            isGomoryRow ? styles.cellGomoryRow : "",
            isPivotRow  ? styles.cellPivotRow  : "",
            step.rhs[i] < -1e-10 ? styles.negativeRhs : "",
        ].filter(Boolean).join(" ");
    }

    return (
        <div className={`${styles.printCard} ${isGomoryStep ? styles.printCardGomory : ""}`}>

            {/* ── Заголовок картки ── */}
            <div className={styles.printCardHeader}>
                <span className={styles.printStepNum}>Крок {stepNumber}</span>
                <span className={`${styles.printStatusLabel} ${
                    isGomoryStep           ? styles.printStatusGomory    :
                        step.status === "optimal" || step.status === "optimal_integer"
                            ? styles.printStatusOptimal   :
                            step.status === "infeasible" ? styles.printStatusInfeasible : ""
                }`}>
          {STATUS_LABEL[step.status] ?? step.status}
        </span>
            </div>

            {/* ── Пояснення ── */}
            <p className={styles.printMessage}>{step.message}</p>

            {/* ── Бейджі pivot / Gomory ── */}
            {!isGomoryStep && step.pivotRow !== null && step.pivotCol !== null && (
                <div className={styles.pivotInfo}>
          <span className={styles.pivotBadge}>
            Провідний рядок: <strong>{step.pivotRow + 1}</strong>
          </span>
                    <span className={styles.pivotBadge}>
            Провідний стовпець: <strong>{varLabels[step.pivotCol]}</strong>
          </span>
                    <span className={styles.pivotBadge}>
            Елемент: <strong>{fmt(step.pivotElement)}</strong>
          </span>
                </div>
            )}
            {isGomoryStep && (
                <div className={styles.pivotInfo}>
          <span className={`${styles.pivotBadge} ${styles.pivotBadgeGomory}`}>
            ✂ Відсікання #{step.cutIteration}
          </span>
                    <span className={`${styles.pivotBadge} ${styles.pivotBadgeGomory}`}>
            Новий рядок: {step.gomoryRowIndex + 1}
          </span>
                </div>
            )}

            {/* ── Симплекс-таблиця ── */}
            <div className={styles.tableWrap}>
                <table className={styles.simplexTable}>
                    <thead>
                    <tr>
                        <th className={styles.cornerCell}>Базис</th>
                        {varLabels.map((l, j) => (
                            <th key={j} className={[
                                styles.colHead,
                                !isGomoryStep && j === step.pivotCol ? styles.colHeadActive : "",
                                j >= baseCols ? styles.colHeadNew : "",
                            ].filter(Boolean).join(" ")}>
                                {l}
                                {j >= baseCols && <span className={styles.newColTag}>new</span>}
                            </th>
                        ))}
                        <th className={styles.rhsHead}>b</th>
                    </tr>
                    </thead>
                    <tbody>
                    {step.tableau.map((row, i) => {
                        const isGomoryNewRow = isGomoryStep && i === step.gomoryRowIndex;
                        return (
                            <tr key={i} className={rowClass(i)}>
                                <td className={[
                                    styles.basisCell,
                                    isGomoryNewRow ? styles.basisCellGomory : "",
                                ].filter(Boolean).join(" ")}>
                                    {varLabels[step.basis[i]] ?? `s${step.basis[i] + 1}`}
                                    {isGomoryNewRow && <span className={styles.arrowGomory}>✂</span>}
                                    {!isGomoryStep && i === step.pivotRow && <span className={styles.arrowRight}>→</span>}
                                </td>
                                {row.map((val, j) => (
                                    <td key={j} className={`${styles.dataCell} ${cellClass(i, j)}`}>
                                        <span className={styles.cellInner}>{fmt(val)}</span>
                                    </td>
                                ))}
                                <td className={rhsCellClass(i)}>
                                    <span className={styles.cellInner}>{fmt(step.rhs[i])}</span>
                                </td>
                            </tr>
                        );
                    })}

                    {/* Рядок оцінок */}
                    <tr className={styles.objRowTr}>
                        <td className={styles.basisCell}>c̄ⱼ</td>
                        {step.objectiveRow.map((val, j) => (
                            <td key={j} className={[
                                styles.dataCell,
                                styles.objCell,
                                !isGomoryStep && j === step.pivotCol ? styles.objCellActive : "",
                            ].filter(Boolean).join(" ")}>
                                <span className={styles.cellInner}>{fmt(val)}</span>
                            </td>
                        ))}
                        <td className={`${styles.dataCell} ${styles.objValueCell}`}>
                            <span className={styles.cellInner}>z = {fmt(step.objectiveValue)}</span>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Головний компонент звіту ──────────────────────────────────────────────────
export default function PrintReport({ steps, solution, objectiveValue, status, sense, date }) {
    if (!steps || steps.length === 0) return null;

    // Стабільна база varLabels від першого кроку
    const baseStep    = steps[0];
    const baseCols    = baseStep.tableau[0].length;
    const baseRows    = baseStep.tableau.length;
    const numOrigVars = baseCols - baseRows;

    // Будуємо varLabels для максимальної ширини таблиці (остання таблиця може бути ширша)
    const maxCols = Math.max(...steps.map(s => s.tableau[0].length));
    const varLabels = Array.from({ length: maxCols }, (_, j) =>
        j < numOrigVars ? `x${j + 1}` : `s${j - numOrigVars + 1}`
    );

    const isInteger = status === "optimal_integer";
    const isOptimal = status === "optimal" || isInteger;

    const senseLabel = sense === "max" ? "Максимізація" : "Мінімізація";

    return (
        <div className={styles.printRoot}>

            {/* ══ Шапка звіту ══ */}
            <div className={styles.printHeader}>
                <div className={styles.printHeaderTop}>
                    <span className={styles.printHeaderTag}>Звіт · Методи лінійного програмування</span>
                    <span className={styles.printDate}>{date}</span>
                </div>
                <h1 className={styles.printTitle}>Звіт про розв'язання задачі</h1>
                <p className={styles.printSubtitle}>
                    {isInteger
                        ? "Двоїстий симплекс-метод + Метод відсікань Гоморі"
                        : "Двоїстий симплекс-метод · Жорданове виключення"}
                </p>
            </div>

            {/* ══ Зведена інформація ══ */}
            <div className={styles.printSummary}>
                <div className={styles.printSummaryGrid}>
                    <div className={styles.printSummaryItem}>
                        <span className={styles.printSummaryLabel}>Тип задачі</span>
                        <span className={styles.printSummaryValue}>{senseLabel}</span>
                    </div>
                    <div className={styles.printSummaryItem}>
                        <span className={styles.printSummaryLabel}>Кількість кроків</span>
                        <span className={styles.printSummaryValue}>{steps.length}</span>
                    </div>
                    <div className={styles.printSummaryItem}>
                        <span className={styles.printSummaryLabel}>Статус</span>
                        <span className={`${styles.printSummaryValue} ${
                            isOptimal ? styles.printSummaryOptimal : styles.printSummaryInfeasible
                        }`}>
              {isInteger ? "Цілочисловий оптимум" : isOptimal ? "Оптимум знайдено" : "Розв'язку не існує"}
            </span>
                    </div>
                    {isOptimal && objectiveValue !== null && (
                        <div className={styles.printSummaryItem}>
                            <span className={styles.printSummaryLabel}>Оптимальне значення z*</span>
                            <span className={`${styles.printSummaryValue} ${styles.printSummaryZ}`}>
                {fmt(objectiveValue)}
              </span>
                        </div>
                    )}
                </div>

                {/* Оптимальний розв'язок */}
                {isOptimal && solution && (
                    <div className={styles.printSolutionRow}>
                        <span className={styles.printSummaryLabel}>Розв'язок:&nbsp;</span>
                        {solution
                            .map((val, i) => i < numOrigVars && Math.abs(val) > 1e-10
                                    ? <span key={i} className={styles.printSolutionVar}>
                    {varLabels[i]}&nbsp;=&nbsp;<strong>{fmt(val)}</strong>
                  </span>
                                    : null
                            )
                        }
                        {isInteger && (
                            <span className={styles.printIntegerBadge}>∈ ℤ</span>
                        )}
                    </div>
                )}
            </div>

            {/* ══ Кроки ══ */}
            <div className={styles.printSteps}>
                <h2 className={styles.printStepsTitle}>Хід розв'язання</h2>
                {steps.map((step, i) => {
                    // varLabels для конкретного кроку (таблиця може бути ширшою після відсікань)
                    const stepCols = step.tableau[0].length;
                    const stepVarLabels = Array.from({ length: stepCols }, (_, j) =>
                        j < numOrigVars ? `x${j + 1}` : `s${j - numOrigVars + 1}`
                    );
                    return (
                        <StepCard
                            key={i}
                            step={step}
                            stepNumber={i + 1}
                            varLabels={stepVarLabels}
                            baseCols={baseCols}
                        />
                    );
                })}
            </div>

            {/* ══ Підвал ══ */}
            <div className={styles.printFooter}>
                <span>Dual Simplex Method · Gomory Cutting Planes · Jordan–Gauss Elimination</span>
                <span>{date}</span>
            </div>
        </div>
    );
}