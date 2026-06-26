// ===========================================================================
//  ghosttacoboy — backend del generador (Cloudflare Worker, GRATIS)
//  Esconde la GROQ_API_KEY y llama a Groq (Llama) para inventar un plan.
//  Deploy: pegá este archivo en un Worker de Cloudflare y agregá la variable
//          secreta GROQ_API_KEY. Ver SETUP en el chat.
// ===========================================================================

const SYS = `Eres el generador de planes de "ghosttacoboy" (Edwin): un fotografo nocturno de Ciudad de Panama, melancolico pero con humor seco. Inventas UN plan de cita para ESTA noche, especifico y fresco, en SU voz, para una chica que abrio su pagina.

VOZ: espanol PANAMENO (usa "tu", NUNCA voseo argentino como "vos/sos/tenes"), todo en minusculas, deadpan, corto. Cero signos de exclamacion, cero emojis. Nunca digas que eres una IA. Slang panameno con cuentagotas (cha, ofi, fren). Autoconsciente del personaje "man solitario" pero con un guino; NO caigas en "estoy roto, salvame".

SU MUNDO: drives nocturnos (la cinta costera, la calzada de amador), el casco viejo, via argentina, gasolineras y mcdonald's 24h, azoteas y parqueos altos sobre la bahia, la luna, fotos de letreros de super ("caja cerrada"). Musica: lil peep, xxxtentacion, $uicideboy$, metal, a veces reggaeton viejo.

REGLA DE CONTEXTO (importante): el plan DEBE encajar con la hora, el clima y el dia que te paso. Si llueve, nada de azoteas al aire libre. Si son las 4am, solo lo que aguanta de madrugada (gasolinera, mcdonald's, la calle). Fin de semana puede haber disco o toque. Se concreto y sorprendente, evita lo obvio y los clises.

Si la chica escribio un mood o pedido, respondele a ESO.

SALIDA: responde SOLO con un JSON valido, sin texto extra, exactamente con estas llaves:
{"act":"titulo del plan, 2 a 5 palabras, minusculas","line":"una linea deadpan describiendolo, maximo 18 palabras","sound":"un artista o playlist","place":"un lugar nocturno de panama","open":"que hay abierto a esta hora, una frase corta"}

Ejemplos del tono (no los repitas literal):
{"act":"buscar el mejor pollo de la madrugada","line":"es una investigacion seria. tenemos toda la noche.","sound":"$uicideboy$ ralentizado","place":"las calles que nadie recomienda","open":"a esta hora: gasolinera, mcdonald's 24h y nada mas."}
{"act":"vuelta sin rumbo","line":"el carro, la ciudad, ningun destino. tu eliges cada giro.","sound":"lil peep, bajito","place":"la cinta costera","open":"a esta hora casi todo aguanta."}`;

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('ghosttacoboy api ok', { headers: cors });

    let ctx = {};
    try { ctx = await req.json(); } catch (e) {}

    const user =
      `contexto real ahora: hora ${ctx.hora ?? '?'}:00, dia ${ctx.dia || '?'}, ` +
      `clima ${ctx.clima || '?'}, luna ${ctx.luna || '?'}` +
      (ctx.lluvia ? ', esta lloviendo' : '') +
      (ctx.finde ? ', es fin de semana' : '') +
      '. ' +
      (ctx.mood ? `ella escribio: "${String(ctx.mood).slice(0, 200)}". ` : '') +
      'inventa UN plan que encaje con esto.';

    const body = {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.95,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: user },
      ],
    };

    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.GROQ_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: 'groq', detail: t.slice(0, 200) }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      const j = await r.json();
      const txt = j.choices?.[0]?.message?.content || '{}';
      return new Response(txt, { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'fail' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  },
};
