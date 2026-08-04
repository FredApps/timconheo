import type { Bi, Token } from "../types";
import { ALPHABET } from "./alphabet";
import { bi } from "./helpers";
import { TONES } from "./tones";

export type LexEntry = Omit<Token, "text" | "entry">;

/**
 * One dictionary for the whole corpus.
 *
 * Annotations used to live on the tokens themselves, which meant the same word
 * showed a pronunciation and a dialect note in one reading and nothing in
 * another, depending on which line you happened to tap. Keying on the entry
 * fixes that permanently: `hỏi` says the same thing everywhere.
 *
 * `tests/client/corpus.test.ts` requires every entry in every shipped reading to
 * appear here, so "a word from the text" is a fallback for user imports only --
 * never for material this app ships.
 */

// -- people and kinship -------------------------------------------------------
const PEOPLE: Record<string, LexEntry> = {
  mẹ: { gloss: bi("mother", "mẹ"), pos: "noun" },
  má: {
    gloss: bi("mother", "má"),
    pos: "noun",
    central: bi(
      "Má is the everyday word for mother in Central and Southern speech; mẹ is the northern and written standard.",
      "Má là tiếng thường ngày ở miền Trung và miền Nam; mẹ là chuẩn viết và miền Bắc.",
    ),
  },
  ba: { gloss: bi("father; also the number three", "ba"), pos: "noun" },
  cha: { gloss: bi("father (more formal than ba)", "cha"), pos: "noun" },
  cậu: { gloss: bi("mother's younger brother; uncle", "cậu"), pos: "noun" },
  mợ: { gloss: bi("wife of cậu; aunt by marriage", "mợ"), pos: "noun" },
  cháu: { gloss: bi("grandchild; niece or nephew", "cháu"), pos: "noun" },
  trẻ: { gloss: bi("child; young", "trẻ"), pos: "noun" },
  cô: {
    gloss: bi("young woman; father's sister; polite address for a woman", "cô"),
    pos: "noun",
    detail: bi(
      "Vietnamese addresses people by kinship rather than by 'you'. Calling a stallholder cô is ordinary politeness, not family.",
      "Tiếng Việt xưng hô theo quan hệ họ hàng chứ không dùng 'you'. Gọi người bán hàng là cô chỉ là lịch sự bình thường.",
    ),
  },
  tôi: {
    gloss: bi("I, me (neutral)", "tôi"),
    pos: "pronoun",
    detail: bi(
      "The safe neutral 'I' for a learner. Most other first-person words carry an age or closeness relationship with the listener.",
      "Đại từ 'tôi' trung tính, an toàn cho người mới học. Các từ khác thường mang quan hệ tuổi tác hoặc thân sơ.",
    ),
  },
  ta: {
    gloss: bi("I, we (familiar or poetic)", "ta"),
    pos: "pronoun",
    detail: bi(
      "Older and warmer than tôi. In folk verse it is the speaker talking plainly, sometimes to an animal.",
      "Cũ hơn và thân hơn tôi. Trong ca dao, đó là người nói mộc mạc, đôi khi nói với con vật.",
    ),
  },
  "chúng ta": {
    gloss: bi("we (including you)", "chúng ta"),
    pos: "pronoun",
    detail: bi(
      "Includes the listener. Chúng tôi is the same word for 'we' but leaves the listener out.",
      "Bao gồm người nghe. Chúng tôi cũng là 'we' nhưng không tính người nghe.",
    ),
  },
  nó: { gloss: bi("it; he/she (informal, or of an animal)", "nó"), pos: "pronoun" },
  ai: { gloss: bi("who; anyone", "ai"), pos: "pronoun" },
  bạn: { gloss: bi("friend; you (friendly)", "bạn"), pos: "noun" },
  "ông thợ": {
    gloss: bi("the workman", "ông thợ"),
    pos: "noun",
    detail: bi(
      "Ông is a respectful classifier for an older man; thợ is a skilled worker.",
      "Ông là tiếng gọi kính trọng với đàn ông lớn tuổi; thợ là người làm nghề.",
    ),
  },
  "người bán hàng": { gloss: bi("shopkeeper, seller", "người bán hàng"), pos: "noun" },
  "cô bán hàng": { gloss: bi("the woman selling; the stallholder", "cô bán hàng"), pos: "noun" },
  vua: { gloss: bi("king", "vua"), pos: "noun" },
  "nông gia": {
    gloss: bi("farming household; the farming life", "nông gia"),
    pos: "noun",
    hanViet: { character: "農家", meaning: "farm household", family: ["nông dân", "nông thôn", "gia đình"] },
    detail: bi(
      "A Sino-Vietnamese compound: nông (farming) + gia (house, family). Recognising these two pieces unlocks a great many words.",
      "Từ Hán-Việt: nông (nhà nông) + gia (nhà, gia đình). Nhận ra hai thành tố này mở khóa rất nhiều từ.",
    ),
  },
};

// -- animals and plants -------------------------------------------------------
const NATURE: Record<string, LexEntry> = {
  con: {
    gloss: bi("classifier for animals", "loại từ cho động vật"),
    pos: "classifier",
    classifier: true,
    detail: bi(
      "Con goes before animals, and is also used warmly for children. Vietnamese counts almost nothing without a classifier.",
      "Con đứng trước động vật và cũng dùng thân mật cho trẻ em. Tiếng Việt hầu như không đếm gì mà thiếu loại từ.",
    ),
  },
  cò: { gloss: bi("stork", "con cò"), pos: "noun", pronunciation: "kɔ̀" },
  mèo: { gloss: bi("cat", "con mèo"), pos: "noun" },
  "chú mèo": {
    gloss: bi("the cat (familiar)", "chú mèo"),
    pos: "noun",
    detail: bi(
      "Chú before an animal is affectionate, roughly 'mister'. It is the storytelling register.",
      "Chú đặt trước tên con vật nghe thân mật, đại khái như 'chú, bác'. Đó là giọng kể chuyện.",
    ),
  },
  chuột: { gloss: bi("mouse, rat", "con chuột"), pos: "noun" },
  "chú chuột": { gloss: bi("the mouse (familiar)", "chú chuột"), pos: "noun" },
  gà: { gloss: bi("chicken", "con gà"), pos: "noun" },
  dê: { gloss: bi("goat", "con dê"), pos: "noun" },
  cóc: { gloss: bi("toad", "con cóc"), pos: "noun" },
  trâu: {
    gloss: bi("water buffalo", "con trâu"),
    pos: "noun",
    detail: bi(
      "The working animal of wet-rice farming, and a fixture of folk verse — spoken to as a partner, not owned as livestock.",
      "Con vật làm việc của nghề trồng lúa nước, và là nhân vật quen thuộc trong ca dao — được nói chuyện như bạn làm ăn.",
    ),
  },
  cá: { gloss: bi("fish", "con cá"), pos: "noun" },
  "cây cau": { gloss: bi("areca palm", "cây cau"), pos: "noun" },
  "cành tre": { gloss: bi("bamboo branch", "cành tre"), pos: "noun" },
  "cây lúa": { gloss: bi("rice plant", "cây lúa"), pos: "noun" },
  "ngọn cỏ": { gloss: bi("blade of grass", "ngọn cỏ"), pos: "noun" },
  bông: { gloss: bi("ear of grain; flower", "bông"), pos: "noun" },
  bầu: { gloss: bi("bottle gourd", "quả bầu"), pos: "noun" },
  bí: { gloss: bi("squash, pumpkin", "quả bí"), pos: "noun" },
  giàn: {
    gloss: bi("trellis, climbing frame", "giàn"),
    pos: "noun",
    detail: bi(
      "The frame gourd and squash vines climb together — which is the whole point of the couplet.",
      "Cái khung mà dây bầu và dây bí cùng leo — đó chính là ý của câu ca dao.",
    ),
  },
  rau: { gloss: bi("vegetables, greens", "rau"), pos: "noun" },
  "trái cây": {
    gloss: bi("fruit", "trái cây"),
    pos: "noun",
    central: bi(
      "Trái cây is the Central and Southern word; the North says hoa quả.",
      "Trái cây là từ miền Trung và miền Nam; miền Bắc nói hoa quả.",
    ),
  },
  xoài: { gloss: bi("mango", "xoài"), pos: "noun" },
  "bánh mì": { gloss: bi("bread; a filled bread roll", "bánh mì"), pos: "noun" },
  "cà phê": { gloss: bi("coffee", "cà phê"), pos: "noun" },
  cơm: { gloss: bi("cooked rice; a meal", "cơm"), pos: "noun" },
  mắm: { gloss: bi("fermented fish sauce or paste", "mắm"), pos: "noun" },
  muối: { gloss: bi("salt", "muối"), pos: "noun" },
  rượu: { gloss: bi("rice wine, liquor", "rượu"), pos: "noun" },
  "hồng đào": {
    gloss: bi("Hồng Đào, a Quảng Nam wine", "rượu Hồng Đào"),
    pos: "name",
    central: bi(
      "A Quảng Nam emblem more than a product: the couplet uses it for the region itself.",
      "Là biểu tượng của xứ Quảng hơn là một sản phẩm: câu ca dao dùng nó để nói về vùng đất.",
    ),
  },
};

// -- places and things --------------------------------------------------------
const PLACES: Record<string, LexEntry> = {
  "đà nẵng": {
    gloss: bi("Đà Nẵng, a city in Central Vietnam", "Đà Nẵng"),
    pos: "name",
    central: bi(
      "Locally the name is often heard closer to 'Đà Nẽng': the ă before ng shifts, and hỏi and ngã have merged.",
      "Người địa phương thường nghe gần như 'Đà Nẽng': âm ă trước ng đổi, và hỏi với ngã đã nhập một.",
    ),
  },
  "quảng nam": {
    gloss: bi("Quảng Nam, the province south of Đà Nẵng", "Quảng Nam"),
    pos: "name",
  },
  "hội an": {
    gloss: bi("Hội An, an old trading town in Quảng Nam", "Hội An"),
    pos: "name",
  },
  "sông hàn": { gloss: bi("the Hàn river, through Đà Nẵng", "sông Hàn"), pos: "name" },
  "cầu rồng": {
    gloss: bi("the Dragon Bridge in Đà Nẵng", "cầu Rồng"),
    pos: "name",
    detail: bi("cầu = bridge, rồng = dragon.", "cầu = bridge, rồng = dragon."),
  },
  "dòng sông": { gloss: bi("river (the flowing water itself)", "dòng sông"), pos: "noun" },
  biển: { gloss: bi("sea", "biển"), pos: "noun" },
  "thành phố": {
    gloss: bi("city", "thành phố"),
    pos: "noun",
    hanViet: { character: "城铺", meaning: "walled market town", family: ["thành", "phố"] },
  },
  gió: { gloss: bi("wind", "gió"), pos: "noun" },
  mưa: { gloss: bi("rain; to rain", "mưa"), pos: "noun" },
  đất: { gloss: bi("earth, soil, land", "đất"), pos: "noun" },
  đồng: { gloss: bi("field, open farmland", "đồng"), pos: "noun" },
  ruộng: { gloss: bi("paddy field", "ruộng"), pos: "noun" },
  chợ: { gloss: bi("market", "chợ"), pos: "noun" },
  cửa: { gloss: bi("door, gate", "cửa"), pos: "noun" },
  "nhà trời": { gloss: bi("heaven's house", "nhà trời"), pos: "noun" },
  bếp: { gloss: bi("kitchen, cooking fire", "bếp"), pos: "noun" },
  quê: { gloss: bi("home village, native place", "quê"), pos: "noun" },
  cưa: { gloss: bi("saw", "cái cưa"), pos: "noun" },
  ổ: { gloss: bi("classifier for a loaf or roll", "ổ"), pos: "classifier", classifier: true },
  ly: {
    gloss: bi("glass, cup", "ly"),
    pos: "noun",
    central: bi(
      "Ly is Central and Southern; the North says cốc.",
      "Ly là miền Trung và Nam; miền Bắc nói cốc.",
    ),
  },
  rổ: { gloss: bi("woven basket", "rổ"), pos: "noun" },
  loại: { gloss: bi("kind, type", "loại"), pos: "noun" },
  giá: { gloss: bi("price", "giá"), pos: "noun" },
  nghiệp: {
    gloss: bi("trade, calling, livelihood", "nghiệp"),
    pos: "noun",
    hanViet: { character: "業", meaning: "occupation", family: ["nghề nghiệp", "sự nghiệp", "nông nghiệp"] },
  },
  "quản công": { gloss: bi("to count the labour, to begrudge the effort", "quản công"), pos: "verb" },
  thanh: {
    gloss: bi("tone; sound", "thanh"),
    pos: "noun",
    detail: bi(
      "Thanh điệu is the word for tone as a system. Vietnamese writes six marks; Đà Nẵng speaks five shapes.",
      "Thanh điệu là hệ thống thanh. Chữ viết có sáu dấu; giọng Đà Nẵng nói năm đường nét.",
    ),
  },
  điệu: { gloss: bi("manner, melody, contour", "điệu"), pos: "noun" },
};

// -- verbs --------------------------------------------------------------------
const VERBS: Record<string, LexEntry> = {
  đi: { gloss: bi("to go", "đi"), pos: "verb" },
  "đi bộ": { gloss: bi("to walk", "đi bộ"), pos: "verb" },
  "đi chơi": { gloss: bi("to go out and play", "đi chơi"), pos: "verb" },
  "đi chợ": { gloss: bi("to go to market", "đi chợ"), pos: "verb" },
  "đi học": { gloss: bi("to go to school", "đi học"), pos: "verb" },
  "đi về": { gloss: bi("to head back, to go home", "đi về"), pos: "verb" },
  "đi đâu": { gloss: bi("gone where?", "đi đâu"), pos: "question" },
  về: { gloss: bi("to return", "về"), pos: "verb" },
  "về quê": { gloss: bi("to go back to the home village", "về quê"), pos: "verb" },
  ra: { gloss: bi("to go out", "ra"), pos: "verb" },
  vào: { gloss: bi("to enter, into", "vào"), pos: "verb" },
  đến: { gloss: bi("to arrive at", "đến"), pos: "verb" },
  ngồi: { gloss: bi("to sit", "ngồi"), pos: "verb" },
  xệp: { gloss: bi("to plop down, to flop", "xệp"), pos: "verb" },
  "xuống đây": { gloss: bi("down here", "xuống đây"), pos: "phrase" },
  đậu: { gloss: bi("to perch, to land", "đậu"), pos: "verb" },
  trèo: { gloss: bi("to climb", "trèo"), pos: "verb" },
  ăn: { gloss: bi("to eat", "ăn"), pos: "verb" },
  bú: { gloss: bi("to suckle", "bú"), pos: "verb" },
  mua: { gloss: bi("to buy", "mua"), pos: "verb" },
  "cảm ơn": { gloss: bi("to thank; thank you", "cảm ơn"), pos: "verb" },
  hỏi: {
    gloss: bi("to ask", "hỏi"),
    pos: "verb",
    pronunciation: "hɔj",
    central: bi(
      "The hỏi and ngã marks are two shapes in the north but one in Đà Nẵng. The spelling still distinguishes them.",
      "Dấu hỏi và dấu ngã là hai đường nét ở miền Bắc nhưng chỉ còn một ở Đà Nẵng. Chữ viết vẫn phân biệt.",
    ),
  },
  "hỏi thăm": { gloss: bi("to ask after someone", "hỏi thăm"), pos: "verb" },
  "trả lời": { gloss: bi("to answer", "trả lời"), pos: "verb" },
  nói: { gloss: bi("to say, to speak", "nói"), pos: "verb" },
  "mời bạn": {
    gloss: bi("please, go ahead (offering something)", "mời bạn"),
    pos: "phrase",
    detail: bi(
      "Mời offers rather than requests. It is what a seller says handing something over, and what a host says at a table.",
      "Mời là mời chứ không phải xin. Người bán đưa hàng nói vậy, chủ nhà mời khách ăn cũng vậy.",
    ),
  },
  "mỉm cười": { gloss: bi("to smile", "mỉm cười"), pos: "verb" },
  nhìn: { gloss: bi("to look at", "nhìn"), pos: "verb" },
  biết: { gloss: bi("to know", "biết"), pos: "verb" },
  bảo: { gloss: bi("to tell, to say to", "bảo"), pos: "verb" },
  thương: {
    gloss: bi("to love with care, to feel tenderness for", "thương"),
    pos: "verb",
    detail: bi(
      "Warmer and more protective than yêu (romantic love). Thương is what you feel for family, and for anyone you would look after.",
      "Ấm áp và che chở hơn yêu. Thương là tình cảm với người thân, và với bất cứ ai mình muốn chăm sóc.",
    ),
  },
  lấy: { gloss: bi("to take", "lấy"), pos: "verb" },
  giữ: { gloss: bi("to keep, to hold on to", "giữ"), pos: "verb" },
  cày: { gloss: bi("to plough", "cày"), pos: "verb" },
  cấy: { gloss: bi("to transplant rice seedlings", "cấy"), pos: "verb" },
  kéo: { gloss: bi("to pull", "kéo"), pos: "verb" },
  xẻ: { gloss: bi("to saw lengthwise, to split", "xẻ"), pos: "verb" },
  lừa: { gloss: bi("to work back and forth; to trick", "lừa"), pos: "verb" },
  dắt: { gloss: bi("to lead by the hand", "dắt"), pos: "verb" },
  lạy: { gloss: bi("to bow deeply in greeting", "lạy"), pos: "verb" },
  cho: { gloss: bi("to give; to let", "cho"), pos: "verb" },
  bới: { gloss: bi("to scratch about, to rummage", "bới"), pos: "verb" },
  thổi: { gloss: bi("to blow", "thổi"), pos: "verb" },
  thấm: { gloss: bi("to soak in", "thấm"), pos: "verb" },
  nhấm: { gloss: bi("to sip, to taste", "nhấm"), pos: "verb" },
  say: { gloss: bi("to be drunk; enchanted", "say"), pos: "adjective" },
  cân: { gloss: bi("to weigh", "cân"), pos: "verb" },
  giỗ: {
    gloss: bi("death anniversary meal", "giỗ"),
    pos: "noun",
    detail: bi(
      "The yearly meal honouring someone who has died. Close to the centre of family life, and it has no English word.",
      "Bữa cỗ hằng năm tưởng nhớ người đã mất. Rất gần trung tâm đời sống gia đình, và tiếng Anh không có từ tương đương.",
    ),
  },
  có: { gloss: bi("to have; there is", "có"), pos: "verb" },
  còn: { gloss: bi("still, to remain", "còn"), pos: "verb" },
  "vắng nhà": { gloss: bi("to be away from home", "vắng nhà"), pos: "phrase" },
  "ở nhà": { gloss: bi("to stay at home", "ở nhà"), pos: "phrase" },
  "dung dăng dung dẻ": {
    gloss: bi("swinging along hand in hand", "dung dăng dung dẻ"),
    pos: "phrase",
    detail: bi(
      "Four syllables that only mean anything together: the sound of children walking in a swinging line.",
      "Bốn âm tiết chỉ có nghĩa khi đi cùng nhau: tiếng trẻ con vừa đi vừa đánh tay.",
    ),
  },
};

// -- qualities, grammar and small words --------------------------------------
const FUNCTION_WORDS: Record<string, LexEntry> = {
  bé: { gloss: bi("little, small", "bé"), pos: "adjective" },
  khỏe: { gloss: bi("strong, healthy", "khỏe"), pos: "adjective" },
  thua: { gloss: bi("to lose", "thua"), pos: "verb" },
  nhiều: { gloss: bi("many, much", "nhiều"), pos: "adjective" },
  khác: { gloss: bi("different, other", "khác"), pos: "adjective" },
  giống: { gloss: bi("kind, breed; alike", "giống"), pos: "noun" },
  chung: { gloss: bi("shared, in common", "chung"), pos: "adjective" },
  cùng: { gloss: bi("together, alongside", "cùng"), pos: "adverb" },
  "đường xa": { gloss: bi("a long way off", "đường xa"), pos: "phrase" },
  "đường nào": { gloss: bi("which way?", "đường nào"), pos: "question" },
  tí: { gloss: bi("a tiny bit", "tí"), pos: "adverb" },
  một: { gloss: bi("one", "một"), pos: "numeral" },
  và: { gloss: bi("and (joins things)", "và"), pos: "conjunction" },
  nhưng: { gloss: bi("but", "nhưng"), pos: "conjunction" },
  "tuy rằng": { gloss: bi("although", "tuy rằng"), pos: "conjunction" },
  thì: { gloss: bi("then (marks the consequence)", "thì"), pos: "particle" },
  mà: {
    gloss: bi("that, which; and yet", "mà"),
    pos: "particle",
    detail: bi(
      "One of the busiest small words in the language. In verse it often just keeps the rhythm moving.",
      "Một trong những từ nhỏ bận rộn nhất. Trong thơ, nó thường chỉ giữ nhịp.",
    ),
  },
  không: { gloss: bi("no, not", "không"), pos: "adverb" },
  chưa: {
    gloss: bi("not yet", "chưa"),
    pos: "adverb",
    detail: bi(
      "Chưa is 'not yet', which is a different claim from không ('not'). The Quảng Nam couplet turns on it.",
      "Chưa là 'chưa', khác với không. Câu ca dao xứ Quảng xoay quanh chỗ này.",
    ),
  },
  rồi: { gloss: bi("already; and then", "rồi"), pos: "adverb" },
  "bao giờ": { gloss: bi("whenever; when?", "bao giờ"), pos: "question" },
  nào: { gloss: bi("which, whichever", "nào"), pos: "question" },
  này: { gloss: bi("this", "này"), pos: "particle" },
  đây: { gloss: bi("here", "đây"), pos: "adverb" },
  đấy: { gloss: bi("there", "đấy"), pos: "adverb" },
  ở: { gloss: bi("at, in; to live at", "ở"), pos: "preposition" },
  trong: { gloss: bi("in, inside", "trong"), pos: "preposition" },
  ngoài: { gloss: bi("outside, out at", "ngoài"), pos: "preposition" },
  bên: { gloss: bi("beside, alongside", "bên"), pos: "preposition" },
  với: { gloss: bi("with", "với"), pos: "preposition" },
  từ: { gloss: bi("from", "từ"), pos: "preposition" },
  "buổi sáng": { gloss: bi("morning", "buổi sáng"), pos: "noun" },
  "buổi chiều": { gloss: bi("afternoon", "buổi chiều"), pos: "noun" },
  ơi: {
    gloss: bi("calling particle, for addressing someone", "ơi"),
    pos: "particle",
    detail: bi(
      "Put after a name or noun to call to it: Bầu ơi, Trâu ơi, Mẹ ơi. It is affectionate, never rude.",
      "Đặt sau tên hoặc danh từ để gọi: Bầu ơi, Trâu ơi, Mẹ ơi. Thân mật, không hề bất lịch sự.",
    ),
  },
  đà: {
    gloss: bi("already (regional)", "đà"),
    pos: "adverb",
    central: bi(
      "The Quảng Nam form of đã ('already'). Keeping it is what makes the couplet sound like the place it comes from.",
      "Dạng xứ Quảng của đã. Giữ nguyên từ này mới ra chất vùng đất sinh ra câu ca dao.",
    ),
  },
};

// -- tier 0: letters and tone marks ------------------------------------------
// Generated from the alphabet and tone tables so there is one source of truth,
// and so tier 0 shows a real explanation instead of "a word from the text".
const LETTERS: Record<string, LexEntry> = Object.fromEntries(
  ALPHABET.map((letter) => [
    letter.letter,
    {
      gloss: letter.name,
      pos: "letter" as const,
      pronunciation: letter.ipa.replace(/^\/|\/$/g, ""),
      detail: bi(
        `${letter.note.en} Closest English sound: ${letter.englishNearest.en}.`,
        `${letter.note.vi} Âm tiếng Anh gần nhất: ${letter.englishNearest.vi}.`,
      ),
    } satisfies LexEntry,
  ]),
);

const TONE_SYLLABLES: Record<string, LexEntry> = Object.fromEntries(
  TONES.flatMap((tone) =>
    tone.example.split("/").map((syllable) => {
      const value = syllable.trim();
      return [
        value,
        {
          gloss: bi(`${tone.label.en} tone on "ma"`, `thanh ${tone.label.vi} trên "ma"`),
          pos: "letter" as const,
          detail: bi(`The contour is ${tone.description.en}.`, `Đường nét: ${tone.description.vi}.`),
          ...(tone.key === "hoi-nga"
            ? {
                central: bi(
                  "Written hỏi and ngã are two different marks, but Đà Nẵng speech gives them one shape.",
                  "Hỏi và ngã là hai dấu khác nhau khi viết, nhưng giọng Đà Nẵng cho chúng cùng một đường nét.",
                ),
              }
            : {}),
        } satisfies LexEntry,
      ];
    }),
  ),
);

export const LEXICON: Record<string, LexEntry> = {
  ...PEOPLE,
  ...NATURE,
  ...PLACES,
  ...VERBS,
  ...FUNCTION_WORDS,
  ...LETTERS,
  ...TONE_SYLLABLES,
};

export function normalizeEntry(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi");
}

export function lookup(entry: string): LexEntry | undefined {
  return LEXICON[normalizeEntry(entry)];
}

const UNKNOWN: Bi = bi("a word from the text", "một từ trong bài");

/**
 * A displayed token merged with its dictionary entry. Imports fall through to a
 * neutral gloss; shipped readings never do, and a test enforces it.
 */
export function mergeToken(token: { text: string; entry?: string }): Token {
  const entry = token.entry ?? token.text;
  const base = lookup(entry);
  return base ? { text: token.text, entry, ...base } : { text: token.text, entry, gloss: UNKNOWN };
}
