// AI transcreation (EN → Québec French) via the Anthropic API.
// Raw fetch against /v1/messages — the Copy Desk zero-npm-dependency rule
// rules out the official SDK. Key from tools/copy-desk/.env
// (ANTHROPIC_API_KEY=sk-ant-...) or the process environment.

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-opus-4-8';
const CHUNK_SIZE = 10; // entries per API call

const SYSTEM = `You are the copy transcreator for Fox Meyer, a specialty coffee brand roasted in Dorval, Québec, sold direct-to-consumer in two mix-and-match box formats (4 cans / 8 cans; nitrogen-sealed 150 g cans). The two coffees are "Fox Meyer" (orange fox) and "Petite Grenouille" (green frog).

Your task: given English store copy, write the Québec-market French version. Transcreate — carry the meaning, intent and function of the text, phrased the way a premium Québec brand would naturally say it — rather than translating word for word.

Voice: restrained, precise, quietly warm. Reference points: Aesop, Kinto, Berluti. Never specialty-coffee cliché, never hype. Address the customer as « vous ».

Hard rules:
1. Standard Québec French, impeccable grammar, French typographic conventions (« guillemets », proper spacing before : ; ! ?). French is the store's primary language (Bill 96) — this copy must read as original French, not as a translation.
2. Preserve every placeholder EXACTLY as in the English source: Liquid tokens like {{ product.title }}, JS tokens like {count}, and HTML tags in html-kind strings must all appear unchanged. Translate only the human-readable text around them.
3. Trademark symbol: French copy uses "Fox Meyer ᴹᴰ" — never "®".
4. Never output the phrase "Fox Blend" — it is an internal-only name.
5. Product names "Fox Meyer" and "Petite Grenouille" stay unchanged.
6. Match the register and approximate length of the source. Short UI labels (buttons, badges, nav) stay short.
7. When existing FR store copy is provided as reference, stay consistent with its established terminology (e.g. how the box, cart, and coffees are named).
8. If a current_fr value is provided, treat it as a draft to improve rather than starting from scratch.

Return JSON matching the schema: one fr string per input id — plain text only, no surrounding quotes, no commentary.`;

const SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fr: { type: 'string' },
        },
        required: ['id', 'fr'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
};

export function makeTranslator(env) {
  const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const model = env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const connected = Boolean(apiKey);

  async function callApi(body, attempt = 0) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if ((res.status === 429 || res.status === 529) && attempt < 2) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 5000;
      await new Promise(r => setTimeout(r, wait));
      return callApi(body, attempt + 1);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
    return data;
  }

  // items: [{id, context, kind, en, currentFr}] → [{id, fr}]
  async function requestChunk(items, examples) {
    const parts = [];
    if (examples.length) {
      parts.push('Existing FR copy on this store, as style and terminology reference:');
      parts.push(JSON.stringify(examples, null, 2));
    }
    parts.push('Transcreate the following entries into Québec French. Return exactly one translation per id.');
    parts.push(JSON.stringify(items.map(i => ({
      id: i.id,
      context: i.context,
      kind: i.kind,
      en: i.en,
      ...(i.currentFr ? { current_fr: i.currentFr } : {}),
    })), null, 2));

    const data = await callApi({
      model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    });

    if (data.stop_reason === 'refusal') throw new Error('The model declined this request.');
    if (data.stop_reason === 'max_tokens') throw new Error('Model output truncated (max_tokens) — try fewer entries at once.');
    const text = (data.content || []).find(b => b.type === 'text')?.text;
    if (!text) throw new Error('Empty model response.');
    return JSON.parse(text).translations;
  }

  return {
    connected,
    model,

    // Translate items in chunks; examples = [{en, fr}] pairs already on the store.
    async translate(items, examples = []) {
      const out = [];
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        out.push(...await requestChunk(items.slice(i, i + CHUNK_SIZE), examples));
      }
      return out;
    },
  };
}

// Pick up to `max` already-translated EN/FR pairs as style reference,
// preferring the same group as the entries being translated.
export function styleExamples(entries, group, max = 16) {
  const done = entries.filter(e => e.en.value && (e.fr.stagedValue ?? e.fr.value));
  const pick = [
    ...done.filter(e => e.group === group),
    ...done.filter(e => e.group !== group),
  ].slice(0, max);
  const clip = s => (s.length > 240 ? s.slice(0, 240) + '…' : s);
  return pick.map(e => ({ en: clip(e.en.value), fr: clip(e.fr.stagedValue ?? e.fr.value) }));
}
