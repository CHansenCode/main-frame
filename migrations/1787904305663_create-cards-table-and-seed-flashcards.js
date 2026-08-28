/**
 * First schema migration: a `card_groups` / `cards` pair modeling the
 * flashcard `Card` shape from on-the-go's `data/flashcards.ts` (branch
 * `claude/android-app-chat-dev-6ce6lt`), which today is dummy,
 * client-side-only data — nothing is persisted there yet.
 *
 * `card_groups` splits out `languageOneLabel` / `languageTwoLabel`, which
 * on-the-go currently defines once per module (not per card) — normalizing
 * them here avoids repeating the same two labels on every one of a
 * group's rows. `group` is a reserved word in Postgres, hence `card_groups`
 * / `group_id` rather than `group`.
 *
 * The seed data below is copied verbatim from that branch's `pairs` array
 * (100 English-gloss -> [Swedish, Lithuanian] triples) so on-the-go has
 * real rows to point at instead of its bundled dummy list. This is
 * throwaway/dev seed data, not a real user's data — worth reconsidering
 * before any real user-generated cards exist.
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

const GROUP_NAME = "Swedish ↔ Lithuanian";
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
  pgm.createTable("card_groups", {
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

  pgm.createTable("cards", {
    id: "id",
    group_id: {
      type: "integer",
      notNull: true,
      references: "card_groups",
      onDelete: "CASCADE",
    },
    name: { type: "text", notNull: true },
    language_one: { type: "text", notNull: true },
    language_two: { type: "text", notNull: true },
    times_completed: { type: "integer", notNull: true, default: 0 },
    last_completed: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("cards", "group_id");

  pgm.sql(`
    INSERT INTO card_groups (name, language_one_label, language_two_label)
    VALUES (${escape(GROUP_NAME)}, ${escape(LANGUAGE_ONE_LABEL)}, ${escape(LANGUAGE_TWO_LABEL)});
  `);

  const rows = pairs
    .map(
      ([name, languageOne, languageTwo]) =>
        `((SELECT id FROM card_groups WHERE name = ${escape(GROUP_NAME)}), ${escape(name)}, ${escape(languageOne)}, ${escape(languageTwo)})`,
    )
    .join(",\n       ");

  pgm.sql(`
    INSERT INTO cards (group_id, name, language_one, language_two)
    VALUES ${rows};
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
export const down = (pgm) => {
  pgm.dropTable("cards");
  pgm.dropTable("card_groups");
};
