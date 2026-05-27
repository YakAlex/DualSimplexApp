import { useState } from "react";
import MatrixInput from "./MatrixInput";
import StepVisualizer from "./StepVisualizer";
import { dualSimplex } from "./dualSimplex";
import { solveGomory } from "./gomory";
import styles from "./SimplexApp.module.scss";

export default function DualSimplexApp() {
    const [result, setResult] = useState(null);
    const [error,  setError]  = useState(null);

    function handleSolve({ A, b, c, basis, sense, gomory }) {
        setError(null);
        try {
            const res = gomory
                ? solveGomory(A, b, c, basis, sense)
                : dualSimplex(A, b, c, basis, sense);
            setResult(res);
        } catch (e) {
            setError(e.message);
            setResult(null);
        }
    }

    function handleReset() {
        setResult(null);
        setError(null);
    }

    const isGomory = result?.status === "optimal_integer";

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <span className={styles.headerTag}>алгоритм</span>
                <h1 className={styles.title}>
                    Двоїстий<br />{isGomory ? "Метод Гоморі" : "Симплекс-Метод"}
                </h1>
                <p className={styles.subtitle}>
                    {isGomory
                        ? "Цілочисловий розв'язок · Метод відсікань Гоморі"
                        : "Покрокова візуалізація розв'язання задач лінійного програмування"}
                </p>
            </header>

            <main className={styles.main}>
                {!result ? (
                    <>
                        {error && (
                            <div className={styles.errorBanner}>
                                <span className={styles.errorIcon}>!</span>
                                <span>{error}</span>
                            </div>
                        )}
                        <MatrixInput onSolve={handleSolve} />
                    </>
                ) : (
                    <StepVisualizer result={result} onReset={handleReset} />
                )}
            </main>

            <footer className={styles.footer}>
                <span>Dual Simplex · Gomory Cutting Planes · Jordan–Gauss Elimination</span>
            </footer>
        </div>
    );
}