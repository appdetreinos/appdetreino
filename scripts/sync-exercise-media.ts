/**
 * Sync de mídia dos exercícios → bucket próprio `exercise-media`.
 *
 * Por que: Wikimedia limita hotlink (429) e os GIFs "param de funcionar".
 * Servindo do nosso domínio, acaba. wger.de cobre os buracos com
 * imagens padronizadas (thumbnails 400px).
 *
 * Uso:
 *   1. Rode a migration 0059_EXERCISE_MEDIA_BUCKET.sql no SQL Editor
 *   2. npx tsx scripts/sync-exercise-media.ts [--retry-failed]
 *
 * Estado em /tmp/exercise-media-sync.json (pula o que já está no bucket).
 * Licenças: Wikimedia Commons (livre) + wger.de (CC BY-SA) — crédito
 * no rodapé do picker (components/ui/exercise-picker.tsx).
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "exercise-media";
const STATE_FILE = "/tmp/exercise-media-sync.json";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltam env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const RETRY_FAILED = process.argv.includes("--retry-failed");
const FORCE_WGER = process.argv.includes("--force-wger");

interface State {
  done: Record<string, string>; // exerciseId -> our URL
  failed: Record<string, string>; // exerciseId -> reason
}

function loadState(): State {
  try {
    if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch { /* ignore */ }
  return { done: {}, failed: {} };
}
function saveState(s: State) {
  writeFileSync(STATE_FILE, JSON.stringify(s));
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function extOf(url: string, fallback: string): string {
  const clean = url.split("?")[0].toLowerCase();
  const m = clean.match(/\.(gif|mp4|webm|png|jpg|jpeg)$/);
  return m ? m[1] : fallback;
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "VivaFIT/1.0 (media sync)" },
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

async function uploadToBucket(path: string, buf: Buffer, contentType: string): Promise<string | null> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.log(`    upload falhou: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Termos EN por exercício (mesmos do seed de GIFs + pack novo)
const EN_TERMS: Record<string, string[]> = {
  "Agachamento livre": ["barbell squat", "squat"],
  "Agachamento goblet": ["goblet squat"],
  "Agachamento frontal": ["front squat"],
  "Leg press 45°": ["leg press"],
  "Leg press horizontal": ["leg press"],
  "Cadeira extensora": ["leg extension"],
  "Mesa flexora": ["lying leg curl"],
  "Stiff": ["romanian deadlift"],
  "Stiff unilateral": ["single leg romanian deadlift"],
  "Avanço búlgaro": ["bulgarian split squat", "lunge"],
  "Afundo com halteres": ["dumbbell lunge"],
  "Panturrilha em pé": ["standing calf raise"],
  "Panturrilha sentado": ["seated calf raise"],
  "Panturrilha no leg press": ["leg press calf raise"],
  "Supino reto barra": ["barbell bench press"],
  "Supino inclinado halteres": ["incline dumbbell press"],
  "Supino declinado barra": ["decline bench press"],
  "Crucifixo reto": ["dumbbell fly"],
  "Crucifixo inclinado": ["incline dumbbell fly"],
  "Crucifixo invertido": ["reverse fly", "rear delt fly"],
  "Flexão de braços": ["push up"],
  "Puxada frontal": ["lat pulldown"],
  "Remada curvada": ["bent over row"],
  "Remada unilateral halter": ["dumbbell row"],
  "Remada baixa": ["seated cable row"],
  "Remada alta": ["upright row"],
  "Barra fixa": ["pull up"],
  "Barra fixa supinada": ["chin up"],
  "Pullover com halter": ["dumbbell pullover"],
  "Serrote na polia": ["one arm cable row"],
  "Cross over": ["cable crossover"],
  "Peck deck": ["pec deck"],
  "Desenvolvimento militar": ["overhead press", "military press"],
  "Desenvolvimento com halteres": ["dumbbell shoulder press"],
  "Desenvolvimento Arnold": ["arnold press"],
  "Elevação lateral": ["lateral raise"],
  "Elevação frontal": ["front raise"],
  "Face pull": ["face pull"],
  "Encolhimento com barra": ["barbell shrug"],
  "Rosca direta": ["barbell curl"],
  "Rosca alternada": ["alternating dumbbell curl"],
  "Rosca martelo": ["hammer curl"],
  "Rosca concentrada": ["concentration curl"],
  "Rosca scott": ["preacher curl"],
  "Tríceps pulley": ["triceps pushdown"],
  "Tríceps corda": ["rope pushdown"],
  "Tríceps testa": ["lying triceps extension"],
  "Tríceps francês": ["overhead triceps extension"],
  "Mergulho no banco": ["bench dip"],
  "Prancha frontal": ["plank"],
  "Prancha lateral": ["side plank"],
  "Crunch bicicleta": ["bicycle crunch"],
  "Abdominal supra": ["crunch"],
  "Abdominal infra": ["reverse crunch"],
  "Abdominal roda": ["ab wheel"],
  "Elevação de pernas": ["hanging leg raise"],
  "Hip thrust": ["hip thrust"],
  "Ponte de glúteo": ["glute bridge"],
  "Cadeira abdutora": ["hip abduction"],
  "Cadeira adutora": ["hip adduction"],
  "Glúteo na polia": ["cable kickback"],
  "Hiperextensão lombar": ["back extension"],
  "Kettlebell swing": ["kettlebell swing"],
  "Thruster": ["thruster"],
  "Levantamento terra": ["deadlift"],
  "Good morning": ["good morning"],
  "Esteira corrida": ["treadmill"],
  "Bike ergométrica": ["stationary bike"],
  "Burpee": ["burpee"],
};

interface WgerBase {
  id: number;
  names: string[];
  image: string | null;
}

async function wgerGet(path: string): Promise<unknown> {
  const res = await fetch(`https://wger.de/api/v2${path}`, {
    headers: { "User-Agent": "VivaFIT/1.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`wger ${res.status}`);
  return res.json();
}

async function loadWgerBases(): Promise<WgerBase[]> {
  const bases: WgerBase[] = [];
  let url: string | null = "/exerciseinfo/?language=2&limit=100";
  while (url) {
    const d = (await wgerGet(url)) as {
      results: Array<{
        id: number;
        translations: Array<{ name: string }>;
        images: Array<{ image: string; is_main: boolean }>;
      }>;
      next: string | null;
    };
    for (const b of d.results) {
      const names = (b.translations ?? []).map((t) => t.name.toLowerCase());
      if (names.length === 0) continue;
      const imgs = b.images ?? [];
      const mainImg = imgs.find((i) => i.is_main) ?? imgs[0];
      bases.push({ id: b.id, names, image: mainImg?.image ?? null });
    }
    url = d.next ? d.next.replace("https://wger.de/api/v2", "") : null;
    await sleep(300);
  }
  return bases;
}

function matchBases(terms: string[], bases: WgerBase[]): WgerBase[] {
  const out: WgerBase[] = [];
  const seen = new Set<number>();
  const push = (b: WgerBase | undefined) => {
    if (b && !seen.has(b.id)) {
      seen.add(b.id);
      out.push(b);
    }
  };
  for (const term of terms) {
    const t = term.toLowerCase();
    // 1) nome exato (todas as variantes exatas)
    for (const b of bases) if (b.names.includes(t)) push(b);
    // 2) contém o termo inteiro
    for (const b of bases) if (b.names.some((n) => n.includes(t))) push(b);
  }
  // 3) palavra relevante (4+ letras)
  for (const term of terms) {
    const words = term.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
    for (const w of words) {
      for (const b of bases) {
        if (b.names.some((n) => n.split(/[^a-z]+/).includes(w))) push(b);
      }
    }
  }
  return out;
}

function matchBase(terms: string[], bases: WgerBase[]): WgerBase | null {
  return matchBases(terms, bases)[0] ?? null;
}

async function wgerMainImage(exerciseId: number): Promise<string | null> {
  // /exerciseimage filtra por EXERCISE id (não base) — verificado na API.
  // Prefere thumbnail medium (400px, ~50KB, padrão visual único).
  try {
    const d = (await wgerGet(`/exerciseimage/?exercise=${exerciseId}&limit=20`)) as {
      results: Array<{ image: string; is_main: boolean; thumbnails?: { medium?: string } }>;
    };
    const main = d.results.find((r) => r.is_main) ?? d.results[0];
    return main?.thumbnails?.medium ?? main?.image ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const state = loadState();
  console.log("📦 Carregando exercícios do banco...");
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, animation_url, image_url")
    .is("trainer_id", null)
    .order("name");
  if (error || !exercises) {
    console.error("Erro:", error?.message);
    process.exit(1);
  }
  console.log(`${exercises.length} exercícios.`);

  console.log("📚 Baixando catálogo wger (inglês)...");
  const bases = await loadWgerBases();
  console.log(`${bases.length} bases wger.`);

  let mirrored = 0;
  let wgerFilled = 0;
  let stillMissing: string[] = [];

  for (const ex of exercises as Array<{ id: string; name: string; animation_url: string | null; image_url: string | null }>) {
    // --force-wger: refaz jpgs do nosso bucket em thumbnail medium (gigantes)
    const isOurJpg = (ex.image_url?.includes("/exercise-media/") ?? false) && !ex.animation_url?.includes("/exercise-media/");
    if (FORCE_WGER && isOurJpg) {
      console.log(`\n— ${ex.name} (refresh thumbnail)`);
      const terms = EN_TERMS[ex.name] ?? [ex.name];
      const base = matchBase(terms, bases);
      if (base) {
        const img = await wgerMainImage(base.id);
        await sleep(400);
        if (img) {
          const buf = await download(img);
          if (buf) {
            const url = await uploadToBucket(`exercises/${slug(ex.name)}.jpg`, buf, "image/jpeg");
            if (url) {
              await supabase.from("exercises").update({ image_url: url }).eq("id", ex.id);
              console.log(`  ✓ thumbnail (${(buf.length / 1024).toFixed(0)}KB)`);
              wgerFilled++;
              delete state.failed[ex.id];
              saveState(state);
              await sleep(800);
              continue;
            }
          }
        }
      }
      console.log("  ✗ refresh falhou");
      continue;
    }
    // Já está no nosso bucket? pula (a menos que --retry-failed e falhou antes)
    if (ex.animation_url?.includes("/exercise-media/") || ex.image_url?.includes("/exercise-media/")) {
      if (!RETRY_FAILED || !state.failed[ex.id]) continue;
    }
    if (state.done[ex.id] && !RETRY_FAILED) continue;

    console.log(`\n— ${ex.name}`);
    const s = slug(ex.name);
    let animationDead = false;

    // 1) Espelha animação atual (se viva)
    if (ex.animation_url && !ex.animation_url.includes("/exercise-media/")) {
      const buf = await download(ex.animation_url);
      if (buf) {
        const ext = extOf(ex.animation_url, "gif");
        const url = await uploadToBucket(
          `exercises/${s}.${ext}`,
          buf,
          ext === "gif" ? "image/gif" : ext === "png" ? "image/png" : "video/mp4",
        );
        if (url) {
          await supabase.from("exercises").update({ animation_url: url }).eq("id", ex.id);
          state.done[ex.id] = url;
          saveState(state);
          console.log(`  ✓ espelhado (${(buf.length / 1024).toFixed(0)}KB)`);
          mirrored++;
          await sleep(800);
          continue;
        }
      } else {
        console.log("  … animação atual morta, buscando substituto");
        animationDead = true;
      }
      await sleep(800);
    }

    // 2) wger: imagem padronizada (tenta candidatas em ordem até achar)
    const terms = EN_TERMS[ex.name] ?? [ex.name];
    const candidates = matchBases(terms, bases);
    if (candidates.length === 0) {
      console.log("  ✗ sem base wger");
      state.failed[ex.id] = "no wger base";
      stillMissing.push(ex.name);
      continue;
    }
    let img: string | null = null;
    let usedBase = 0;
    for (const cand of candidates.slice(0, 6)) {
      img = await wgerMainImage(cand.id);
      await sleep(250);
      if (img) {
        usedBase = cand.id;
        break;
      }
    }
    if (!img) {
      console.log(`  ✗ ${candidates.length} bases sem imagem`);
      state.failed[ex.id] = "no wger image";
      stillMissing.push(ex.name);
      continue;
    }
    const buf = await download(img);
    if (!buf) {
      console.log("  ✗ download wger falhou");
      state.failed[ex.id] = "download failed";
      stillMissing.push(ex.name);
      continue;
    }
    const url = await uploadToBucket(`exercises/${s}.jpg`, buf, "image/jpeg");
    if (!url) {
      state.failed[ex.id] = "upload failed";
      stillMissing.push(ex.name);
      continue;
    }
    // Troca: animação morta sai, imagem wger entra (cascata usa image_url)
    const patch: Record<string, string | null> = { image_url: url };
    if (animationDead) {
      patch.animation_url = null;
    }
    await supabase.from("exercises").update(patch).eq("id", ex.id);
    state.done[ex.id] = url;
    saveState(state);
    console.log(`  ✓ wger (${(buf.length / 1024).toFixed(0)}KB) ← base #${usedBase}`);
    wgerFilled++;
    await sleep(800);
  }

  saveState(state);
  console.log(`\n✅ espelhados: ${mirrored} · wger: ${wgerFilled} · faltando: ${stillMissing.length}`);
  if (stillMissing.length > 0) console.log("Faltando:", stillMissing.join(" | "));
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
