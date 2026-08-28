import { NextRequest } from "next/server";
import { parseBuffer } from "music-metadata";
import { pool } from "@/lib/db";

const MAX_DURATION_SECONDS = 10;

// POST /api/recordings
// Body: { "word": string, "audioBase64": string, "recordedBy"?: string }
//
// (a) lower-cases `word` server-side before doing anything else with it,
// (b) verifies the decoded audio is actually AAC via `music-metadata`
//     (never trusts a client-declared content type),
// (c) rejects audio longer than MAX_DURATION_SECONDS,
// (d) upserts into word_recordings on the `word` unique constraint, so a
//     second recording for an existing word replaces it.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { word?: unknown }).word !== "string" ||
    typeof (body as { audioBase64?: unknown }).audioBase64 !== "string"
  ) {
    return Response.json(
      { error: "`word` and `audioBase64` are required strings" },
      { status: 400 }
    );
  }

  const { word: rawWord, audioBase64, recordedBy } = body as {
    word: string;
    audioBase64: string;
    recordedBy?: unknown;
  };

  if (recordedBy !== undefined && typeof recordedBy !== "string") {
    return Response.json(
      { error: "`recordedBy` must be a string when provided" },
      { status: 400 }
    );
  }

  // (a) Lower-case server-side — never trust the client already did this.
  const word = rawWord.toLowerCase();

  if (word.length === 0) {
    return Response.json({ error: "`word` must not be empty" }, { status: 400 });
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = Buffer.from(audioBase64, "base64");
  } catch {
    return Response.json({ error: "`audioBase64` is not valid base64" }, { status: 400 });
  }

  if (audioBuffer.length === 0) {
    return Response.json({ error: "`audioBase64` decoded to empty audio" }, { status: 400 });
  }

  // (b) Inspect the actual decoded container/codec — never trust a
  // client-declared content type.
  let format: { codec?: string; duration?: number };
  try {
    const metadata = await parseBuffer(audioBuffer);
    format = metadata.format;
  } catch {
    return Response.json(
      { error: "Could not parse audio: not a recognizable audio file" },
      { status: 400 }
    );
  }

  const codec = format.codec?.toUpperCase() ?? "";
  if (!codec.includes("AAC")) {
    return Response.json(
      { error: `Uploaded audio is not AAC (detected codec: ${format.codec ?? "unknown"})` },
      { status: 400 }
    );
  }

  // (c) Reject recordings longer than the ceiling.
  if (typeof format.duration !== "number" || Number.isNaN(format.duration)) {
    return Response.json(
      { error: "Could not determine audio duration" },
      { status: 400 }
    );
  }
  if (format.duration > MAX_DURATION_SECONDS) {
    return Response.json(
      {
        error: `Audio duration ${format.duration.toFixed(2)}s exceeds the ${MAX_DURATION_SECONDS}s limit`,
      },
      { status: 400 }
    );
  }

  // (d) Upsert on the `word` unique constraint — replace, never fail/duplicate.
  const result = await pool.query<{ word: string; recorded_at: Date }>(
    `INSERT INTO word_recordings (word, audio_data, recorded_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (word) DO UPDATE
       SET audio_data = EXCLUDED.audio_data,
           recorded_by = EXCLUDED.recorded_by,
           recorded_at = now()
     RETURNING word, recorded_at`,
    [word, audioBuffer, recordedBy ?? null]
  );

  const row = result.rows[0];

  return Response.json({
    word: row.word,
    recordedAt: row.recorded_at.toISOString(),
  });
}
