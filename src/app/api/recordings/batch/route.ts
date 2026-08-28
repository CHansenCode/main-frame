import { NextRequest } from "next/server";
import { pool } from "@/lib/db";

// POST /api/recordings/batch
// Body: { "words": string[] }
//
// Returns { word, recordedAt, audioBase64 } for whichever of the requested
// words actually have a word_recordings row (case-insensitive match).
// Words with no recording are silently omitted, not errored on.
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
    !("words" in body) ||
    !Array.isArray((body as { words: unknown }).words) ||
    !(body as { words: unknown[] }).words.every((w) => typeof w === "string")
  ) {
    return Response.json(
      { error: "`words` must be an array of strings" },
      { status: 400 }
    );
  }

  const words = (body as { words: string[] }).words;

  if (words.length === 0) {
    return Response.json([]);
  }

  const lowered = words.map((w) => w.toLowerCase());

  const result = await pool.query<{
    word: string;
    recorded_at: Date;
    audio_data: Buffer;
  }>(
    `SELECT word, recorded_at, audio_data FROM word_recordings WHERE word = ANY($1::text[])`,
    [lowered]
  );

  const response = result.rows.map((row) => ({
    word: row.word,
    recordedAt: row.recorded_at.toISOString(),
    audioBase64: row.audio_data.toString("base64"),
  }));

  return Response.json(response);
}
