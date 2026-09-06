import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Sumar de subiect generat de AI (API compatibil OpenAI: OpenAI, Groq,
// Google Gemini, OpenRouter etc.). Se activează doar dacă AI_API_KEY e setat;
// altfel site-ul folosește automat varianta de rezervă (text extras + surse).

const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_TIMEOUT = 40_000;

// Cache persistent: articolele revin des, nu re-plătim același sumar.
const TTL = 12 * 60 * 60 * 1000;
const MAX_INTRARI = 500;
const FISIER_CACHE = process.env.VERCEL
  ? '/tmp/sumar-cache.json'
  : path.join(process.cwd(), '.sumar-cache.json');

let memorie = null;

function citesteCache() {
  if (memorie) return memorie;
  try {
    memorie = JSON.parse(fs.readFileSync(FISIER_CACHE, 'utf8'));
  } catch {
    memorie = {};
  }
  return memorie;
}

function scrieCache(cache) {
  try {
    fs.writeFileSync(FISIER_CACHE, JSON.stringify(cache));
  } catch {
    // pe serverless scrierea poate eșua — cache-ul în memorie rămâne
  }
}

export function aiActiv() {
  return Boolean(AI_API_KEY);
}

function cheieCache(subiect) {
  const amprenta = subiect.members
    .map((m) => m.link)
    .sort()
    .join('|');
  const h = crypto.createHash('md5').update(amprenta).digest('hex').slice(0, 12);
  return `${subiect.id}-${h}`;
}

async function apeleazaAI(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);
  try {
    const resp = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.3,
        // sumarele nu au nevoie de raționament: fără „thinking" e de ~3x mai
        // rapid și tokenii nu se consumă pe gânduri
        thinking: { type: 'disabled' },
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'Ești un editor de știri care scrie în limba română standard, stil de agenție de presă: faptologic, neutru, propoziții complete.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// materiale: [{ sursa: 'Digi24', text: '...' }]
export async function genereazaSumar(subiect, materiale) {
  if (!aiActiv()) return { ok: false, motiv: 'AI neconfigurat (lipsește AI_API_KEY)' };
  if (materiale.length === 0) return { ok: false, motiv: 'fără materiale' };

  const cheie = cheieCache(subiect);
  const cache = citesteCache();
  const dinCache = cache[cheie];
  if (dinCache && Date.now() - dinCache.at < TTL) {
    return { ok: true, text: dinCache.text, dinCache: true };
  }

  const continut = materiale
    .map((m, i) => `[Articol ${i + 1} — ${m.sursa}]\n${m.text}`)
    .join('\n\n');

  const prompt = `Mai jos ai mai multe articole de la surse de presă diferite, care descriu același subiect.

Scrie un sumar propriu al subiectului: 2–3 paragrafe scurte, maximum 700 de caractere în total.

Reguli stricte:
- Folosește exclusiv informațiile prezente în articole; nu inventa și nu adăuga nimic.
- Nu menționa sursele, articolele sau faptul că acesta este un sumar.
- Fără opinii, fără titlu, fără liste, fără formatare markdown, fără ghilimele de la început.
- Dacă articolele se contrazic, prezintă versiunea majoritară.

${continut}`;

  const textBrut = await apeleazaAI(prompt);
  if (!textBrut) return { ok: false, motiv: 'AI nu a răspuns corect' };

  const text = textBrut.replace(/\*\*/g, '').replace(/^["„”']+|["„”']+$/g, '').trim();

  cache[cheie] = { text, at: Date.now() };
  const intrari = Object.entries(cache);
  if (intrari.length > MAX_INTRARI) {
    intrari
      .sort((a, b) => a[1].at - b[1].at)
      .slice(0, intrari.length - MAX_INTRARI)
      .forEach(([k]) => delete cache[k]);
  }
  scrieCache(cache);

  return { ok: true, text };
}
