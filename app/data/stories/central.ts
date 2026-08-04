import type { Bi, Story } from "../../types";
import { bi, line } from "../helpers";

/**
 * Original prose readings set in Đà Nẵng and Hội An.
 *
 * These are written *for* this app in standard Vietnamese, using ordinary
 * everyday vocabulary and a Central setting. They are not transcriptions of
 * recorded regional speech, and the app must not imply otherwise: the setting is
 * Central, the language is standard. Where a genuinely regional word or
 * pronunciation is worth knowing, it belongs in the word panel's Central note,
 * sourced there, rather than baked into the line.
 */
const ORIGINAL_NOTE: Bi = bi(
  "Written for this app in standard Vietnamese, set in Central Vietnam. It is learning material, not a transcription of recorded regional speech.",
  "Được viết riêng cho ứng dụng bằng tiếng Việt phổ thông, lấy bối cảnh miền Trung. Đây là tư liệu học, không phải bản ghi lời nói địa phương.",
);

export const CENTRAL_STORIES: Story[] = [
  {
    id: "canh-buoi-sang-song-han",
    title: "Buổi sáng bên sông Hàn",
    titleEn: "A morning by the Hàn river",
    tier: 1,
    kind: "scene",
    region: "daNang",
    description: bi(
      "Five plain sentences about a walk in Đà Nẵng: the first reading here that is prose rather than verse.",
      "Năm câu đơn giản về một buổi đi bộ ở Đà Nẵng: bài văn xuôi đầu tiên ở đây, không phải thơ.",
    ),
    source: "Original learning material written for Tìm Con Heo",
    license: "original",
    pattern: "river",
    attributionNote: ORIGINAL_NOTE,
    sentences: [
      line(
        "han-1",
        bi("In the morning, I walk beside the Hàn river.", "Buổi sáng, tôi đi bộ bên sông Hàn."),
        [
          ["Buổi sáng,", "buổi sáng"],
          ["tôi", "tôi"],
          ["đi bộ", "đi bộ"],
          ["bên", "bên"],
          ["sông Hàn.", "sông hàn"],
        ],
      ),
      line("han-2", bi("Wind blows in from the sea into the city.", "Gió từ biển thổi vào thành phố."), [
        ["Gió", "gió"],
        ["từ", "từ"],
        ["biển", "biển"],
        ["thổi", "thổi"],
        ["vào", "vào"],
        ["thành phố.", "thành phố"],
      ]),
      line(
        "han-3",
        bi("I buy a bread roll and a cup of coffee.", "Tôi mua một ổ bánh mì và một ly cà phê."),
        [
          ["Tôi", "tôi"],
          ["mua", "mua"],
          ["một", "một"],
          ["ổ", "ổ"],
          ["bánh mì", "bánh mì"],
          ["và", "và"],
          ["một", "một"],
          ["ly", "ly"],
          ["cà phê.", "cà phê"],
        ],
      ),
      line(
        "han-4",
        bi('The seller smiles and says: "Please, go ahead."', 'Người bán hàng mỉm cười và nói: "Mời bạn."'),
        [
          ["Người bán hàng", "người bán hàng"],
          ["mỉm cười", "mỉm cười"],
          ["và", "và"],
          ["nói:", "nói"],
          ['"Mời bạn."', "mời bạn"],
        ],
      ),
      line("han-5", bi("I sit and look at the Dragon Bridge.", "Tôi ngồi nhìn cầu Rồng."), [
        ["Tôi", "tôi"],
        ["ngồi", "ngồi"],
        ["nhìn", "nhìn"],
        ["cầu Rồng.", "cầu rồng"],
      ]),
    ],
  },
  {
    id: "canh-cho-hoi-an",
    title: "Một vòng chợ Hội An",
    titleEn: "A turn around Hội An market",
    tier: 2,
    kind: "scene",
    region: "quangNam",
    description: bi(
      "Buying fruit at the market: numbers, classifiers, and the politeness of asking a price.",
      "Mua trái cây ở chợ: số đếm, loại từ và cách hỏi giá cho lịch sự.",
    ),
    source: "Original learning material written for Tìm Con Heo",
    license: "original",
    pattern: "market",
    attributionNote: ORIGINAL_NOTE,
    sentences: [
      line(
        "hoian-1",
        bi("In the afternoon, I go to the market in Hội An.", "Buổi chiều, tôi đi chợ ở Hội An."),
        [
          ["Buổi chiều,", "buổi chiều"],
          ["tôi", "tôi"],
          ["đi chợ", "đi chợ"],
          ["ở", "ở"],
          ["Hội An.", "hội an"],
        ],
      ),
      line(
        "hoian-2",
        bi(
          "In the market there are vegetables, fish and many kinds of fruit.",
          "Trong chợ có rau, cá và nhiều loại trái cây.",
        ),
        [
          ["Trong", "trong"],
          ["chợ", "chợ"],
          ["có", "có"],
          ["rau,", "rau"],
          ["cá", "cá"],
          ["và", "và"],
          ["nhiều", "nhiều"],
          ["loại", "loại"],
          ["trái cây.", "trái cây"],
        ],
      ),
      line("hoian-3", bi("I ask the price of a basket of mangoes.", "Tôi hỏi giá một rổ xoài."), [
        ["Tôi", "tôi"],
        ["hỏi", "hỏi"],
        ["giá", "giá"],
        ["một", "một"],
        ["rổ", "rổ"],
        ["xoài.", "xoài"],
      ]),
      line(
        "hoian-4",
        bi(
          "The seller answers, then weighs the mangoes for me.",
          "Cô bán hàng trả lời rồi cân xoài cho tôi.",
        ),
        [
          ["Cô bán hàng", "cô bán hàng"],
          ["trả lời", "trả lời"],
          ["rồi", "rồi"],
          ["cân", "cân"],
          ["xoài", "xoài"],
          ["cho", "cho"],
          ["tôi.", "tôi"],
        ],
      ),
      line(
        "hoian-5",
        bi("I thank her and walk back along the river.", "Tôi cảm ơn cô và đi về bên dòng sông."),
        [
          ["Tôi", "tôi"],
          ["cảm ơn", "cảm ơn"],
          ["cô", "cô"],
          ["và", "và"],
          ["đi về", "đi về"],
          ["bên", "bên"],
          ["dòng sông.", "dòng sông"],
        ],
      ),
    ],
  },
];
