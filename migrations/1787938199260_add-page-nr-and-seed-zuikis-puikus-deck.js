/**
 * Adds the real "Zuikis Puikus" book vocabulary as its own deck.
 *
 * Backstory (see main-frame adr/ADR-000-living-document.md for the full
 * account): the very first migration seeded a generic 100-word
 * Swedish/Lithuanian placeholder list under the assumption that was
 * "the zuikus puikus data" the user meant. It wasn't -- a completely
 * separate, orphaned branch (on-the-go, branch zuikus-puikus) already
 * held a real, page-by-page vocabulary extraction from the actual
 * Lithuanian children's book "Zuikis Puikus" (which is also where the
 * phrase comes from at all: "zuikis" = hare, "puikus" = fine/nice --
 * the title character's name, and both words genuinely appear in this
 * word list). This migration adds that real data as a second deck
 * rather than discarding the placeholder one, which is already live on
 * staging.
 *
 * Two schema changes this data requires, both applied here rather than
 * amending the original (already-applied) migration:
 * - decks_cards.language_eng becomes nullable -- this book's source
 *   data is Lithuanian/Swedish only, no English gloss column.
 * - decks_cards.page_nr (nullable integer) -- which page of the book
 *   each word came from, preserved from the source CSV since it was
 *   real, deliberate research (see that branch's commit history), not
 *   something to drop on the way in.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

// Lithuanian -> [Swedish, page number]. Copied verbatim from
// on-the-go's zuikus-puikus.csv (orphan branch zuikus-puikus, commits
// 4219847/51891eb/e2673d7 -- a real, page-by-page transcription of the
// book, not dummy data).
const pairs = [
  ["šimtas", "hundra", 1],
  ["zuikių", "harar", 1],
  ["susirinko", "samlades", 1],
  ["net", "till och med", 1],
  ["žalia", "grön", 1],
  ["girelė", "skogsdunge", 1],
  ["linko", "böjde sig", 1],
  ["pakalbėję", "efter att ha pratat", 1],
  ["pasitarę", "efter att ha rådgjort", 1],
  ["jie", "de", 1],
  ["mokyklą", "skola", 1],
  ["atidarė", "öppnade", 1],
  ["ir", "och", 2],
  ["zuikenė", "harhona", 2],
  ["nuo", "från", 2],
  ["vyžūnų", "Vyžūnai (ort i Litauen)", 2],
  ["leido", "skickade", 2],
  ["mokslan", "till lärdom", 2],
  ["savo", "sin", 2],
  ["sūnų", "son", 2],
  ["zuikė", "harmamma", 2],
  ["triūsė", "arbetade flitigt", 2],
  ["maudė", "badade", 2],
  ["prausė", "tvättade", 2],
  ["ilgaūsį", "den långörade", 2],
  ["ilgaausį", "den långörade", 2],
  ["siuvo", "sydde", 3],
  ["kelnes", "byxor", 3],
  ["liemenę", "väst", 3],
  ["o", "och", 3],
  ["liemenėje", "i västen", 3],
  ["kišenę", "ficka", 3],
  ["kepuraitę", "liten mössa", 3],
  ["jam", "honom", 3],
  ["uždėjo", "satte på", 3],
  ["mokyklon", "till skolan", 3],
  ["palydėjo", "följde", 3],
  ["jis", "han", 4],
  ["kuprinę", "ryggsäck", 4],
  ["ant", "på", 4],
  ["pečių", "axlar", 4],
  ["nurūko", "kilade iväg", 4],
  ["takučiu", "längs stigen", 4],
  ["bėga", "springer", 4],
  ["zuikis", "hare", 4],
  ["žydi", "blommar", 4],
  ["gėlės", "blommor", 4],
  ["čiulba", "kvittrar", 4],
  ["ulba", "drillar", 4],
  ["volungėlės", "sommargyllingar", 4],
  ["argi", "månntro", 4],
  ["oras", "väder", 4],
  ["ne", "inte", 4],
  ["puikus", "härligt", 4],
  ["bėgtum", "man skulle springa", 4],
  ["lėktum", "man skulle flyga", 4],
  ["į", "till", 4],
  ["laukus", "fälten", 4],
  ["nevilioki", "fresta inte", 4],
  ["nevalia", "det är inte tillåtet", 4],
  ["nukūrė", "kilade iväg", 4],
  ["pievele", "över ängen", 4],
  ["pabėgėjęs", "efter att ha sprungit en stund", 4],
  ["atsidūsta", "suckar", 4],
  ["mato", "ser", 4],
  ["didelį", "stor", 4],
  ["kopūstą", "kål", 4],
  ["oi", "åh", 5],
  ["broleli", "lillebror", 5],
  ["ilgaūsi", "långöra", 5],
  ["kaipgi", "hur då", 5],
  ["tu", "du", 5],
  ["nevalgęs", "utan att ha ätit", 5],
  ["busi", "kommer du att vara", 5],
  ["prisivalgęs", "efter att ha ätit sig mätt", 5],
  ["sėdi", "sitter", 5],
  ["gera", "skönt", 5],
  ["būtų", "skulle vara", 5],
  ["pailsėti", "att vila", 5],
  ["lapą", "blad", 5],
  ["nusilaužė", "bröt av", 5],
  ["sugraužė", "gnagde upp", 5],
  ["zuikutis", "liten hare", 5],
  ["mikliai", "smidigt", 5],
  ["dumia", "kilar iväg", 5],
  ["pamiegoti", "att sova en stund", 5],
  ["pakrūmę", "in under busken", 5],
  ["puikis", "den fine", 6],
  ["tol", "så länge", 6],
  ["miegojo", "sov", 6],
  ["kol", "tills", 6],
  ["sargiukas", "lilla vakthunden", 6],
  ["nesulojo", "skällde inte", 6],
  ["strykt", "plötsligt", 6],
  ["akis", "ögon", 6],
  ["pramerkė", "öppnade", 6],
  ["pamatė", "såg", 6],
  ["spruko", "smet", 6],
  ["sargiuko", "lilla vakthunden", 6],
  ["kad", "eftersom", 6],
  ["rūko", "rökte", 6],
  ["tai", "så", 6],
  ["sveikas", "hej", 7],
  ["zuiki", "hare", 7],
  ["kur", "vart", 7],
  ["bėgioji", "springer du", 7],
  ["gal", "kanske", 7],
  ["pašoksim", "ska vi dansa", 7],
  ["klumpakojį", "klumpakojis (dans)", 7],
  ["neturiu", "jag har inte", 7],
  ["aš", "jag", 7],
  ["laiko", "tid", 7],
  ["sese", "syster", 7],
  ["nes", "för att", 7],
  ["einu", "jag går", 7],
  ["pirmą", "första", 7],
  ["klasę", "klass", 7],
  ["valandėlę", "en liten stund", 7],
  ["patrepsėsi", "du får trampa lite", 7],
  ["suspėsi", "du hinner", 7],
  ["lape", "räv", 7],
  ["snape", "rävnos", 7],
  ["neviliok", "fresta inte", 7],
  ["ar", "om", 7],
  ["moki", "kan du", 7],
  ["šokį", "dans", 7],
  ["pasikvietę", "efter att ha bjudit in", 8],
  ["senį", "gubben", 8],
  ["eži", "igelkotten", 8],
  ["griežt", "att spela", 8],
  ["armonika", "dragspel", 8],
  ["paprašė", "bad", 8],
  ["juodas", "svart", 8],
  ["varnas", "kråka", 8],
  ["dūdą", "trumpet", 8],
  ["pūtė", "blåste", 8],
  ["smuiką", "fiol", 8],
  ["čirpino", "fick att gnissla", 8],
  ["lakštutė", "näktergal", 8],
  ["pilkas", "grå", 8],
  ["vilkas", "varg", 8],
  ["būgną", "trumma", 8],
  ["mušė", "slog", 8],
  ["giružė", "lilla skogen", 8],
  ["ošė", "susade", 8],
  ["ūžė", "dånade", 8],
  ["šoko", "dansade", 9],
  ["ūsą", "mustasch", 9],
  ["raitė", "tvinnade", 9],
  ["trypė", "trampade", 9],
  ["laputaitė", "lilla räven", 9],
  ["op", "hopp", 9],
  ["saulė", "solen", 9],
  ["vakarop", "mot kvällen", 9],
  ["iš", "från", 9],
  ["lankos", "ängen", 9],
  ["neišmokęs", "utan att ha lärt sig", 9],
  ["pamokos", "läxan", 9],
  ["kitą", "nästa", 10],
  ["rytą", "morgon", 10],
  ["pirmasis", "först", 10],
  ["jau", "redan", 10],
  ["sukiojosi", "snurrade runt", 10],
  ["prie", "vid", 10],
  ["klasės", "klassrummet", 10],
  ["pamokas", "lektionerna", 11],
  ["išmokę", "efter att ha lärt sig", 11],
  ["puikiai", "utmärkt", 11],
  ["klasėj", "i klassen", 11],
  ["zuikiai", "harar", 11],
  ["klasėje", "i klassrummet", 11],
  ["po", "två och två", 11],
  ["du", "två", 11],
  ["rašo", "skriver", 11],
  ["be", "utan", 11],
  ["klaidų", "fel", 11],
  ["susigūžęs", "hopkrupen", 12],
  ["nekvies", "kommer inte att kalla på", 12],
  ["atsakinėti", "att bli utfrågad", 12],
  ["kamputy", "i lilla hörnet", 12],
  ["susiriečia", "kryper ihop", 12],
  ["mokytojas", "läraren", 12],
  ["jį", "honom", 12],
  ["pakviečia", "kallar fram", 12],
  ["paskaityki", "läs lite", 13],
  ["ilgaausi", "långöra", 13],
  ["apie", "om", 13],
  ["žvirblį", "sparven", 13],
  ["kaliausę", "fågelskrämman", 13],
  ["iškaito", "rodnade", 14],
  ["knygelės", "lilla boken", 14],
  ["nepaskaito", "kan inte läsa upp", 14],
  ["visą", "hela", 14],
  ["dieną", "dagen", 14],
  ["vakar", "igår", 14],
  ["skaityti", "att läsa", 14],
  ["neišmoko", "lärde sig inte", 14],
  ["puiki", "fina", 14],
  ["skeltanosi", "kluvennos", 14],
  ["pasimokyk", "plugga lite", 14],
  ["žinosi", "då vet du", 14],
  ["raito", "vrider", 15],
  ["suka", "vrider", 15],
  ["zuikiui", "till haren", 15],
  ["puikiui", "till den fine", 15],
  ["dvejetuką", "en tvåa", 15],
  ["žiūri", "tittar", 15],
  ["dienyną", "klassboken", 15],
  ["galvelę", "lilla huvudet", 15],
  ["panarina", "sänker", 15],
  ["sėda", "sätter sig", 15],
  ["vietą", "platsen", 15],
  ["ašarėlė", "liten tår", 15],
  ["ūsais", "längs morrhåren", 15],
  ["rieda", "rullar", 15],
  ["daug", "många", 16],
  ["zuikučių", "små harar", 16],
  ["mažų", "små", 16],
  ["juokias", "skrattar", 16],
  ["negražu", "fult", 16],
  ["bus", "kommer att vara", 16],
  ["kitoks", "annorlunda", 16],
  ["nesimokęs", "utan att plugga", 16],
  ["nešoks", "kommer inte att dansa", 16],
  ["tėtis", "pappa", 17],
  ["patenkintas", "nöjd", 17],
  ["zuikio", "harens", 17],
  ["puikio", "den fines", 17],
  ["penketais", "med femmor", 17],
  ["lankiausi", "jag besökte", 17],
  ["mačiau", "jag såg", 17],
  ["ten", "där", 17],
  ["mokosi", "pluggar", 18],
  ["gerai", "bra", 18],
  ["pasakyk", "berätta", 18],
  ["kaip", "hur", 18],
  ["darai", "gör du", 18],
];

const DECK_NAME = "Žuikis Puikus";
const LANGUAGE_ONE_LABEL = "Lithuanian";
const LANGUAGE_TWO_LABEL = "Swedish";

// Same gotcha as the original migration: pgm.createTable/addColumn/etc.
// only queue SQL to run once this whole up function returns, so the
// seed INSERTs below go through pgm.sql (queued, same ordered list) to
// run after the ALTER TABLE and deck INSERT, not pgm.db.query (which
// would run immediately, before either of those exist/apply).
const escape = (s) => `'${s.replace(/'/g, "''")}'`;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
export const up = (pgm) => {
  pgm.alterColumn("decks_cards", "language_eng", { notNull: false });
  pgm.addColumn("decks_cards", {
    page_nr: { type: "integer" },
  });

  pgm.sql(`
    INSERT INTO decks (name, language_one_label, language_two_label)
    VALUES (${escape(DECK_NAME)}, ${escape(LANGUAGE_ONE_LABEL)}, ${escape(LANGUAGE_TWO_LABEL)});
  `);

  const rows = pairs
    .map(
      ([languageOne, languageTwo, pageNr]) =>
        `((SELECT id FROM decks WHERE name = ${escape(DECK_NAME)}), ${escape(languageOne)}, ${escape(languageTwo)}, ${pageNr})`
    )
    .join(",\n       ");

  pgm.sql(`
    INSERT INTO decks_cards (deck_id, language_one, language_two, page_nr)
    VALUES ${rows};
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM decks_cards WHERE deck_id = (SELECT id FROM decks WHERE name = ${escape(DECK_NAME)});`);
  pgm.sql(`DELETE FROM decks WHERE name = ${escape(DECK_NAME)};`);
  pgm.dropColumn("decks_cards", "page_nr");
  pgm.alterColumn("decks_cards", "language_eng", { notNull: true });
};
