import { NextRequest } from "next/server";
import { pool } from "@/lib/db";

// GET /api/decks/:deckId/cards?wordCount=N
//
// Returns up to N cards belonging to the deck, each with recording
// *metadata* only (never audio bytes). See adr/ADR-002-learning-app-schema.md
// for the schema/route contract this implements.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const { deckId: deckIdRaw } = await params;
  const deckId = Number(deckIdRaw);

  if (!Number.isInteger(deckId) || deckId <= 0) {
    return Response.json({ error: "Deck not found" }, { status: 404 });
  }

  const deckResult = await pool.query<{ id: number }>(
    `SELECT id FROM decks WHERE id = $1`,
    [deckId]
  );

  if (deckResult.rowCount === 0) {
    return Response.json({ error: "Deck not found" }, { status: 404 });
  }

  const wordCountParam = request.nextUrl.searchParams.get("wordCount");
  let wordCount: number | null = null;
  if (wordCountParam !== null) {
    const parsed = Number(wordCountParam);
    if (Number.isInteger(parsed) && parsed > 0) {
      wordCount = parsed;
    }
  }

  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM decks_cards WHERE deck_id = $1`,
    [deckId]
  );
  const total = Number(totalResult.rows[0]?.count ?? "0");

  const shouldSample = wordCount !== null && wordCount < total;

  type CardRow = {
    id: number;
    languageEng: string | null;
    languageOne: string;
    languageTwo: string;
    languageOneRecordedAt: Date | null;
    languageTwoRecordedAt: Date | null;
  };

  const baseQuery = `
    SELECT
      dc.id AS "id",
      dc.language_eng AS "languageEng",
      dc.language_one AS "languageOne",
      dc.language_two AS "languageTwo",
      wr1.recorded_at AS "languageOneRecordedAt",
      wr2.recorded_at AS "languageTwoRecordedAt"
    FROM decks_cards dc
    LEFT JOIN word_recordings wr1 ON wr1.word = lower(dc.language_one)
    LEFT JOIN word_recordings wr2 ON wr2.word = lower(dc.language_two)
    WHERE dc.deck_id = $1
  `;

  const cardsResult = shouldSample
    ? await pool.query<CardRow>(
        `${baseQuery} ORDER BY random() LIMIT $2`,
        [deckId, wordCount]
      )
    : await pool.query<CardRow>(`${baseQuery} ORDER BY dc.id`, [deckId]);

  const cards = cardsResult.rows.map((row) => ({
    id: row.id,
    languageEng: row.languageEng,
    languageOne: row.languageOne,
    languageTwo: row.languageTwo,
    languageOneRecording: row.languageOneRecordedAt
      ? { recordedAt: row.languageOneRecordedAt.toISOString() }
      : null,
    languageTwoRecording: row.languageTwoRecordedAt
      ? { recordedAt: row.languageTwoRecordedAt.toISOString() }
      : null,
  }));

  return Response.json(cards);
}
