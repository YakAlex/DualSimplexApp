import { useState, useEffect } from "react";
import styles from "./SimplexApp.module.scss";

const DEFAULT_VARS        = 2;
const DEFAULT_CONSTRAINTS = 2;

function makeMatrix(rows, cols, fill = 0) {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

export default function MatrixInput({ onSolve }) {
  const [numVars,   setNumVars]   = useState(DEFAULT_VARS);
  const [numCons,   setNumCons]   = useState(DEFAULT_CONSTRAINTS);
  const [sense,     setSense]     = useState("min");
  const [useGomory, setUseGomory] = useState(false);
  const [error,     setError]     = useState(null); // Стан для помилки
  const totalCols = numVars + numCons;

  const [A,     setA]     = useState(() => makeMatrix(DEFAULT_CONSTRAINTS, DEFAULT_VARS + DEFAULT_CONSTRAINTS));
  const [b,     setB]     = useState(() => Array(DEFAULT_CONSTRAINTS).fill(0));
  const [c,     setC]     = useState(() => Array(DEFAULT_VARS + DEFAULT_CONSTRAINTS).fill(0));
  const [basis, setBasis] = useState(() => Array.from({ length: DEFAULT_CONSTRAINTS }, (_, i) => DEFAULT_VARS + i));

  useEffect(() => {
    const cols = numVars + numCons;
    setA(prev => {
      const next = makeMatrix(numCons, cols);
      for (let i = 0; i < Math.min(prev.length, numCons); i++)
        for (let j = 0; j < Math.min(prev[0]?.length ?? 0, cols); j++)
          next[i][j] = prev[i][j];
      return next;
    });
    setB(prev => {
      const next = Array(numCons).fill(0);
      for (let i = 0; i < Math.min(prev.length, numCons); i++) next[i] = prev[i];
      return next;
    });
    setC(prev => {
      const next = Array(cols).fill(0);
      for (let j = 0; j < Math.min(prev.length, cols); j++) next[j] = prev[j];
      return next;
    });
    setBasis(Array.from({ length: numCons }, (_, i) => numVars + i));
  }, [numVars, numCons]);

  function updateA(i, j, val) {
    setA(prev => {
      const next = prev.map(r => [...r]);
      next[i][j] = val === "" ? "" : parseFloat(val) || 0;
      return next;
    });
  }
  function updateB(i, val) {
    setB(prev => { const next = [...prev]; next[i] = val === "" ? "" : parseFloat(val) || 0; return next; });
  }
  function updateC(j, val) {
    setC(prev => { const next = [...prev]; next[j] = val === "" ? "" : parseFloat(val) || 0; return next; });
  }
  function updateBasis(i, val) {
    setBasis(prev => { const next = [...prev]; next[i] = parseInt(val); return next; });
  }

  function handleSubmit() {
    const cleanC = c.map(v => typeof v === "string" ? 0 : v);

    // --- ПЕРЕВІРКА НА ДВОЇСТУ ДОПУСТИМІСТЬ ---
    const isDualFeasible = cleanC.every(val => sense === 'max' ? val <= 1e-5 : val >= -1e-5);
    if (!isDualFeasible) {
      setError(`Неможливо застосувати двоїстий симплекс-метод. Для задачі типу "${sense}" всі коефіцієнти цільової функції мають бути ${sense === 'max' ? '≤ 0' : '≥ 0'}.`);
      return; // Зупиняємо виконання, якщо є помилка
    }
    setError(null); // Очищаємо помилку, якщо все добре
    // -----------------------------------------

    const cleanA = A.map(row => row.map(v => typeof v === "string" ? 0 : v));
    const cleanB = b.map(v => typeof v === "string" ? 0 : v);

    onSolve({ A: cleanA, b: cleanB, c: cleanC, basis, sense, gomory: useGomory });
  }

  function loadDualExample() {
    setNumVars(2); setNumCons(2); setSense("min"); setUseGomory(false); setError(null);
    setTimeout(() => {
      setA([[-1,-1,1,0],[-1,-3,0,1]]);
      setB([-4,-6]);
      setC([2,3,0,0]);
      setBasis([2,3]);
    }, 50);
  }

  function loadGomoryExample() {
    setNumVars(2); setNumCons(2); setSense("max"); setUseGomory(true); setError(null);
    setTimeout(() => {
      setA([[-2,-1,1,0],[-1,-2,0,1]]);
      setB([-7,-7]);
      setC([1,1,0,0]);
      setBasis([2,3]);
    }, 50);
  }

  const varLabels = Array.from({ length: totalCols }, (_, j) =>
      j < numVars ? `x${j+1}` : `s${j - numVars + 1}`
  );

  return (
      <div className={styles.inputPanel}>

        {/* ── 01 Розмірність ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNum}>01</span>
            Розмірність задачі
          </h2>
          <div className={styles.dimRow}>
            <label className={styles.dimLabel}>
              <span>Змінних (x)</span>
              <div className={styles.counter}>
                <button onClick={() => setNumVars(v => Math.max(1, v-1))}>−</button>
                <span>{numVars}</span>
                <button onClick={() => setNumVars(v => Math.min(6, v+1))}>+</button>
              </div>
            </label>
            <label className={styles.dimLabel}>
              <span>Обмежень</span>
              <div className={styles.counter}>
                <button onClick={() => setNumCons(v => Math.max(1, v-1))}>−</button>
                <span>{numCons}</span>
                <button onClick={() => setNumCons(v => Math.min(6, v+1))}>+</button>
              </div>
            </label>
            <label className={styles.dimLabel}>
              <span>Тип</span>
              <div className={styles.senseToggle}>
                <button className={sense === "min" ? styles.senseActive : ""} onClick={() => setSense("min")}>min</button>
                <button className={sense === "max" ? styles.senseActive : ""} onClick={() => setSense("max")}>max</button>
              </div>
            </label>
          </div>

          <label className={`${styles.gomoryCheck} ${useGomory ? styles.gomoryCheckActive : ""}`}>
          <span className={styles.gomoryCheckbox}>
            <input type="checkbox" checked={useGomory} onChange={e => setUseGomory(e.target.checked)} />
            <span className={styles.gomoryCheckmark} />
          </span>
            <span className={styles.gomoryLabelText}>
            Знайти цілочисловий розв'язок
            <span className={styles.gomoryTag}>Метод Гоморі</span>
          </span>
          </label>
        </section>

        {/* ── 02 Цільова функція ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNum}>02</span>
            Цільова функція&nbsp;
            <span className={styles.formulaHint}>
            {sense} z = {varLabels.map((l, j) => `${c[j] ?? 0}·${l}`).join(" + ")}
          </span>
          </h2>
          <div className={styles.objRow}>
            {varLabels.map((label, j) => (
                <div key={j} className={styles.cellWrap}>
                  <span className={styles.varLabel}>{label}</span>
                  <input
                      className={`${styles.matInput} ${j >= numVars ? styles.slackInput : ""}`}
                      type="number" step="any"
                      value={c[j] ?? 0}
                      onChange={e => updateC(j, e.target.value)}
                  />
                </div>
            ))}
          </div>
        </section>

        {/* ── 03 Матриця ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNum}>03</span>
            Матриця обмежень (канонічна форма)
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.matTable}>
              <thead>
              <tr>
                <th className={styles.rowLabel}>Базис</th>
                {varLabels.map((l, j) => <th key={j} className={j >= numVars ? styles.slackHead : ""}>{l}</th>)}
                <th className={styles.rhsHead}>b</th>
              </tr>
              </thead>
              <tbody>
              {Array.from({ length: numCons }, (_, i) => (
                  <tr key={i}>
                    <td className={styles.rowLabel}>
                      <select className={styles.basisSelect} value={basis[i] ?? numVars + i} onChange={e => updateBasis(i, e.target.value)}>
                        {varLabels.map((l, j) => <option key={j} value={j}>{l}</option>)}
                      </select>
                    </td>
                    {varLabels.map((_, j) => (
                        <td key={j}>
                          <input
                              className={`${styles.matInput} ${j >= numVars ? styles.slackInput : ""}`}
                              type="number" step="any"
                              value={A[i]?.[j] ?? 0}
                              onChange={e => updateA(i, j, e.target.value)}
                          />
                        </td>
                    ))}
                    <td>
                      <input
                          className={`${styles.matInput} ${styles.rhsInput}`}
                          type="number" step="any"
                          value={b[i] ?? 0}
                          onChange={e => updateB(i, e.target.value)}
                      />
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
          <p className={styles.hint}>
            Слабкі змінні (s) вже включені в стовпці таблиці. Введіть таблицю у формі, готовій до двоїстого методу
            (двоїсто допустима, але прямо недопустима — деякі b &lt; 0).
          </p>
        </section>

        {/* Блок відображення помилки */}
        {error && (
            <div className={styles.errorAlert}>
              <strong>⚠ Увага:</strong> {error}
            </div>
        )}

        {/* ── Дії ── */}
        <div className={styles.actions}>
          <button className={styles.exampleBtn} onClick={loadDualExample}>
            Приклад (двоїстий)
          </button>
          <button className={`${styles.exampleBtn} ${styles.exampleBtnGomory}`} onClick={loadGomoryExample}>
            ✂ Приклад (Гоморі)
          </button>
          <button className={styles.solveBtn} onClick={handleSubmit}>
            Розрахувати →
          </button>
        </div>
      </div>
  );
}