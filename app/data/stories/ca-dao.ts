import type { Story } from "../../types";
import { bi, line } from "../helpers";

/**
 * Ca dao: anonymous traditional couplets and lục bát verse. Public domain by age
 * and anonymity. Each entry names the page whose wording was checked, because
 * these circulate in several variants and "a version I half remember" is not a
 * source.
 */
export const CA_DAO_STORIES: Story[] = [
  {
    id: "ca-dao-bau-oi",
    title: "Bầu ơi thương lấy bí cùng",
    titleEn: "Gourd, love the squash beside you",
    tier: 2,
    kind: "caDao",
    region: "national",
    description: bi(
      "The best-known couplet about looking after one another, in its standard two-line form.",
      "Cặp lục bát quen thuộc nhất về việc thương nhau, ở dạng hai dòng chuẩn.",
    ),
    source: "Anonymous Vietnamese folk verse — State Committee for Overseas Vietnamese Affairs (SCOV)",
    sourceUrl:
      "https://scov.gov.vn/van-hoc-nghe-thuat/ca-dao-tuc-ngu/ca-dao-tuc-ngu-hay-ve-long-yeu-nuoc-phan-1-.html",
    license: "publicDomain",
    pattern: "gourd",
    sentences: [
      line("bau-1", bi("Gourd, love the squash beside you.", "Bầu ơi thương lấy bí cùng"), [
        ["Bầu", "bầu"],
        ["ơi", "ơi"],
        ["thương", "thương"],
        ["lấy", "lấy"],
        ["bí", "bí"],
        ["cùng", "cùng"],
      ]),
      line(
        "bau-2",
        bi("Though of different kinds, you share one trellis.", "Tuy rằng khác giống nhưng chung một giàn"),
        [
          ["Tuy rằng", "tuy rằng"],
          ["khác", "khác"],
          ["giống", "giống"],
          ["nhưng", "nhưng"],
          ["chung", "chung"],
          ["một", "một"],
          ["giàn", "giàn"],
        ],
      ),
    ],
  },
  {
    id: "ca-dao-trau-oi",
    title: "Trâu ơi ta bảo trâu này",
    titleEn: "Buffalo, listen to me",
    tier: 2,
    kind: "caDao",
    region: "national",
    description: bi(
      "Six lines spoken to a working buffalo — the longest reading here, and the first with real clause linking.",
      "Sáu dòng nói với con trâu đi cày — bài dài nhất ở đây, và là bài đầu tiên có nối câu thật sự.",
    ),
    source: "Anonymous Vietnamese folk verse — State Committee for Overseas Vietnamese Affairs (SCOV)",
    sourceUrl: "https://scov.gov.vn/que-huong/goc-thieu-nhi/ca-dao-ve-san-xuat.html",
    license: "publicDomain",
    pattern: "buffalo",
    sentences: [
      line("trau-1", bi("Buffalo, I am telling you this.", "Trâu ơi ta bảo trâu này"), [
        ["Trâu", "trâu"],
        ["ơi", "ơi"],
        ["ta", "ta"],
        ["bảo", "bảo"],
        ["trâu", "trâu"],
        ["này", "này"],
      ]),
      line(
        "trau-2",
        bi("Buffalo, come out to the field and plough with me.", "Trâu ra ngoài ruộng trâu cày với ta"),
        [
          ["Trâu", "trâu"],
          ["ra", "ra"],
          ["ngoài", "ngoài"],
          ["ruộng", "ruộng"],
          ["trâu", "trâu"],
          ["cày", "cày"],
          ["với", "với"],
          ["ta", "ta"],
        ],
      ),
      line("trau-3", bi("Planting and ploughing keep the farming life.", "Cấy cày giữ nghiệp nông gia"), [
        ["Cấy", "cấy"],
        ["cày", "cày"],
        ["giữ", "giữ"],
        ["nghiệp", "nghiệp"],
        ["nông gia", "nông gia"],
      ]),
      line(
        "trau-4",
        bi("Here am I, there are you — who would count the work?", "Ta đây trâu đấy, ai mà quản công"),
        [
          ["Ta", "ta"],
          ["đây", "đây"],
          ["trâu", "trâu"],
          ["đấy,", "đấy"],
          ["ai", "ai"],
          ["mà", "mà"],
          ["quản công", "quản công"],
        ],
      ),
      line("trau-5", bi("As long as the rice plant still bears grain,", "Bao giờ cây lúa còn bông"), [
        ["Bao giờ", "bao giờ"],
        ["cây lúa", "cây lúa"],
        ["còn", "còn"],
        ["bông", "bông"],
      ]),
      line(
        "trau-6",
        bi("There will still be grass in the field for you.", "Thì còn ngọn cỏ ngoài đồng trâu ăn"),
        [
          ["Thì", "thì"],
          ["còn", "còn"],
          ["ngọn cỏ", "ngọn cỏ"],
          ["ngoài", "ngoài"],
          ["đồng", "đồng"],
          ["trâu", "trâu"],
          ["ăn", "ăn"],
        ],
      ),
    ],
  },
  {
    id: "ca-dao-dat-quang",
    title: "Đất Quảng Nam chưa mưa đà thấm",
    titleEn: "Quảng Nam earth soaks before rain",
    tier: 2,
    kind: "caDao",
    region: "quangNam",
    description: bi(
      "The canonical two-line Quảng Nam couplet, preserving the regional word đà.",
      "Cặp lục bát xứ Quảng quen thuộc, giữ nguyên từ địa phương đà.",
    ),
    source:
      "Anonymous Quảng Nam folk verse — Hội An Center for Cultural Heritage Management and Preservation",
    sourceUrl:
      "https://hoianheritage.danang.gov.vn/vi/trao-doi-chuyen-nganh/chuyen-de-nghien-cuu-trao-doi/do-thi-co-hoi-an-gia-tri-van-hoa-va-nghe-thuat-526.html",
    license: "publicDomain",
    accent: "Quảng Nam",
    pattern: "dragon",
    sentences: [
      line("quang-1", bi("Quảng Nam earth is soaked before the rain.", "Đất Quảng Nam chưa mưa đà thấm."), [
        ["Đất", "đất"],
        ["Quảng Nam", "quảng nam"],
        ["chưa", "chưa"],
        ["mưa", "mưa"],
        ["đà", "đà"],
        ["thấm", "thấm"],
      ]),
      line(
        "quang-2",
        bi("Hồng Đào wine intoxicates before it is tasted.", "Rượu Hồng Đào chưa nhấm đà say."),
        [
          ["Rượu", "rượu"],
          ["Hồng Đào", "hồng đào"],
          ["chưa", "chưa"],
          ["nhấm", "nhấm"],
          ["đà", "đà"],
          ["say", "say"],
        ],
      ),
    ],
  },
];
