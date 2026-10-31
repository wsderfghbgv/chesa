/**
 * Servidor backend opcional (Node HTTP sin dependencias externas) para enriquecer las
 * explicaciones pedagógicas mediante un modelo de lenguaje (OpenAI o Google Gemini).
 *
 * - La clave de API (`OPENAI_API_KEY` o `GEMINI_API_KEY`) NUNCA se expone en el frontend.
 * - El modelo recibe únicamente hechos reales y estructurados: FEN antes/después, jugada
 *   realizada, evaluación y variante principal de Stockfish, y motivos geométricos detectados.
 * - Si el servidor no está activo o no hay clave configurada, el frontend sigue funcionando
 *   con su motor pedagógico determinista basado en Stockfish + análisis posicional.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8787);

const SYSTEM_PROMPT = `Eres un Gran Maestro y entrenador de ajedrez en español.
Recibirás datos estructurados REALES calculados por Stockfish 19 y por el analizador geométrico del tablero.
REGLAS ESTRICTAS:
1. PROHIBIDO inventar jugadas, variantes o evaluaciones que no estén en los datos recibidos.
2. Cita únicamente la mejor jugada y la variante principal proporcionadas por Stockfish en el JSON.
3. Adapta el tono al nivel indicado ("basico", "intermedio" o "avanzado") en 3 a 5 frases claras y didácticas.`;

async function callLlm(payload) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const userContent = JSON.stringify(payload, null, 2);

  if (openaiKey) {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  }

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  }

  return null;
}

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET' && req.url === '/api/health') {
    const hasProvider = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
    res.writeHead(200);
    res.end(
      JSON.stringify({
        ok: true,
        llmConfigured: hasProvider,
        provider: process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : 'local-deterministic',
      }),
    );
    return;
  }

  if (req.method === 'POST' && req.url === '/api/explain') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const text = await callLlm(parsed);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, explanation: text }));
      } catch (e) {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            ok: false,
            explanation: null,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
  console.log(`[Chess Coach AI Server] Escuchando en http://localhost:${PORT}`);
});

