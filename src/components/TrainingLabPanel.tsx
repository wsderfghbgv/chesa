/**
 * Laboratorio de Entrenamiento Avanzado (`🧪 Laboratorio`).
 *
 * Reúne tres módulos especializados:
 *  1) Entrenador de Repertorio de Aperturas con Repetición Espaciada (SM-2 / Leitner).
 *  2) Banco de Errores Personales (ejercicios extraídos automáticamente de tus propias partidas).
 *  3) Laboratorio de Finales Técnicos contra Stockfish (Lucena, Philidor, Oposición, Mates).
 */
import React, { useState } from 'react';
import { useChessStore } from '../state/useChessStore';
import {
  OPENING_REPERTOIRE,
  isOpeningDueForReview,
} from '../coach/openingsTrainer';
import { ENDGAME_DRILLS } from '../coach/endgameDrills';
import { MOTIF_LABELS } from '../coach/explain';

export const TrainingLabPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<'openings' | 'mistakes' | 'endgames'>('openings');
  const [mistakeFilter, setMistakeFilter] = useState<'all' | 'pending' | 'mastered'>('all');

  const openingSrMap = useChessStore((s) => s.openingSrMap);
  const activeOpeningTrainer = useChessStore((s) => s.activeOpeningTrainer);
  const completedEndgames = useChessStore((s) => s.completedEndgames);
  const activeEndgameDrill = useChessStore((s) => s.activeEndgameDrill);
  const personalMistakes = useChessStore((s) => s.personalMistakes);

  const startOpeningDrill = useChessStore((s) => s.startOpeningDrill);
  const startEndgameDrill = useChessStore((s) => s.startEndgameDrill);
  const practicePersonalMistake = useChessStore((s) => s.practicePersonalMistake);
  const setActiveTab = useChessStore((s) => s.setActiveTab);

  const dueOpeningsCount = OPENING_REPERTOIRE.filter((op) =>
    isOpeningDueForReview(openingSrMap[op.id]),
  ).length;

  const pendingMistakesCount = personalMistakes.filter((m) => !m.mastered).length;
  const filteredMistakes = personalMistakes.filter((m) => {
    if (mistakeFilter === 'pending') return !m.mastered;
    if (mistakeFilter === 'mastered') return m.mastered;
    return true;
  });

  return (
    <section className="panel-card lab-panel" aria-label="Laboratorio de aperturas, errores y finales">
      <div className="coach-panel__header">
        <div>
          <span className="eyebrow">Academia Interactiva · Práctica Deliberada</span>
          <h3>Laboratorio de Aperturas, Errores Propios y Finales</h3>
        </div>
        <div className="level-Seg" role="tablist" aria-label="Secciones del laboratorio">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'openings'}
            className={`seg-btn ${subTab === 'openings' ? 'seg-btn--active' : ''}`}
            onClick={() => setSubTab('openings')}
          >
            📚 Aperturas ({dueOpeningsCount} hoy)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'mistakes'}
            className={`seg-btn ${subTab === 'mistakes' ? 'seg-btn--active' : ''}`}
            onClick={() => setSubTab('mistakes')}
          >
            🎯 Mis Errores ({pendingMistakesCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'endgames'}
            className={`seg-btn ${subTab === 'endgames' ? 'seg-btn--active' : ''}`}
            onClick={() => setSubTab('endgames')}
          >
            ♔ Finales ({Object.keys(completedEndgames).length}/{ENDGAME_DRILLS.length})
          </button>
        </div>
      </div>

      {/* 1. ENTRENADOR DE APERTURAS CON REPETICIÓN ESPACIADA */}
      {subTab === 'openings' && (
        <div className="lab-section">
          <div className="academy-promo-banner">
            <div>
              <strong>📖 Nueva Academia Inteligente de Aperturas (37 Aperturas Completas)</strong>
              <p className="muted-text" style={{ margin: '4px 0 0' }}>
                Accede a la biblioteca enciclopédica por las 7 categorías, lecciones interactivas con
                las 7 dimensiones de cada jugada, Profesor con Voz, Entrenador IA con Stockfish,
                Explorador de Variantes, 8 tipos de Retos y Analizador de Fase de Apertura de tus
                partidas.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setActiveTab('openings')}
            >
              📖 Abrir Academia de Aperturas →
            </button>
          </div>

          <p className="muted-text">
            Practica las líneas fundamentales con Blancas y Negras sobre el tablero. El sistema de{' '}
            <strong>Repetición Espaciada (Leitner)</strong> programa automáticamente para repaso hoy
            las variantes nuevas o aquellas en las que hayas cometido alguna imprecisión teórica.
          </p>

          <div className="lab-cards-list">
            {OPENING_REPERTOIRE.map((line) => {
              const sr = openingSrMap[line.id];
              const isDue = isOpeningDueForReview(sr);
              const isActive = activeOpeningTrainer?.line.id === line.id;

              return (
                <div
                  key={line.id}
                  className={`lab-item-card ${isActive ? 'lab-item-card--active' : ''}`}
                >
                  <div className="lab-item-card__top">
                    <div>
                      <span className="pill pill--motif">{line.eco}</span>{' '}
                      <span className="pill pill--phase">
                        {line.playerColor === 'w' ? '♔ Blancas' : '♚ Negras'}
                      </span>{' '}
                      <span className={`pill ${isDue ? 'pill--warn' : 'pill--accent'}`}>
                        {sr
                          ? isDue
                            ? `Repasar hoy · Caja ${sr.box}/5`
                            : `Dominada · Caja ${sr.box}/5 (próx. en ${sr.intervalDays}d)`
                          : 'Nueva · Pendiente hoy'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => void startOpeningDrill(line)}
                    >
                      ▶ Entrenar en tablero
                    </button>
                  </div>

                  <h4>{line.name}</h4>
                  <small className="block-sub">{line.subtitle}</small>

                  <div className="coach-two-col" style={{ marginTop: '0.5rem' }}>
                    <div className="coach-block coach-block--good">
                      <h4>Idea estratégica</h4>
                      <p>{line.strategicGoal}</p>
                    </div>
                    <div className="coach-block coach-block--watch">
                      <h4>Celada / error típico a evitar</h4>
                      <p>{line.typicalTrapWarning}</p>
                    </div>
                  </div>

                  <div className="opening-steps-preview">
                    <strong>Secuencia teórica: </strong>
                    <span>
                      {line.steps
                        .map((s) =>
                          s.ply % 2 === 1
                            ? `${Math.ceil(s.ply / 2)}.${s.sanEs}`
                            : s.sanEs,
                        )
                        .join(' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. BANCO DE ERRORES PERSONALES */}
      {subTab === 'mistakes' && (
        <div className="lab-section">
          <div className="lab-filter-bar">
            <p className="muted-text">
              Cada vez que juegas o analizas una partida, el entrenador guarda aquí tus imprecisiones,
              errores y oportunidades tácticas perdidas para que puedas corregirlos sobre el tablero.
            </p>
            <div className="level-Seg">
              <button
                type="button"
                className={`seg-btn ${mistakeFilter === 'all' ? 'seg-btn--active' : ''}`}
                onClick={() => setMistakeFilter('all')}
              >
                Todos ({personalMistakes.length})
              </button>
              <button
                type="button"
                className={`seg-btn ${mistakeFilter === 'pending' ? 'seg-btn--active' : ''}`}
                onClick={() => setMistakeFilter('pending')}
              >
                Pendientes ({pendingMistakesCount})
              </button>
              <button
                type="button"
                className={`seg-btn ${mistakeFilter === 'mastered' ? 'seg-btn--active' : ''}`}
                onClick={() => setMistakeFilter('mastered')}
              >
                Dominados ({personalMistakes.length - pendingMistakesCount})
              </button>
            </div>
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="coach-empty">
              <p>
                {personalMistakes.length === 0
                  ? 'Aún no tienes errores registrados en tu banco personal. Juega una partida (o importa y analiza una partida desde Perfil) para que el entrenador genere ejercicios automáticamente desde tus propias posiciones.'
                  : '¡Excelente! No hay errores en este filtro.'}
              </p>
            </div>
          ) : (
            <div className="lab-cards-list">
              {filteredMistakes.map((m) => (
                <div key={m.id} className="lab-item-card">
                  <div className="lab-item-card__top">
                    <div>
                      <span
                        className="pill"
                        style={{ backgroundColor: m.categoryColor, color: '#fff' }}
                      >
                        {m.categoryLabel} (-{m.cpLoss} cp)
                      </span>{' '}
                      <span className="pill pill--phase">
                        Jugada {m.moveNumber} ({m.playerColor === 'w' ? 'Blancas' : 'Negras'})
                      </span>{' '}
                      {m.motifs.map((mot) => (
                        <span key={mot} className="pill pill--motif">
                          {MOTIF_LABELS[mot]}
                        </span>
                      ))}{' '}
                      <span className={`pill ${m.mastered ? 'pill--accent' : 'pill--warn'}`}>
                        {m.mastered ? `✓ Dominado (${m.solvedCount}x)` : 'Pendiente de resolver'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => void practicePersonalMistake(m)}
                    >
                      🎯 Corregir en el tablero
                    </button>
                  </div>

                  <h4>
                    Jugaste <code>{m.playedSanEs}</code> · Mejor era <code>{m.bestSanEs}</code>
                  </h4>
                  <p>{m.whatHappened}</p>
                  <small className="block-sub">
                    <strong>Consejo del profesor:</strong> {m.recommendation}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. LABORATORIO DE FINALES TÉCNICOS CONTRA STOCKFISH */}
      {subTab === 'endgames' && (
        <div className="lab-section">
          <p className="muted-text">
            Juega posiciones técnicas clásicas hasta el final contra Stockfish. El entrenador te guía
            con los pasos exactos (Oposición, Regla del Cuadrado, Puente de Lucena, Defensa de Philidor).
          </p>

          <div className="lab-cards-list">
            {ENDGAME_DRILLS.map((drill) => {
              const comp = completedEndgames[drill.id];
              const isActive = activeEndgameDrill?.id === drill.id;
              return (
                <div
                  key={drill.id}
                  className={`lab-item-card ${isActive ? 'lab-item-card--active' : ''}`}
                >
                  <div className="lab-item-card__top">
                    <div>
                      <span className="pill pill--motif">{drill.category}</span>{' '}
                      <span className="pill pill--phase">
                        {drill.playerColor === 'w' ? '♔ Blancas' : '♚ Negras'} · Objetivo:{' '}
                        {drill.targetOutcome === 'win' ? 'Ganar' : 'Tablas'}
                      </span>{' '}
                      {comp ? (
                        <span className="pill pill--accent">
                          ✓ Superado ({comp.movesCount} plies)
                        </span>
                      ) : (
                        <span className="pill pill--neutral">Por completar</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => void startEndgameDrill(drill)}
                    >
                      ⚔ Practicar contra Stockfish
                    </button>
                  </div>

                  <h4>{drill.title}</h4>
                  <p>{drill.objectiveText}</p>

                  <div className="coach-block coach-block--good">
                    <h4>Técnica paso a paso</h4>
                    <ul className="bullet-list">
                      {drill.techniqueSteps.map((st, idx) => (
                        <li key={idx}>{st}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="coach-block coach-block--watch" style={{ marginTop: '0.45rem' }}>
                    <h4>Error típico a evitar</h4>
                    <p>{drill.commonMistakeToAvoid}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

