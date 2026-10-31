# Chess Coach AI

Aplicación web interactiva de ajedrez con un **entrenador virtual de nivel Gran Maestro**, respaldado por **Stockfish 19 compilado a WebAssembly (WASM)** mediante el protocolo **UCI** en **Web Workers** dedicados.

## Características principales

1. **Tablero de ajedrez interactivo (`@lichess-org/chessground` + `chess.js`)**:
   - Coordenadas algebraicas (`a–h`, `1–8`), piezas vectoriales CBurnett, arrastrar y soltar o selección por casillas.
   - Resaltado de jugadas legales, última jugada, jaque, jaque mate y tablas.
   - Enroque corto/largo, captura al paso y diálogo interactivo de promoción de peón.
   - Historial algebraico completo en español (`C`, `A`, `T`, `D`, `R`), deshacer jugada, girar orientación, abandonar y ofrecer tablas.
   - Diseño adaptable a móviles, tabletas y escritorio, con tema oscuro y claro.

2. **Doble instancia de Stockfish 19 WASM en Web Workers**:
   - **Worker de juego (`rival`)**: juega contra ti según el nivel orientativo elegido (9 niveles desde *Principiante* hasta *Nivel máximo del motor*).
   - **Worker de análisis (`analista`)**: evalúa tus jugadas con **MultiPV** a la profundidad configurada, de forma totalmente independiente de la fuerza del rival.
   - Detección automática de aislamiento entre orígenes (`SharedArrayBuffer`) para elegir entre la variante multihilo (`stockfish-19-lite.js`) y la de un solo hilo (`stockfish-19-lite-single.js`).

3. **Evaluación rigurosa de cada jugada (8 categorías configurables)**:
   - Categorías: **Excelente (`!!`)**, **Mejor jugada (`★`)**, **Precisa (`✓`)**, **Buena (`○`)**, **Oportunidad perdida (`?!`)**, **Imprecisión (`?!`)**, **Error (`?`)** y **Error grave (`??`)**.
   - Compara la evaluación antes y después de tu movimiento combinando la pérdida en centipeones con la caída en probabilidad de victoria (no penaliza jugadas ganadoras equivalentes ni posiciones con varias alternativas igual de buenas).
   - Muestra los 9 elementos pedagógicos en cada turno, dibuja flechas y casillas vulnerables sobre el tablero y permite explorar variantes paso a paso sin perder el progreso de la partida.

4. **Seis modos de entrenamiento**:
   - **Modo 1 · Partida normal**: juega una partida completa contra el nivel elegido.
   - **Modo 2 · Entrenamiento con explicaciones**: análisis inmediato tras cada jugada con **pausa didáctica automática** cuando cometes un error o dejas pasar una oportunidad.
   - **Modo 3 · Modo desafío**: resuelve posiciones tácticas y estratégicas verificadas.
   - **Modo 4 · Entrenamiento sin ayuda**: sin pistas ni barra de evaluación durante la partida; informe completo al concluir.
   - **Modo 5 · Juega la mejor jugada**: encuentra la continuación óptima en posiciones críticas o extraídas de tus propias partidas.
   - **Modo 6 · Revancha**: vuelve a jugar y compara tu precisión, ACPL y errores frente a la partida anterior.

5. **Informe post-partida, Plan de Entrenamiento Personalizado y Perfil persistente (`IndexedDB`)**:
   - Identificación de apertura (código ECO, nombre y plan estratégico), desglose de jugadas, momentos decisivos, fortalezas y problemas estratégicos.
   - Distinción explícita entre **errores aislados** y **patrones recurrentes** a lo largo de tu historial.
   - Exportación e importación de partidas en formato estándar **PGN** y respaldo completo **JSON**.

---

## Instalación, ejecución, pruebas y compilación

### 1. Instalar dependencias

```bash
npm install
```

> El script `postinstall` (`scripts/copy-stockfish.mjs`) copia automáticamente los binarios WebAssembly de Stockfish 19 a `public/engine/`.

### 2. Ejecutar en modo desarrollo

```bash
npm run dev
```

Abre la URL que muestra Vite en la terminal (por defecto `http://localhost:5173`).

### 3. Ejecutar las pruebas automatizadas y verificación de tipos

```bash
npm run typecheck
npm test
```

### 4. Compilar para producción y previsualizar

```bash
npm run build
npm run preview
```

---

## Configuración opcional de servidor backend con IA (LLM)

La aplicación funciona al 100 % sin ningún servicio externo gracias a su motor pedagógico determinista acoplado a Stockfish 19 y al analizador geométrico del tablero.

Si deseas activar notas complementarias redactadas por un modelo de lenguaje (OpenAI o Google Gemini) sin exponer claves en el navegador:

```bash
# Opción A: OpenAI
OPENAI_API_KEY="tu_clave" npm run server

# Opción B: Google Gemini
GEMINI_API_KEY="tu_clave_gemini" npm run server
```

El servidor escucha en `http://localhost:8787` (proxificado por Vite bajo `/api/explain`) y recibe únicamente los datos reales calculados por Stockfish para cada posición.

