import { useState, useRef } from "react";
import styles from "./SimplexApp.module.scss";
import PrintReport from "./PrintReport";

function fmt(v) {
  if (typeof v !== "number") return "—";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(4).replace(/\.?0+$/, "");
}

const STATUS_LABEL = {
  iterating:       { text: "Обчислення...",               cls: "statusIterating"  },
  optimal:         { text: "✓ Оптимум знайдено",          cls: "statusOptimal"    },
  optimal_integer: { text: "✓ Цілочисловий оптимум",      cls: "statusOptimal"    },
  infeasible:      { text: "✗ Розв'язку не існує",        cls: "statusInfeasible" },
  gomory_cut:      { text: "✂ Відсікання Гоморі",         cls: "statusGomory"     },
};

export default function StepVisualizer({ result, onReset }) {
  const [idx, setIdx]             = useState(0);
  const [exporting, setExporting] = useState(false);

  // Створюємо ref для контейнера звіту
  const reportRef = useRef(null);

  const { steps, status, solution, objectiveValue, sense } = result;
  const step = steps[idx];

  // ── Експорт PDF ────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      // 1. Динамічно імпортуємо html2pdf (code splitting)
      const html2pdf = (await import("html2pdf.js")).default;

      // 2. Беремо готовий елемент з DOM (він вже відрендерений React-ом, але прихований)
      const element = reportRef.current;

      // 3. Формуємо дату для назви файлу
      const dateSlug = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");

      // 4. Налаштування html2pdf
      const options = {
        margin:       [10, 10, 10, 10],          // Відступи (мм)
        filename:     `Simplex_Report_${dateSlug}.pdf`,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  {
          scale:       2,                        // 2× для чіткості
          useCORS:     true,
          logging:     false,
          letterRendering: true,
          scrollY:     0,                        // Запобігає багам при прокрутці сторінки
        },
        jsPDF: {
          unit:        "mm",
          format:      "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode:        ["avoid-all", "css"],     // Поважає page-break-inside: avoid у стилях
          before:      ".printPageBreakBefore",
        },
      };

      // 5. Даємо браузеру мікропаузу на випадок перемальовок
      await new Promise(resolve => setTimeout(resolve, 500));

      // 6. Генеруємо та завантажуємо PDF
      await html2pdf().set(options).from(element).save();

    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Помилка при генерації PDF. Перевірте консоль.");
    } finally {
      setExporting(false);
    }
  }

  const baseStep    = steps[0];
  const baseCols    = baseStep.tableau[0].length;
  const baseRows    = baseStep.tableau.length;
  const numOrigVars = baseCols - baseRows;

  function getVarLabels(numCols) {
    return Array.from({ length: numCols }, (_, j) =>
        j < numOrigVars ? `x${j + 1}` : `s${j - numOrigVars + 1}`
    );
  }

  const totalCols = step.tableau[0].length;
  const varLabels = getVarLabels(totalCols);

  // ── Підсвічування клітинок ────────────────────────────────────────────────
  function cellClass(i, j) {
    if (step.status === "gomory_cut" && i === step.gomoryRowIndex) {
      return styles.cellGomoryRow;
    }
    const isPivotRow = i === step.pivotRow;
    const isPivotCol = j === step.pivotCol;
    if (isPivotRow && isPivotCol) return styles.cellPivot;
    if (isPivotRow)               return styles.cellPivotRow;
    if (isPivotCol)               return styles.cellPivotCol;
    return "";
  }

  function rowClass(i) {
    if (step.status === "gomory_cut" && i === step.gomoryRowIndex) return styles.gomoryRowTr;
    if (i === step.pivotRow) return styles.pivotRowTr;
    return "";
  }

  function rhsCellClass(i) {
    const isGomoryRow  = step.status === "gomory_cut" && i === step.gomoryRowIndex;
    const isPivotRow   = i === step.pivotRow && step.status !== "gomory_cut";
    const isNegative   = step.rhs[i] < -1e-10;
    return [
      styles.dataCell,
      styles.rhsCell,
      isGomoryRow  ? styles.cellGomoryRow  : "",
      isPivotRow   ? styles.cellPivotRow   : "",
      isNegative   ? styles.negativeRhs    : "",
    ].filter(Boolean).join(" ");
  }

  const statusInfo = STATUS_LABEL[step.status] ?? STATUS_LABEL.iterating;
  const isGomoryStep = step.status === "gomory_cut";

  return (
      <div className={styles.visualizer}>

        {/* ── Шапка ── */}
        <div className={styles.vizHeader}>
          <button className={styles.resetBtn} onClick={onReset}>← Нова задача</button>

          <div className={`${styles.statusBadge} ${styles[statusInfo.cls]}`}>
            {statusInfo.text}
          </div>

          <div className={styles.vizHeaderRight}>
            <div className={styles.stepCounter}>
              Крок&nbsp;<strong>{idx + 1}</strong>&nbsp;/&nbsp;{steps.length}
            </div>
            <button
                className={`${styles.exportBtn} ${exporting ? styles.exportBtnLoading : ""}`}
                onClick={handleExport}
                disabled={exporting}
                title="Завантажити повний звіт у PDF"
            >
              {exporting ? (
                  <>
                    <span className={styles.exportSpinner} />
                    Генерація...
                  </>
              ) : (
                  <>
                    <span className={styles.exportIcon}>⬇</span>
                    Звіт PDF
                  </>
              )}
            </button>
          </div>
        </div>

        {/* ── Прогрес-бар з крапками ── */}
        <div className={styles.progressTrack}>
          <div
              className={styles.progressFill}
              style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
          />
          <div className={styles.progressDots}>
            {steps.map((s, i) => (
                <button
                    key={i}
                    className={[
                      styles.progressDot,
                      i === idx ? styles.dotActive : "",
                      s.status === "optimal" || s.status === "optimal_integer" ? styles.dotOptimal    : "",
                      s.status === "infeasible"   ? styles.dotInfeasible : "",
                      s.status === "gomory_cut"   ? styles.dotGomory     : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setIdx(i)}
                    title={`Крок ${i + 1}${s.status === "gomory_cut" ? ` (відсікання #${s.cutIteration})` : ""}`}
                />
            ))}
          </div>
        </div>

        {/* ── Картка пояснення ── */}
        <div className={`${styles.explanationCard} ${isGomoryStep ? styles.explanationCardGomory : ""}`}>
          <div className={`${styles.explanationNum} ${isGomoryStep ? styles.explanationNumGomory : ""}`}>
            {String(idx + 1).padStart(2, "0")}
          </div>
          <div className={styles.explanationText}>
            <p>{step.message}</p>

            {/* Бейджі для кроку Гоморі */}
            {isGomoryStep && (
                <div className={styles.pivotInfo}>
              <span className={`${styles.pivotBadge} ${styles.pivotBadgeGomory}`}>
                ✂ Відсікання #{step.cutIteration}
              </span>
                  <span className={`${styles.pivotBadge} ${styles.pivotBadgeGomory}`}>
                Новий рядок: {step.gomoryRowIndex + 1}
              </span>
                  <span className={`${styles.pivotBadge} ${styles.pivotBadgeGomory}`}>
                Нова змінна: s{step.tableau[0].length - numOrigVars}
              </span>
                </div>
            )}

            {/* Бейджі для звичайного pivot-кроку */}
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
          </div>
        </div>

        {/* ── Симплекс-таблиця ── */}
        <div className={styles.tableWrap}>
          <table className={styles.simplexTable}>
            <thead>
            <tr>
              <th className={styles.cornerCell}>Базис</th>
              {varLabels.map((l, j) => (
                  <th
                      key={j}
                      className={[
                        styles.colHead,
                        !isGomoryStep && j === step.pivotCol ? styles.colHeadActive : "",
                        j >= baseCols ? styles.colHeadNew : "",
                      ].filter(Boolean).join(" ")}
                  >
                    {l}
                    {!isGomoryStep && j === step.pivotCol && (
                        <span className={styles.arrowDown}>↓</span>
                    )}
                    {j >= baseCols && (
                        <span className={styles.newColTag}>new</span>
                    )}
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
                    {/* Стовпець базису */}
                    <td className={[
                      styles.basisCell,
                      isGomoryNewRow ? styles.basisCellGomory : "",
                    ].filter(Boolean).join(" ")}>
                      {varLabels[step.basis[i]] ?? `s${step.basis[i] + 1}`}
                      {!isGomoryStep && i === step.pivotRow && (
                          <span className={styles.arrowRight}>→</span>
                      )}
                      {isGomoryNewRow && (
                          <span className={styles.arrowGomory}>✂</span>
                      )}
                    </td>

                    {/* Коефіцієнти */}
                    {row.map((val, j) => (
                        <td key={j} className={`${styles.dataCell} ${cellClass(i, j)}`}>
                          <span className={styles.cellInner}>{fmt(val)}</span>
                        </td>
                    ))}

                    {/* RHS */}
                    <td className={rhsCellClass(i)}>
                      <span className={styles.cellInner}>{fmt(step.rhs[i])}</span>
                    </td>
                  </tr>
              );
            })}

            {/* Рядок оцінок c̄j */}
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

        {/* ── Легенда ── */}
        <div className={styles.legend}>
          {[
            { cls: styles.ldPivot,  label: "Провідний елемент" },
            { cls: styles.ldRow,    label: "Провідний рядок"   },
            { cls: styles.ldCol,    label: "Провідний стовпець"},
            { cls: styles.ldNeg,    label: "Від'ємні b"        },
            { cls: styles.ldGomory, label: "Відсікання Гоморі" },
          ].map(({ cls, label }) => (
              <div key={label} className={styles.legendItem}>
                <span className={`${styles.legendDot} ${cls}`} />
                {label}
              </div>
          ))}
        </div>

        {/* ── Навігація ── */}
        <div className={styles.navBar}>
          <button
              className={styles.navBtn}
              disabled={idx === 0}
              onClick={() => setIdx(i => i - 1)}
          >
            ← Назад
          </button>

          <div className={styles.navCenter}>
            {(status === "optimal" || status === "optimal_integer") && solution && (
                <div className={`${styles.solutionChip} ${status === "optimal_integer" ? styles.solutionChipInteger : ""}`}>
                  {status === "optimal_integer" && (
                      <span className={styles.integerBadge}>∈ ℤ</span>
                  )}
                  {solution.map((val, i) =>
                      i < numOrigVars && Math.abs(val) > 1e-10
                          ? <span key={i}>{varLabels[i]} = <strong>{fmt(val)}</strong></span>
                          : null
                  )}
                  <span className={styles.objFinal}>z* = <strong>{fmt(objectiveValue)}</strong></span>
                </div>
            )}
          </div>

          <button
              className={`${styles.navBtn} ${styles.navBtnPrimary}`}
              disabled={idx === steps.length - 1}
              onClick={() => setIdx(i => i + 1)}
          >
            Вперед →
          </button>
        </div>

        {/* ── Прихований контейнер для PDF-звіту (рендериться завжди) ── */}
        <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: -9999,
              opacity: 0,
              pointerEvents: "none"
            }}
        >
          <div ref={reportRef} style={{ width: "794px", background: "#f8f7f4", padding: "20px" }}>
            <PrintReport
                steps={steps}
                solution={solution}
                objectiveValue={objectiveValue}
                status={status}
                sense={sense ?? "min"}
                date={new Date().toLocaleDateString("uk-UA", {
                  year: "numeric", month: "long", day: "numeric",
                })}
            />
          </div>
        </div>

      </div>
  );
}