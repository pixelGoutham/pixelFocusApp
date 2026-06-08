import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router = Router();

const MUSIC_DIR = "/home/runner/workspace/music";
const TRACKS_DIR = path.join(MUSIC_DIR, "tracks");
const META_FILE = path.join(MUSIC_DIR, "metadata.json");
const PLAYLISTS_FILE = path.join(MUSIC_DIR, "playlists.json");

fs.mkdirSync(TRACKS_DIR, { recursive: true });

interface TrackMeta {
  id: string;
  filename: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  url: string;
  addedAt: string;
  size: number;
}

interface PlaylistData {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

interface DownloadJob {
  id: string;
  url: string;
  status: "pending" | "downloading" | "done" | "error";
  progress: number;
  title: string;
  error: string;
  trackId: string;
}

const jobs = new Map<string, DownloadJob>();

function readMeta(): TrackMeta[] {
  if (!fs.existsSync(META_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(META_FILE, "utf-8")) as TrackMeta[]; } catch { return []; }
}
function writeMeta(tracks: TrackMeta[]): void {
  fs.writeFileSync(META_FILE, JSON.stringify(tracks, null, 2));
}
function readPlaylists(): PlaylistData[] {
  if (!fs.existsSync(PLAYLISTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PLAYLISTS_FILE, "utf-8")) as PlaylistData[]; } catch { return []; }
}
function writePlaylists(playlists: PlaylistData[]): void {
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
}

// ── Download ──────────────────────────────────────────────────────────────────
router.post("/music/download", (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url?.trim()) { res.status(400).json({ error: "url required" }); return; }

  const jobId = randomUUID();
  const trackId = randomUUID();
  const outputTemplate = path.join(TRACKS_DIR, `${trackId}.%(ext)s`);

  const job: DownloadJob = {
    id: jobId, url: url.trim(), status: "downloading",
    progress: 0, title: "", error: "", trackId,
  };
  jobs.set(jobId, job);

  const ytdlp = spawn("yt-dlp", [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "--write-info-json",
    "--write-thumbnail",
    "--convert-thumbnails", "jpg",
    "--no-playlist",
    "--newline",
    "-o", outputTemplate,
    url.trim(),
  ]);

  let stderrBuf = "";
  const onChunk = (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    const m = text.match(/(\d+(?:\.\d+)?)%/);
    if (m) job.progress = Math.min(99, parseFloat(m[1]));
  };
  ytdlp.stdout.on("data", onChunk);
  ytdlp.stderr.on("data", onChunk);

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      job.status = "error";
      job.error = stderrBuf.slice(-800);
      return;
    }

    const mp3Path = path.join(TRACKS_DIR, `${trackId}.mp3`);
    if (!fs.existsSync(mp3Path)) {
      job.status = "error";
      job.error = "MP3 output not found after conversion";
      return;
    }

    const stat = fs.statSync(mp3Path);
    let title: string = trackId;
    let artist = "";
    let duration = 0;

    const infoPath = path.join(TRACKS_DIR, `${trackId}.info.json`);
    if (fs.existsSync(infoPath)) {
      try {
        const info = JSON.parse(fs.readFileSync(infoPath, "utf-8")) as {
          title?: string; uploader?: string; channel?: string; duration?: number;
        };
        title = info.title ?? title;
        artist = info.uploader ?? info.channel ?? "";
        duration = info.duration ?? 0;
      } catch {}
    }

    job.title = title;
    job.progress = 100;
    job.status = "done";

    const track: TrackMeta = {
      id: trackId,
      filename: `${trackId}.mp3`,
      title,
      artist,
      thumbnail: `/api/music/thumb/${trackId}`,
      duration,
      url: url.trim(),
      addedAt: new Date().toISOString(),
      size: stat.size,
    };

    const tracks = readMeta();
    tracks.push(track);
    writeMeta(tracks);
  });

  res.json({ jobId, trackId });
});

// ── Job status ────────────────────────────────────────────────────────────────
router.get("/music/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

// ── Library ───────────────────────────────────────────────────────────────────
router.get("/music/library", (_req, res) => {
  res.json(readMeta());
});

// ── Stream audio ──────────────────────────────────────────────────────────────
router.get("/music/stream/:id", (req, res) => {
  const track = readMeta().find(t => t.id === req.params.id);
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }
  const filepath = path.join(TRACKS_DIR, track.filename);
  if (!fs.existsSync(filepath)) { res.status(404).json({ error: "File not found" }); return; }

  const stat = fs.statSync(filepath);
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "audio/mpeg",
    });
    fs.createReadStream(filepath, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    fs.createReadStream(filepath).pipe(res);
  }
});

// ── Thumbnail ─────────────────────────────────────────────────────────────────
router.get("/music/thumb/:id", (req, res) => {
  const id = path.basename(req.params.id);
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const fp = path.join(TRACKS_DIR, `${id}${ext}`);
    if (fs.existsSync(fp)) { res.sendFile(fp); return; }
  }
  res.status(404).end();
});

// ── Delete track ──────────────────────────────────────────────────────────────
router.delete("/music/track/:id", (req, res) => {
  const tracks = readMeta();
  const idx = tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }

  const { id } = tracks[idx];
  for (const f of fs.readdirSync(TRACKS_DIR).filter(f => f.startsWith(id))) {
    try { fs.unlinkSync(path.join(TRACKS_DIR, f)); } catch {}
  }
  tracks.splice(idx, 1);
  writeMeta(tracks);

  const pls = readPlaylists();
  for (const pl of pls) pl.trackIds = pl.trackIds.filter(tid => tid !== req.params.id);
  writePlaylists(pls);

  res.json({ ok: true });
});

// ── Playlists ─────────────────────────────────────────────────────────────────
router.get("/music/playlists", (_req, res) => res.json(readPlaylists()));

router.post("/music/playlists", (req, res) => {
  const { name, trackIds = [] } = req.body as { name?: string; trackIds?: string[] };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  const pl: PlaylistData = { id: randomUUID(), name: name.trim(), trackIds, createdAt: new Date().toISOString() };
  const pls = readPlaylists(); pls.push(pl); writePlaylists(pls);
  res.json(pl);
});

router.put("/music/playlists/:id", (req, res) => {
  const pls = readPlaylists();
  const idx = pls.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  const body = req.body as Partial<PlaylistData>;
  if (body.name) pls[idx].name = body.name;
  if (body.trackIds) pls[idx].trackIds = body.trackIds;
  writePlaylists(pls);
  res.json(pls[idx]);
});

router.delete("/music/playlists/:id", (req, res) => {
  const pls = readPlaylists();
  const idx = pls.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  pls.splice(idx, 1); writePlaylists(pls);
  res.json({ ok: true });
});

export default router;
