/**
 * Seed de GIFs CC0 pra biblioteca de exercícios.
 *
 * Como rodar:
 *   1. `npx tsx scripts/seed-exercise-gifs.ts`
 *   2. Confere no painel se os 30 exercícios têm vídeo_url preenchido.
 *
 * Busca cada GIF via API do Wikimedia Commons:
 *   - Sem auth, sem rate-limit estrito (User-Agent obrigatório).
 *   - Filtra por licença CC0 / Public Domain.
 *   - Pega o GIF de melhor qualidade disponível.
 *
 * Se não achar GIF pra um exercício (comum em máquinas específicas),
 * pula e deixa video_url=NULL. Você pode subir manualmente depois.
 *
 * Idempotente: roda mais de uma vez, atualiza in-place.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltam env vars: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Termo de busca PT-BR + EN (Wikimedia tem mais conteúdo em EN)
const EXERCISES: Array<{ name: string; searchTerms: string[] }> = [
  { name: "Agachamento livre", searchTerms: ["squat", "barbell squat"] },
  { name: "Agachamento goblet", searchTerms: ["goblet squat"] },
  { name: "Leg press 45°", searchTerms: ["leg press"] },
  { name: "Cadeira extensora", searchTerms: ["leg extension"] },
  { name: "Mesa flexora", searchTerms: ["lying leg curl", "hamstring curl"] },
  { name: "Stiff", searchTerms: ["romanian deadlift", "stiff leg deadlift"] },
  { name: "Avanço búlgaro", searchTerms: ["bulgarian split squat", "lunge"] },
  { name: "Panturrilha em pé", searchTerms: ["standing calf raise"] },
  { name: "Supino reto barra", searchTerms: ["barbell bench press", "bench press"] },
  { name: "Supino inclinado halteres", searchTerms: ["incline dumbbell press"] },
  { name: "Crucifixo reto", searchTerms: ["dumbbell fly", "chest fly"] },
  { name: "Flexão de braços", searchTerms: ["push up", "pushup"] },
  { name: "Puxada frontal", searchTerms: ["lat pulldown"] },
  { name: "Remada curvada", searchTerms: ["barbell row", "bent over row"] },
  { name: "Remada unilateral halter", searchTerms: ["dumbbell row", "one arm row"] },
  { name: "Barra fixa", searchTerms: ["pull up", "chin up"] },
  { name: "Desenvolvimento militar", searchTerms: ["overhead press", "military press"] },
  { name: "Elevação lateral", searchTerms: ["lateral raise"] },
  { name: "Face pull", searchTerms: ["face pull", "rope face pull"] },
  { name: "Rosca direta", searchTerms: ["barbell curl", "biceps curl"] },
  { name: "Rosca alternada", searchTerms: ["alternating dumbbell curl"] },
  { name: "Tríceps pulley", searchTerms: ["triceps pushdown", "cable triceps"] },
  { name: "Tríceps testa", searchTerms: ["skull crusher", "lying triceps"] },
  { name: "Prancha frontal", searchTerms: ["plank exercise", "front plank"] },
  { name: "Abdominal supra", searchTerms: ["crunch", "sit up"] },
  { name: "Abdominal roda", searchTerms: ["ab wheel rollout"] },
  { name: "Elevação de pernas", searchTerms: ["leg raise", "hanging leg raise"] },
  { name: "Esteira corrida", searchTerms: ["treadmill running"] },
  { name: "Bike ergométrica", searchTerms: ["stationary bike", "exercise bike"] },
  { name: "Burpee", searchTerms: ["burpee"] },
  // Pack novo (migration 0056)
  { name: "Desenvolvimento com halteres", searchTerms: ["seated dumbbell press", "shoulder press"] },
  { name: "Elevação frontal", searchTerms: ["front raise", "dumbbell front raise"] },
  { name: "Crucifixo invertido", searchTerms: ["reverse fly", "rear delt fly"] },
  { name: "Desenvolvimento Arnold", searchTerms: ["arnold press"] },
  { name: "Remada alta", searchTerms: ["upright row"] },
  { name: "Encolhimento com barra", searchTerms: ["barbell shrug"] },
  { name: "Remada baixa", searchTerms: ["seated cable row"] },
  { name: "Barra fixa supinada", searchTerms: ["chin up"] },
  { name: "Pullover com halter", searchTerms: ["dumbbell pullover"] },
  { name: "Serrote na polia", searchTerms: ["one arm cable row"] },
  { name: "Supino declinado barra", searchTerms: ["decline bench press"] },
  { name: "Crucifixo inclinado", searchTerms: ["incline fly", "incline dumbbell fly"] },
  { name: "Cross over", searchTerms: ["cable crossover"] },
  { name: "Peck deck", searchTerms: ["pec deck", "chest fly machine"] },
  { name: "Agachamento frontal", searchTerms: ["front squat"] },
  { name: "Afundo com halteres", searchTerms: ["dumbbell lunge"] },
  { name: "Leg press horizontal", searchTerms: ["horizontal leg press"] },
  { name: "Levantamento terra", searchTerms: ["deadlift"] },
  { name: "Good morning", searchTerms: ["good morning exercise"] },
  { name: "Stiff unilateral", searchTerms: ["single leg romanian deadlift"] },
  { name: "Hip thrust", searchTerms: ["hip thrust"] },
  { name: "Ponte de glúteo", searchTerms: ["glute bridge"] },
  { name: "Cadeira abdutora", searchTerms: ["hip abduction machine"] },
  { name: "Glúteo na polia", searchTerms: ["cable kickback", "glute kickback"] },
  { name: "Cadeira adutora", searchTerms: ["hip adduction machine"] },
  { name: "Panturrilha sentado", searchTerms: ["seated calf raise"] },
  { name: "Panturrilha no leg press", searchTerms: ["leg press calf raise"] },
  { name: "Rosca martelo", searchTerms: ["hammer curl"] },
  { name: "Rosca concentrada", searchTerms: ["concentration curl"] },
  { name: "Rosca scott", searchTerms: ["preacher curl"] },
  { name: "Tríceps corda", searchTerms: ["rope pushdown"] },
  { name: "Tríceps francês", searchTerms: ["overhead triceps extension"] },
  { name: "Mergulho no banco", searchTerms: ["bench dip", "tricep dip"] },
  { name: "Prancha lateral", searchTerms: ["side plank"] },
  { name: "Crunch bicicleta", searchTerms: ["bicycle crunch"] },
  { name: "Abdominal infra", searchTerms: ["reverse crunch"] },
  { name: "Hiperextensão lombar", searchTerms: ["back extension", "hyperextension"] },
  { name: "Kettlebell swing", searchTerms: ["kettlebell swing"] },
  { name: "Thruster", searchTerms: ["thruster barbell"] },
];

interface WikiFile {
  title: string;
  url: string;
  thumburl?: string;
  mime: string;
  width?: number;
  height?: number;
}

/**
 * Busca arquivos no Wikimedia Commons por termo.
 * Prefere VÍDEO (mp4/webm mostra o movimento) e aceita GIF.
 * Filtra por licença livre (CC0/PD/CC-BY/CC-BY-SA).
 */
async function searchWikimediaMedia(term: string): Promise<{ file: WikiFile; kind: "video" | "gif" } | null> {
  // 1) Tenta vídeo primeiro
  const video = await searchOnce(term, "video");
  if (video) return { file: video, kind: "video" };
  // 2) Cai pro GIF
  const gif = await searchOnce(term, "gif");
  if (gif) return { file: gif, kind: "gif" };
  return null;
}

async function searchOnce(term: string, filetype: "video" | "gif"): Promise<WikiFile | null> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6"); // File namespace
  url.searchParams.set("gsrsearch", `${term} filetype:${filetype}`);
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size|extmetadata");
  url.searchParams.set("iiurlwidth", "480");

  const res = await fetch(url.toString(), {
    headers: {
      // Wikimedia EXIGE User-Agent identificável
      "User-Agent": "VivaFITApp-ExerciseSeed/1.0 (contato@vivafit.com.br)",
    },
  });

  if (!res.ok) {
    console.warn(`  ⚠️  HTTP ${res.status} pra "${term}"`);
    return null;
  }

  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as WikiFile[]) {
    // Aceita gif ou vídeo web (mp4/webm/ogv — ogv vira fallback, player tenta)
    const isGif = page.mime === "image/gif";
    const isVideo =
      page.mime === "video/mp4" ||
      page.mime === "video/webm" ||
      page.mime === "video/ogg";
    if (filetype === "gif" && !isGif) continue;
    if (filetype === "video" && !isVideo) continue;

    // Pula thumb minúscula
    if ((page.width ?? 0) < 120 && (page.height ?? 0) < 120) continue;

    // Filtra licença: CC0 ou Public Domain
    // Wikimedia retorna extmetadata com strings já "achatadas" quando
    // iiprop=extmetadata é chamado via prop=imageinfo (não tem .value).
    const meta = (page as unknown as { extmetadata?: Record<string, string> }).extmetadata;
    if (meta) {
      const licenseShort = (meta.LicenseShortName ?? "").toLowerCase();
      const isFree =
        licenseShort.includes("cc0") ||
        licenseShort.includes("public domain") ||
        licenseShort.includes("pd") ||
        licenseShort.includes("cc-by-sa") ||
        licenseShort.includes("cc-by");
      if (!isFree) continue;
    }

    return page;
  }
  return null;
}

async function main() {
  console.log(`🔍 Buscando GIFs CC0 pra ${EXERCISES.length} exercícios...\n`);

  // Carrega exercícios do banco (só os globais)
  const { data: dbExercises, error: loadErr } = await supabase
    .from("exercises")
    .select("id, name, video_url, animation_url")
    .is("trainer_id", null);

  if (loadErr || !dbExercises) {
    console.error("❌ Erro carregando exercícios:", loadErr?.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const ex of EXERCISES) {
    const dbEx = dbExercises.find((e) => e.name === ex.name);
    if (!dbEx) {
      console.log(`  ⚠️  "${ex.name}" não tá no banco (pulando)`);
      skipped++;
      continue;
    }

    if (dbEx.video_url || (dbEx as { animation_url?: string | null }).animation_url) {
      console.log(`  ✓ "${ex.name}" já tem mídia`);
      skipped++;
      continue;
    }

    let found: { file: WikiFile; kind: "video" | "gif" } | null = null;
    for (const term of ex.searchTerms) {
      found = await searchWikimediaMedia(term);
      if (found) break;
      // Pequeno delay pra não martelar a API
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!found) {
      console.log(`  ✗ "${ex.name}" — mídia não encontrada`);
      notFound++;
      continue;
    }

    // Movimento vai pra animation_url (cascata do player usa primeiro);
    // video_url guarda também quando for vídeo de verdade.
    const isVideo = found.kind === "video";
    const { error: updErr } = await supabase
      .from("exercises")
      .update({
        animation_url: found.file.url,
        ...(isVideo ? { video_url: found.file.url } : {}),
        media_type: isVideo ? "video" : "gif",
      })
      .eq("id", dbEx.id);

    if (updErr) {
      console.log(`  ✗ "${ex.name}" — erro update: ${updErr.message}`);
      continue;
    }

    console.log(`  ✓ "${ex.name}" [${found.kind}] → ${found.file.title}`);
    updated++;

    // Rate limit gentil
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\n✅ Seed concluído:`);
  console.log(`   ${updated} atualizados`);
  console.log(`   ${skipped} já tinham/não estavam no banco`);
  console.log(`   ${notFound} sem GIF encontrado (você pode subir manual depois)`);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
