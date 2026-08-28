/**
 * Learning app schema: `decks` / `decks_cards` / `decks_attempts` /
 * `word_recordings`, per ADR-002 (`adr/ADR-002-learning-app-schema.md`).
 *
 * This reworks an earlier version of this same migration, which modeled
 * a `card_groups` / `cards` pair (no attempts ledger, no recordings, no
 * `language_eng` rename). That version predated ADR-002 and was never
 * pushed, so it's rewritten in place here rather than superseded by a
 * follow-up migration — see ADR-002's Consequences section.
 *
 * `decks`/`decks_cards`/`decks_attempts` share the `decks_` prefix to make
 * the family relationship visible in the table name itself. `word_recordings`
 * deliberately does not take that prefix — it isn't scoped to a deck; see
 * ADR-002's "loosely coupled by word text" section.
 *
 * The seed data below is copied verbatim from on-the-go's `data/flashcards.ts`
 * `pairs` array (100 English-gloss -> [Swedish, Lithuanian] triples), same as
 * the original version of this migration — only the destination column names
 * changed (`name` -> `language_eng`). This is throwaway/dev seed data, not a
 * real user's data — worth reconsidering before any real user-generated cards
 * exist. Only `decks` and `decks_cards` are seeded; `decks_attempts` and
 * `word_recordings` start empty.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

// English gloss -> [Swedish, Lithuanian]. Copied from on-the-go's
// data/flashcards.ts (`pairs`) as of branch claude/android-app-chat-dev-6ce6lt,
// commit 7cae9f4 ("Replace Learning dummy data with 100 Swedish <-> Lithuanian
// pairs").
const pairs = [
  ["hello", "hej", "labas"],
  ["goodbye", "hej då", "viso gero"],
  ["yes", "ja", "taip"],
  ["no", "nej", "ne"],
  ["please", "snälla", "prašau"],
  ["thank you", "tack", "ačiū"],
  ["sorry", "förlåt", "atsiprašau"],
  ["water", "vatten", "vanduo"],
  ["bread", "bröd", "duona"],
  ["milk", "mjölk", "pienas"],
  ["house", "hus", "namas"],
  ["dog", "hund", "šuo"],
  ["cat", "katt", "katė"],
  ["friend", "vän", "draugas"],
  ["family", "familj", "šeima"],
  ["mother", "mor", "mama"],
  ["father", "far", "tėtis"],
  ["sister", "syster", "sesuo"],
  ["brother", "bror", "brolis"],
  ["child", "barn", "vaikas"],
  ["man", "man", "vyras"],
  ["woman", "kvinna", "moteris"],
  ["love", "kärlek", "meilė"],
  ["good", "bra", "geras"],
  ["bad", "dålig", "blogas"],
  ["big", "stor", "didelis"],
  ["small", "liten", "mažas"],
  ["hot", "varm", "karštas"],
  ["cold", "kall", "šaltas"],
  ["day", "dag", "diena"],
  ["night", "natt", "naktis"],
  ["morning", "morgon", "rytas"],
  ["evening", "kväll", "vakaras"],
  ["week", "vecka", "savaitė"],
  ["month", "månad", "mėnuo"],
  ["year", "år", "metai"],
  ["today", "idag", "šiandien"],
  ["tomorrow", "imorgon", "rytoj"],
  ["yesterday", "igår", "vakar"],
  ["one", "ett", "vienas"],
  ["two", "två", "du"],
  ["three", "tre", "trys"],
  ["four", "fyra", "keturi"],
  ["five", "fem", "penki"],
  ["six", "sex", "šeši"],
  ["seven", "sju", "septyni"],
  ["eight", "åtta", "aštuoni"],
  ["nine", "nio", "devyni"],
  ["ten", "tio", "dešimt"],
  ["red", "röd", "raudona"],
  ["blue", "blå", "mėlyna"],
  ["green", "grön", "žalia"],
  ["yellow", "gul", "geltona"],
  ["black", "svart", "juoda"],
  ["white", "vit", "balta"],
  ["sun", "sol", "saulė"],
  ["moon", "måne", "mėnulis"],
  ["star", "stjärna", "žvaigždė"],
  ["sky", "himmel", "dangus"],
  ["sea", "hav", "jūra"],
  ["river", "flod", "upė"],
  ["mountain", "berg", "kalnas"],
  ["forest", "skog", "miškas"],
  ["tree", "träd", "medis"],
  ["flower", "blomma", "gėlė"],
  ["bird", "fågel", "paukštis"],
  ["fish", "fisk", "žuvis"],
  ["horse", "häst", "arklys"],
  ["book", "bok", "knyga"],
  ["table", "bord", "stalas"],
  ["chair", "stol", "kėdė"],
  ["door", "dörr", "durys"],
  ["window", "fönster", "langas"],
  ["street", "gata", "gatvė"],
  ["city", "stad", "miestas"],
  ["country", "land", "šalis"],
  ["food", "mat", "maistas"],
  ["coffee", "kaffe", "kava"],
  ["tea", "te", "arbata"],
  ["wine", "vin", "vynas"],
  ["beer", "öl", "alus"],
  ["apple", "äpple", "obuolys"],
  ["eye", "öga", "akis"],
  ["hand", "hand", "ranka"],
  ["head", "huvud", "galva"],
  ["heart", "hjärta", "širdis"],
  ["to eat", "äta", "valgyti"],
  ["to drink", "dricka", "gerti"],
  ["to sleep", "sova", "miegoti"],
  ["to see", "se", "matyti"],
  ["to speak", "tala", "kalbėti"],
  ["to read", "läsa", "skaityti"],
  ["to write", "skriva", "rašyti"],
  ["to go", "gå", "eiti"],
  ["to come", "komma", "ateiti"],
  ["to work", "arbeta", "dirbti"],
  ["to play", "leka", "žaisti"],
  ["time", "tid", "laikas"],
  ["money", "pengar", "pinigai"],
  ["name", "namn", "vardas"],
];

const DECK_NAME = "Swedish ↔ Lithuanian";
const LANGUAGE_ONE_LABEL = "Swedish";
const LANGUAGE_TWO_LABEL = "Lithuanian";

// pgm.createTable/createIndex/etc. don't run immediately — they queue SQL
// onto pgm's internal step list, all of which only actually executes once
// this whole `up` function returns. pgm.db.query, by contrast, runs right
// away, out of band from that queue. Mixing the two — e.g. awaiting an
// INSERT via pgm.db.query so a later step can use its RETURNING id — runs
// the insert before the queued CREATE TABLE has executed at all. So
// everything below is queued via pgm.sql instead, keeping it in the same
// ordered list as the table/index creation. Since none of this seed data
// is user input, inlining it as escaped literals (rather than passing
// bound params, which pgm.sql doesn't support) carries no injection risk.
const escape = (s) => `'${s.replace(/'/g, "''")}'`;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
export const up = (pgm) => {
  pgm.createTable("decks", {
    id: "id",
    name: { type: "text", notNull: true, unique: true },
    language_one_label: { type: "text", notNull: true },
    language_two_label: { type: "text", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createTable("decks_cards", {
    id: "id",
    deck_id: {
      type: "integer",
      notNull: true,
      references: "decks",
      onDelete: "CASCADE",
    },
    language_eng: { type: "text", notNull: true },
    language_one: { type: "text", notNull: true },
    language_two: { type: "text", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("decks_cards", "deck_id");

  pgm.createTable("decks_attempts", {
    id: { type: "bigserial", primaryKey: true },
    card_id: {
      type: "integer",
      notNull: true,
      references: "decks_cards",
      onDelete: "CASCADE",
    },
    direction: {
      type: "text",
      notNull: true,
      check: "\"direction\" IN ('one_to_two', 'two_to_one')",
    },
    is_correct: { type: "boolean", notNull: true },
    actor: { type: "text" },
    completed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("decks_attempts", "card_id");
  pgm.createIndex("decks_attempts", "completed_at");

  pgm.createTable("word_recordings", {
    id: "id",
    word: { type: "text", notNull: true, unique: true },
    audio_data: { type: "bytea", notNull: true },
    recorded_by: { type: "text" },
    recorded_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.sql(`
    ALTER TABLE word_recordings
    ADD CONSTRAINT word_recordings_word_lowercase_check
    CHECK ("word" = lower("word"));
  `);

  pgm.sql(`
    INSERT INTO decks (name, language_one_label, language_two_label)
    VALUES (${escape(DECK_NAME)}, ${escape(LANGUAGE_ONE_LABEL)}, ${escape(LANGUAGE_TWO_LABEL)});
  `);

  const rows = pairs
    .map(
      ([languageEng, languageOne, languageTwo]) =>
        `((SELECT id FROM decks WHERE name = ${escape(DECK_NAME)}), ${escape(languageEng)}, ${escape(languageOne)}, ${escape(languageTwo)})`,
    )
    .join(",\n       ");

  pgm.sql(`
    INSERT INTO decks_cards (deck_id, language_eng, language_one, language_two)
    VALUES ${rows};
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
export const down = (pgm) => {
  pgm.dropTable("word_recordings");
  pgm.dropTable("decks_attempts");
  pgm.dropTable("decks_cards");
  pgm.dropTable("decks");
};
