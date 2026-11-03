import React from 'react';
import { useChessStore } from '../state/useChessStore';
import { LEVELS, LEVEL_DISCLAIMER, getLevel } from '../engine/levels';
import { DEFAULT_THRESHOLDS } from '../coach/classify';
import { GAME_MODE_LABELS, type GameMode } from '../storage/db';

export const SettingsPanel: React.FC = () => {
  const mode = useChessStore((s) => s.mode);
  const opponentLevelId = useChessStore((s) => s.opponentLevelId);
  const analysisDepth = useChessStore((s) => s.analysisDepth);
  const thresholds = useChessStore((s) => s.thresholds);
  const clockEnabled = useChessStore((s) => s.clockEnabled);
  const clockInitialMinutes = useChessStore((s) => s.clockInitialMinutes);
  const clockIncrementSeconds = useChessStore((s) => s.clockIncrementSeconds);
  const boardTheme = useChessStore((s) => s.boardTheme);

  const setMode = useChessStore((s) => s.setMode);
  const setOpponentLevel = useChessStore((s) => s.setOpponentLevel);
  const setAnalysisDepth = useChessStore((s) => s.setAnalysisDepth);
  const setThresholds = useChessStore((s) => s.setThresholds);
  const setClockConfig = useChessStore((s) => s.setClockConfig);
  const applyTimeControlPreset = useChessStore((s) => s.applyTimeControlPreset);
  const setBoardTheme = useChessStore((s) => s.setBoardTheme);

  const currentLevel = getLevel(opponentLevelId);

  const boardThemes: Array<{
    id: 'emerald' | 'wood' | 'midnight' | 'ocean';
    name: string;
    desc: string;
    light: string;
    dark: string;
  }> = [
    { id: 'emerald', name: 'Esmeralda Torneo', desc: 'Verde torneo profesional y marfil suave', light: '#eeeed2', dark: '#4b8352' },
    { id: 'wood', name: 'Madera Clásica', desc: 'Nogal cálido y arce tradicional', light: '#f0d9b5', dark: '#b58863' },
    { id: 'midnight', name: 'Medianoche Cristal', desc: 'Pizarra moderna de alto contraste', light: '#dce4ef', dark: '#4b648a' },
    { id: 'ocean', name: 'Océano Ártico', desc: 'Azul glaciar limpio y relajante', light: '#e8f1f5', dark: '#3f7cac' },
  ];

  return (
    <section className="panel-card settings-panel" aria-label="Configuración del motor y criterios">
      <div className="settings-panel__header">
        <span className="eyebrow">Ajustes Independientes de Juego y Evaluación</span>
        <h3>Configuración del Entrenador y del Motor</h3>
      </div>

      {/* 1. Modalidad de entrenamiento y juego */}
      <div className="report-section">
        <div className="section-title-row">
          <h4>1. Modo de Juego y Entrenamiento</h4>
          <span className="pill pill--accent pill--xs">
            {GAME_MODE_LABELS[mode].title.split('·')[0].trim()}
          </span>
        </div>
        <div className="modes-grid">
          {(Object.keys(GAME_MODE_LABELS) as GameMode[]).map((m) => {
            const isSelected = mode === m;
            return (
              <button
                key={m}
                type="button"
                className={`mode-card ${isSelected ? 'mode-card--active' : ''}`}
                onClick={() => void setMode(m)}
              >
                <div className="mode-card__top">
                  <strong>{GAME_MODE_LABELS[m].title}</strong>
                  {isSelected && <span className="pill pill--accent pill--xs">✓ En uso</span>}
                </div>
                <p className="mode-card__desc">{GAME_MODE_LABELS[m].subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Fuerza del rival */}
      <div className="report-section">
        <h4>2. Rival y Bot Personalizado (cómo juega contra ti)</h4>
        <div className="levels-grid">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className={`level-card ${opponentLevelId === lvl.id ? 'level-card--active' : ''}`}
              onClick={() => setOpponentLevel(lvl.id)}
            >
              <div className="level-card__top">
                <span className="level-bot-avatar" style={{ background: lvl.botColor }}>
                  {lvl.botAvatar}
                </span>
                <div className="level-card__header-info">
                  <div className="level-card__title-row">
                    <span className="level-card__bot-title">{lvl.botTitle}</span>
                    <strong>{lvl.botName}</strong>
                    <span className="level-card__elo">({lvl.botElo})</span>
                  </div>
                  <span className="level-card__idx">Nivel {lvl.index} · {lvl.name}</span>
                </div>
              </div>
              <p className="level-card__quote">«{lvl.botQuote}»</p>
              <small>
                Skill {lvl.skill}/20 · {lvl.depth ? `Prof. ${lvl.depth}` : 'Sin límite'} · {lvl.movetime} ms
              </small>
            </button>
          ))}
        </div>
        <div className="coach-block coach-block--subtle">
          <strong>Personalidad de «{currentLevel.botName}» ({currentLevel.name}):</strong>
          <p>{currentLevel.description}</p>
          <p className="engine-disclaimer">{LEVEL_DISCLAIMER}</p>
        </div>
      </div>

      {/* 3. Profundidad del análisis del profesor */}
      <div className="report-section">
        <h4>3. Profundidad del análisis del profesor (cómo evalúa tus jugadas)</h4>
        <p className="muted-text">
          Esta opción es <strong>totalmente independiente</strong> de la fuerza del rival: aunque
          juegues contra el nivel Principiante, el entrenador analiza tus movimientos con toda la
          fuerza de Stockfish a la profundidad elegida.
        </p>
        <div className="depth-control-bar">
          <label htmlFor="settings-depth-range">
            Profundidad de evaluación por jugada: <strong>{analysisDepth} plies</strong>
          </label>
          <input
            id="settings-depth-range"
            type="range"
            min={8}
            max={20}
            value={analysisDepth}
            onChange={(e) => setAnalysisDepth(Number(e.target.value))}
          />
        </div>
      </div>

      {/* 4. Criterios configurables de clasificación de jugadas */}
      <div className="report-section">
        <div className="section-title-row">
          <h4>4. Criterios de clasificación de jugadas (umbrales en centipeones efectivos)</h4>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
          >
            Restaurar valores por defecto
          </button>
        </div>
        <div className="thresholds-grid">
          <label className="threshold-field">
            <span>Máx. pérdida «Precisa» (cp)</span>
            <input
              type="number"
              min={5}
              max={60}
              value={thresholds.preciseMaxCp}
              onChange={(e) => setThresholds({ preciseMaxCp: Number(e.target.value) })}
            />
          </label>
          <label className="threshold-field">
            <span>Máx. pérdida «Buena» (cp)</span>
            <input
              type="number"
              min={20}
              max={100}
              value={thresholds.goodMaxCp}
              onChange={(e) => setThresholds({ goodMaxCp: Number(e.target.value) })}
            />
          </label>
          <label className="threshold-field">
            <span>Máx. pérdida «Imprecisión» (cp)</span>
            <input
              type="number"
              min={50}
              max={180}
              value={thresholds.inaccuracyMaxCp}
              onChange={(e) => setThresholds({ inaccuracyMaxCp: Number(e.target.value) })}
            />
          </label>
          <label className="threshold-field">
            <span>Máx. pérdida «Error» (cp; mayor = Error grave)</span>
            <input
              type="number"
              min={120}
              max={450}
              value={thresholds.mistakeMaxCp}
              onChange={(e) => setThresholds({ mistakeMaxCp: Number(e.target.value) })}
            />
          </label>
          <label className="threshold-field">
            <span>Margen de alternativas equivalentes (cp)</span>
            <input
              type="number"
              min={5}
              max={45}
              value={thresholds.equalMoveMarginCp}
              onChange={(e) => setThresholds({ equalMoveMarginCp: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      {/* 5. Reloj y gestión del tiempo */}
      <div className="report-section">
        <h4>5. Reloj de partida y ritmos de juego rápidos</h4>
        <div className="time-presets-bar">
          <span className="presets-label">Ritmos populares:</span>
          <div className="time-presets-grid">
            <button
              type="button"
              className={`btn ${clockEnabled && clockInitialMinutes === 1 && clockIncrementSeconds === 1 ? 'btn--primary' : 'btn--ghost'} btn--xs`}
              onClick={() => applyTimeControlPreset('bullet_1_1')}
            >
              ⚡ 1 | 1 Bullet
            </button>
            <button
              type="button"
              className={`btn ${clockEnabled && clockInitialMinutes === 3 && clockIncrementSeconds === 0 ? 'btn--primary' : 'btn--ghost'} btn--xs`}
              onClick={() => applyTimeControlPreset('blitz_3_0')}
            >
              ⚡ 3 | 0 Blitz
            </button>
            <button
              type="button"
              className={`btn ${clockEnabled && clockInitialMinutes === 5 && clockIncrementSeconds === 0 ? 'btn--primary' : 'btn--ghost'} btn--xs`}
              onClick={() => applyTimeControlPreset('blitz_5_0')}
            >
              ⚡ 5 | 0 Blitz
            </button>
            <button
              type="button"
              className={`btn ${clockEnabled && clockInitialMinutes === 10 && clockIncrementSeconds === 0 ? 'btn--primary' : 'btn--ghost'} btn--xs`}
              onClick={() => applyTimeControlPreset('rapid_10_0')}
            >
              ⏱ 10 | 0 Rápida
            </button>
            <button
              type="button"
              className={`btn ${clockEnabled && clockInitialMinutes === 15 && clockIncrementSeconds === 10 ? 'btn--primary' : 'btn--ghost'} btn--xs`}
              onClick={() => applyTimeControlPreset('rapid_15_10')}
            >
              ⏱ 15 | 10 Rápida
            </button>
            <button
              type="button"
              className={`btn ${!clockEnabled ? 'btn--primary' : 'btn--ghost'} btn--xs`}
              onClick={() => applyTimeControlPreset('none')}
            >
              🕊 Sin reloj
            </button>
          </div>
        </div>

        <div className="clock-settings-row">
          <label className="chk-label">
            <input
              type="checkbox"
              checked={clockEnabled}
              onChange={(e) =>
                setClockConfig(e.target.checked, clockInitialMinutes, clockIncrementSeconds)
              }
            />
            <span>Activar reloj de ajedrez</span>
          </label>
          <label className="threshold-field">
            <span>Minutos iniciales</span>
            <input
              type="number"
              min={1}
              max={60}
              disabled={!clockEnabled}
              value={clockInitialMinutes}
              onChange={(e) =>
                setClockConfig(clockEnabled, Number(e.target.value), clockIncrementSeconds)
              }
            />
          </label>
          <label className="threshold-field">
            <span>Incremento (segundos)</span>
            <input
              type="number"
              min={0}
              max={30}
              disabled={!clockEnabled}
              value={clockIncrementSeconds}
              onChange={(e) =>
                setClockConfig(clockEnabled, clockInitialMinutes, Number(e.target.value))
              }
            />
          </label>
        </div>
      </div>

      {/* 6. Estilo visual del tablero */}
      <div className="report-section">
        <h4>6. Estilo visual del tablero</h4>
        <div className="levels-grid">
          {boardThemes.map((bt) => (
            <button
              key={bt.id}
              type="button"
              className={`level-card ${boardTheme === bt.id ? 'level-card--active' : ''}`}
              onClick={() => setBoardTheme(bt.id)}
            >
              <div className="level-card__top">
                <strong>{bt.name}</strong>
                <span className="board-theme-swatch" aria-hidden="true">
                  <i style={{ backgroundColor: bt.light }} />
                  <i style={{ backgroundColor: bt.dark }} />
                </span>
              </div>
              <small>{bt.desc}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

