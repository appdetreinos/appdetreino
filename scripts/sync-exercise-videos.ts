/**
 * Vídeos de execução (wger → MP4 leve 480p H.264 no nosso bucket).
 *
 * Padrão único animado: todo exercício com vídeo no wger ganha
 * `animation_url` em MP4 (~500KB-2MB) + poster da imagem atual.
 *
 * Uso: npx tsx scripts/sync-exercise-videos.ts
 * Deps: ffmpeg no PATH. Estado em /tmp/exercise-videos-sync.json
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { EN_TERMS, matchBases, wgerGet, slug, sleep, type WgerBase } from "./sync-exercise-media";

const execFileAsync = promisify(execFile);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "exercise-media";
const STATE_FILE = "/tmp/exercise-videos-sync.json";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltam env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface State {
  done: Record<string, string>;
  failed: Record<string, string>;
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

interface WgerVideo {
  id: number;
  video: string;
  codec: string;
  is_main: boolean;
  size: number;
  duration: string;
}

async function wgerVideos(exerciseId: number): Promise<WgerVideo[]> {
  try {
    const d = (await wgerGet(`/video/?exercise=${exerciseId}&limit=20`)) as {
      results: WgerVideo[];
    };
    return d.results ?? [];
  } catch {
    return [];
  }
}

async function transcode(input: string, output: string): Promise<number> {
  await execFileAsync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", input,
    "-t", "15",
    "-vf", "scale=480:-2",
    "-c:v", "libx264",
    "-crf", "28",
    "-preset", "veryfast",
    "-an",
    "-movflags", "+faststart",
    output,
  ]);
  const { statSync } = await import("fs");
  return statSync(output).size;
}

async function main() {
  const state = loadState();
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, animation_url")
    .is("trainer_id", null)
    .order("name");
  if (error || !exercises) {
    console.error("Erro:", error?.message);
    process.exit(1);
  }

  // Só os sem animação nossa
  const pending = (exercises as Array<{ id: string; name: string; animation_url: string | null }>).filter(
    (e) => !(e.animation_url?.includes("/exercise-media/")) && !state.done[e.id],
  );
  console.log(`${pending.length} sem vídeo próprio.`);

  console.log("📚 Catálogo wger...");
  const bases: WgerBase[] = await (async () => {
    const list: WgerBase[] = [];
    let url: string | null = "/exerciseinfo/?language=2&limit=100";
    while (url) {
      const d = (await wgerGet(url)) as {
        results: Array<{ id: number; translations: Array<{ name: string }> }>;
        next: string | null;
      };
      for (const b of d.results) {
        const names = (b.translations ?? []).map((t) => t.name.toLowerCase());
        if (names.length > 0) list.push({ id: b.id, names, image: null });
      }
      url = d.next ? d.next.replace("https://wger.de/api/v2", "") : null;
      await sleep(300);
    }
    return list;
  })();
  console.log(`${bases.length} bases.`);

  let done = 0;
  const missing: string[] = [];

  for (const ex of pending) {
    console.log(`\n— ${ex.name}`);
    const terms = EN_TERMS[ex.name] ?? [ex.name];
    const cands = matchBases(terms, bases);
    let picked: { video: WgerVideo; base: number } | null = null;
    for (const cand of cands.slice(0, 8)) {
      const vids = await wgerVideos(cand.id);
      await sleep(250);
      const withVideo = vids.filter((v) => v.video);
      if (withVideo.length === 0) continue;
      // prefere h264 pequeno, depois qualquer um
      withVideo.sort((a, b) => {
        const score = (v: WgerVideo) =>
          (v.codec === "h264" ? 0 : 1) * 100000000 + (v.size || 999999999);
        return score(a) - score(b);
      });
      picked = { video: withVideo[0], base: cand.id };
      break;
    }
    if (!picked) {
      console.log("  ✗ sem vídeo wger");
      state.failed[ex.id] = "no video";
      missing.push(ex.name);
      continue;
    }

    const tmpIn = join(tmpdir(), `wger-${ex.id}.src`);
    const tmpOut = join(tmpdir(), `wger-${ex.id}.mp4`);
    try {
      const dl = await fetch(picked.video.video, {
        headers: { "User-Agent": "VivaFIT/1.0" },
        signal: AbortSignal.timeout(120000),
      });
      if (!dl.ok) throw new Error(`dl ${dl.status}`);
      writeFileSync(tmpIn, Buffer.from(await dl.arrayBuffer()));
      const size = await transcode(tmpIn, tmpOut);
      console.log(`  transcodificado (${(size / 1024).toFixed(0)}KB) ← base #${picked.base}`);
      const buf = readFileSync(tmpOut);
      const path = `exercises/${slug(ex.name)}.mp4`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buf, { contentType: "video/mp4", upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await supabase.from("exercises").update({ animation_url: pub.publicUrl }).eq("id", ex.id);
      state.done[ex.id] = pub.publicUrl;
      saveState(state);
      console.log("  ✓ vídeo no ar");
      done++;
    } catch (e) {
      console.log(`  ✗ falhou: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
      state.failed[ex.id] = "transcode/upload failed";
      missing.push(ex.name);
    } finally {
      try { unlinkSync(tmpIn); } catch { /* ignore */ }
      try { unlinkSync(tmpOut); } catch { /* ignore */ }
      saveState(state);
    }
    await sleep(800);
  }

  saveState(state);
  console.log(`\n✅ vídeos: ${done} · faltando: ${missing.length}`);
  if (missing.length > 0) console.log("Faltando:", missing.join(" | "));
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
