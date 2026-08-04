import type { Story } from "../../types";
import { bi, line } from "../helpers";

/**
 * Đồng dao: children's game and counting rhymes. Anonymous traditional verse is
 * public domain by age and anonymity, but published *collections* are not, so
 * each entry records the page the wording was checked against and the glosses
 * are written here rather than lifted.
 *
 * The one exception is "Mẹ yêu không nào", which is a twentieth-century song
 * with a named composer. It is kept as a short attributed excerpt and labelled
 * `copyrightedExcerpt` -- calling it folklore would be the actual wrong.
 */
export const DONG_DAO_STORIES: Story[] = [
  {
    id: "dong-dao-con-co-be-be",
    title: "Mẹ yêu không nào",
    titleEn: "Does Mother Love Me?",
    tier: 1,
    kind: "dongDao",
    region: "national",
    description: bi(
      "The opening stanza of a well-known children's song, attributed rather than presented as folklore.",
      "Khổ mở đầu của một bài hát thiếu nhi quen thuộc, được ghi rõ tác giả thay vì xem là dân gian.",
    ),
    source: "Mẹ yêu không nào — Lê Xuân Thọ (opening excerpt)",
    sourceUrl: "https://truongca.com/images/sheet/pdf/me/me-yeu-khong-nao-le-xuan-tho-truongca.com.pdf",
    license: "copyrightedExcerpt",
    pattern: "stork",
    sentences: [
      line("co-1", bi("The little stork.", "Con cò bé bé."), [
        ["Con", "con"],
        ["cò", "cò"],
        ["bé", "bé"],
        ["bé", "bé"],
      ]),
      line("co-2", bi("It perches on a bamboo branch.", "Nó đậu cành tre."), [
        ["Nó", "nó"],
        ["đậu", "đậu"],
        ["cành tre", "cành tre"],
      ]),
      line("co-3", bi("It leaves without asking its mother.", "Đi không hỏi mẹ."), [
        ["Đi", "đi"],
        ["không", "không"],
        ["hỏi", "hỏi"],
        ["mẹ", "mẹ"],
      ]),
      line("co-4", bi("How would it know the way?", "Biết đi đường nào."), [
        ["Biết", "biết"],
        ["đi", "đi"],
        ["đường nào", "đường nào"],
      ]),
    ],
  },
  {
    id: "dong-dao-con-meo",
    title: "Con mèo mà trèo cây cau",
    titleEn: "The cat climbs the areca palm",
    tier: 1,
    kind: "dongDao",
    region: "national",
    description: bi(
      "A complete four-line folk verse with compound nouns and a clear rhythm.",
      "Một bài ca dao bốn dòng đầy đủ với cụm danh từ và nhịp rõ ràng.",
    ),
    source: "Anonymous Vietnamese folk verse",
    sourceUrl: "https://cadao.me/con-meo-ma-treo-cay-cau/",
    license: "publicDomain",
    pattern: "cat",
    sentences: [
      line("meo-1", bi("The cat climbs the areca palm.", "Con mèo mà trèo cây cau."), [
        ["Con", "con"],
        ["mèo", "mèo"],
        ["mà", "mà"],
        ["trèo", "trèo"],
        ["cây cau", "cây cau"],
      ]),
      line("meo-2", bi("It asks after the mouse, who is away.", "Hỏi thăm chú chuột đi đâu vắng nhà."), [
        ["Hỏi thăm", "hỏi thăm"],
        ["chú chuột", "chú chuột"],
        ["đi đâu", "đi đâu"],
        ["vắng nhà", "vắng nhà"],
      ]),
      line("meo-3", bi("The mouse has gone to a faraway market.", "Chú chuột đi chợ đường xa."), [
        ["Chú chuột", "chú chuột"],
        ["đi chợ", "đi chợ"],
        ["đường xa", "đường xa"],
      ]),
      line(
        "meo-4",
        bi(
          "To buy fish sauce and salt for the cat's father's memorial meal.",
          "Mua mắm mua muối giỗ cha chú mèo.",
        ),
        [
          ["Mua", "mua"],
          ["mắm", "mắm"],
          ["mua", "mua"],
          ["muối", "muối"],
          ["giỗ", "giỗ"],
          ["cha", "cha"],
          ["chú mèo", "chú mèo"],
        ],
      ),
    ],
  },
  {
    id: "dong-dao-dung-dang",
    title: "Dung dăng dung dẻ",
    titleEn: "Walking hand in hand",
    tier: 1,
    kind: "dongDao",
    region: "national",
    description: bi(
      "The complete common nine-line version of a movement rhyme.",
      "Dị bản chín dòng phổ biến và đầy đủ của một bài đồng dao vận động.",
    ),
    source: "Anonymous Vietnamese folk game rhyme — Vietnam National Authority of Tourism",
    sourceUrl: "https://www.dulichvn.org.vn/index.php/item/25680",
    license: "publicDomain",
    pattern: "steps",
    sentences: [
      line("dung-1", bi("Walking hand in hand.", "Dung dăng dung dẻ."), [
        ["Dung", "dung dăng dung dẻ"],
        ["dăng", "dung dăng dung dẻ"],
        ["dung", "dung dăng dung dẻ"],
        ["dẻ", "dung dăng dung dẻ"],
      ]),
      line("dung-2", bi("Lead the children out to play.", "Dắt trẻ đi chơi."), [
        ["Dắt", "dắt"],
        ["trẻ", "trẻ"],
        ["đi chơi", "đi chơi"],
      ]),
      line("dung-3", bi("Arrive at heaven's gate.", "Đến cửa nhà trời."), [
        ["Đến", "đến"],
        ["cửa", "cửa"],
        ["nhà trời", "nhà trời"],
      ]),
      line("dung-4", bi("Bow to the uncle and aunt.", "Lạy cậu lạy mợ."), [
        ["Lạy", "lạy"],
        ["cậu", "cậu"],
        ["lạy", "lạy"],
        ["mợ", "mợ"],
      ]),
      line("dung-5", bi("Let the child return home.", "Cho cháu về quê."), [
        ["Cho", "cho"],
        ["cháu", "cháu"],
        ["về quê", "về quê"],
      ]),
      line("dung-6", bi("Send the goat to school.", "Cho dê đi học."), [
        ["Cho", "cho"],
        ["dê", "dê"],
        ["đi học", "đi học"],
      ]),
      line("dung-7", bi("Let the toad stay home.", "Cho cóc ở nhà."), [
        ["Cho", "cho"],
        ["cóc", "cóc"],
        ["ở nhà", "ở nhà"],
      ]),
      line("dung-8", bi("Let the chicken scratch by the stove.", "Cho gà bới bếp."), [
        ["Cho", "cho"],
        ["gà", "gà"],
        ["bới", "bới"],
        ["bếp", "bếp"],
      ]),
      line("dung-9", bi("Sit right down here.", "Ngồi xệp xuống đây."), [
        ["Ngồi", "ngồi"],
        ["xệp", "xệp"],
        ["xuống đây", "xuống đây"],
      ]),
    ],
  },
  {
    id: "dong-dao-keo-cua",
    title: "Kéo cưa lừa xẻ",
    titleEn: "Pull the saw back and forth",
    tier: 2,
    kind: "dongDao",
    region: "national",
    description: bi(
      "The complete five-line common version of a saw-pulling game rhyme.",
      "Dị bản năm dòng phổ biến và đầy đủ của trò chơi kéo cưa.",
    ),
    source: "Anonymous Vietnamese folk game rhyme — Báo Pháp Luật Việt Nam",
    sourceUrl: "https://baophapluat.vn/keo-cua-lua-xe-post117403.html",
    license: "publicDomain",
    pattern: "saw",
    sentences: [
      line("cua-1", bi("Pull the saw back and forth.", "Kéo cưa lừa xẻ."), [
        ["Kéo", "kéo"],
        ["cưa", "cưa"],
        ["lừa", "lừa"],
        ["xẻ", "xẻ"],
      ]),
      line("cua-2", bi("Whichever worker is strong.", "Ông thợ nào khỏe."), [
        ["Ông thợ", "ông thợ"],
        ["nào", "nào"],
        ["khỏe", "khỏe"],
      ]),
      line("cua-3", bi("Returns to eat the king's rice.", "Về ăn cơm vua."), [
        ["Về", "về"],
        ["ăn", "ăn"],
        ["cơm", "cơm"],
        ["vua", "vua"],
      ]),
      line("cua-4", bi("Whichever worker loses.", "Ông thợ nào thua."), [
        ["Ông thợ", "ông thợ"],
        ["nào", "nào"],
        ["thua", "thua"],
      ]),
      line("cua-5", bi("Returns to nurse from mother.", "Về bú tí mẹ."), [
        ["Về", "về"],
        ["bú", "bú"],
        ["tí", "tí"],
        ["mẹ", "mẹ"],
      ]),
    ],
  },
];
