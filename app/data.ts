import type { Story, ToneKey } from "./types";

export const STORIES: Story[] = [
  {
    id: "dong-dao-con-co-be-be",
    title: "Con cò bé bé",
    titleEn: "The little stork",
    tier: 1,
    kind: "Đồng dao",
    region: "Dân gian Việt Nam",
    minutes: 3,
    difficulty: 2,
    unknownRatio: 0.06,
    description: "Bốn câu ngắn về một chú cò — nhiều nhịp điệu, từ cụ thể và lặp lại.",
    source: "Đồng dao truyền miệng",
    license: "Phạm vi công cộng",
    accent: "Giọng tổng hợp · Trung (Huế)",
    pattern: "stork",
    sentences: [
      {
        id: "co-1",
        translation: "The little, little stork",
        tokens: [
          { text: "Con", entry: "con", gloss: "animate classifier", pos: "loại từ", classifier: true, detail: "Đứng trước tên con vật. Tên ứng dụng cũng dùng mẫu này: con + heo." },
          { text: "cò", entry: "cò", gloss: "stork", pos: "danh từ", pronunciation: "kɔː˨˩" },
          { text: "bé bé", entry: "bé", gloss: "little, tiny", pos: "tính từ", detail: "Lặp từ làm nghĩa nhẹ và trìu mến hơn." },
        ],
      },
      {
        id: "co-2",
        translation: "It perches on a bamboo branch",
        tokens: [
          { text: "Nó", entry: "nó", gloss: "it / they", pos: "đại từ", detail: "Dùng cho con vật đã được nhắc đến. Với người, sắc thái tùy quan hệ." },
          { text: "đậu", entry: "đậu", gloss: "to perch", pos: "động từ", pronunciation: "ɗəw˧˨ʔ" },
          { text: "cành tre", entry: "cành tre", gloss: "bamboo branch", pos: "cụm danh từ", detail: "Một từ ghép hai âm tiết: cành + tre." },
        ],
      },
      {
        id: "co-3",
        translation: "It leaves without asking mother",
        tokens: [
          { text: "Đi", entry: "đi", gloss: "to go", pos: "động từ" },
          { text: "không", entry: "không", gloss: "not", pos: "phó từ" },
          { text: "hỏi", entry: "hỏi", gloss: "to ask", pos: "động từ", pronunciation: "hɔj˧˩˧", central: "hỏi và ngã là cùng một đường thanh ở Đà Nẵng" },
          { text: "mẹ", entry: "mẹ", gloss: "mother", pos: "danh từ", pronunciation: "mɛ˧˨ʔ" },
        ],
      },
      {
        id: "co-4",
        translation: "How could it know which road to take?",
        tokens: [
          { text: "Biết", entry: "biết", gloss: "to know", pos: "động từ" },
          { text: "đi", entry: "đi", gloss: "to go", pos: "động từ" },
          { text: "đường nào", entry: "đường nào", gloss: "which road", pos: "cụm hỏi", detail: "Từ hỏi nào đứng sau danh từ: đường nào, người nào." },
        ],
      },
    ],
  },
  {
    id: "dong-dao-con-meo",
    title: "Con mèo mà trèo cây cau",
    titleEn: "The cat climbs the areca tree",
    tier: 1,
    kind: "Đồng dao",
    region: "Dân gian Việt Nam",
    minutes: 4,
    difficulty: 3,
    unknownRatio: 0.09,
    description: "Một cuộc đối thoại nhỏ giữa mèo và chuột, đầy vần cau–nào–mua.",
    source: "Đồng dao truyền miệng",
    license: "Phạm vi công cộng",
    accent: "Giọng tổng hợp · Trung (Huế)",
    pattern: "cat",
    sentences: [
      {
        id: "meo-1",
        translation: "The cat climbs the areca tree",
        tokens: [
          { text: "Con", entry: "con", gloss: "animate classifier", classifier: true, pos: "loại từ" },
          { text: "mèo", entry: "mèo", gloss: "cat", pos: "danh từ" },
          { text: "mà", entry: "mà", gloss: "and / while", pos: "liên từ", detail: "Ở đây mà nối nhịp kể, không cần dịch từng chữ." },
          { text: "trèo", entry: "trèo", gloss: "to climb", pos: "động từ" },
          { text: "cây cau", entry: "cây cau", gloss: "areca palm", pos: "cụm danh từ" },
        ],
      },
      {
        id: "meo-2",
        translation: "The little mouse asks: where are you going?",
        tokens: [
          { text: "Hỏi", entry: "hỏi", gloss: "to ask", pos: "động từ" },
          { text: "thăm", entry: "thăm", gloss: "to visit", pos: "động từ" },
          { text: "chú chuột", entry: "chú chuột", gloss: "little mouse", pos: "cụm danh từ", detail: "Chú là cách gọi thân mật cho con vật hoặc người nam trẻ hơn." },
          { text: "đi đâu", entry: "đi đâu", gloss: "go where?", central: "Ở Đà Nẵng: đi mô?", pos: "cụm hỏi" },
        ],
      },
      {
        id: "meo-3",
        translation: "The mouse goes to the market far away",
        tokens: [
          { text: "Chú chuột", entry: "chú chuột", gloss: "little mouse", pos: "cụm danh từ" },
          { text: "đi", entry: "đi", gloss: "to go", pos: "động từ" },
          { text: "chợ", entry: "chợ", gloss: "market", pos: "danh từ" },
          { text: "đường xa", entry: "đường xa", gloss: "a long road", pos: "cụm danh từ" },
        ],
      },
    ],
  },
  {
    id: "dong-dao-dung-dang",
    title: "Dung dăng dung dẻ",
    titleEn: "Walking hand in hand",
    tier: 1,
    kind: "Đồng dao",
    region: "Miền Trung",
    minutes: 3,
    difficulty: 3,
    unknownRatio: 0.13,
    description: "Lời hát trò chơi trẻ em, học bằng nhịp chân và những hình ảnh làng quê.",
    source: "Đồng dao truyền miệng",
    license: "Phạm vi công cộng",
    accent: "Giọng người · Miền Trung",
    pattern: "steps",
    sentences: [
      {
        id: "dung-1",
        translation: "Walking along together",
        tokens: [
          { text: "Dung dăng dung dẻ", entry: "dung dăng dung dẻ", gloss: "walking hand in hand", pos: "thành ngữ nhịp điệu", detail: "Cụm từ tượng nhịp trong trò chơi trẻ em; đừng tách từng âm để dịch." },
        ],
      },
      {
        id: "dung-2",
        translation: "Lead the children out to play",
        tokens: [
          { text: "Dắt", entry: "dắt", gloss: "to lead by hand", pos: "động từ" },
          { text: "trẻ", entry: "trẻ", gloss: "children / young", pos: "danh từ" },
          { text: "đi chơi", entry: "đi chơi", gloss: "to go out for fun", pos: "động từ" },
        ],
      },
      {
        id: "dung-3",
        translation: "Arrive at heaven's gate",
        tokens: [
          { text: "Đến", entry: "đến", gloss: "to arrive", pos: "động từ" },
          { text: "cửa trời", entry: "cửa trời", gloss: "heaven's gate", pos: "cụm danh từ" },
        ],
      },
    ],
  },
  {
    id: "dong-dao-rong-ran",
    title: "Rồng rắn lên mây",
    titleEn: "Dragon and snake climb to the clouds",
    tier: 1,
    kind: "Đồng dao",
    region: "Dân gian Việt Nam",
    minutes: 5,
    difficulty: 4,
    unknownRatio: 0.17,
    description: "Một bài đồng dao đối đáp được hát khi trẻ em nối đuôi nhau thành rồng.",
    source: "Đồng dao truyền miệng",
    license: "Phạm vi công cộng",
    accent: "Giọng tổng hợp · Trung (Huế)",
    pattern: "dragon",
    sentences: [
      {
        id: "rong-1",
        translation: "Dragon and snake climb to the clouds",
        tokens: [
          { text: "Rồng rắn", entry: "rồng rắn", gloss: "dragon and snake", pos: "cụm danh từ" },
          { text: "lên", entry: "lên", gloss: "to go up", pos: "động từ" },
          { text: "mây", entry: "mây", gloss: "cloud", pos: "danh từ" },
        ],
      },
      {
        id: "rong-2",
        translation: "There is a swaying tree",
        tokens: [
          { text: "Có", entry: "có", gloss: "there is / have", pos: "động từ" },
          { text: "cây", entry: "cây", gloss: "tree / plant classifier", pos: "danh từ" },
          { text: "lúc lắc", entry: "lúc lắc", gloss: "swaying", pos: "từ láy", detail: "Từ láy mô phỏng chuyển động qua âm thanh." },
        ],
      },
      {
        id: "rong-3",
        translation: "Is the doctor at home?",
        tokens: [
          { text: "Hỏi", entry: "hỏi", gloss: "to ask", pos: "động từ" },
          { text: "thăm", entry: "thăm", gloss: "to visit", pos: "động từ" },
          { text: "thầy thuốc", entry: "thầy thuốc", gloss: "doctor", pos: "danh từ", hanViet: { character: "藥", meaning: "medicine", family: ["thuốc men", "dược học", "dược sĩ"] } },
          { text: "có nhà hay không", entry: "có nhà hay không", gloss: "at home or not?", pos: "mẫu câu hỏi" },
        ],
      },
    ],
  },
  {
    id: "dong-dao-keo-cua",
    title: "Kéo cưa lừa xẻ",
    titleEn: "Pull the saw, cut the wood",
    tier: 1,
    kind: "Đồng dao",
    region: "Dân gian Việt Nam",
    minutes: 4,
    difficulty: 4,
    unknownRatio: 0.21,
    description: "Nhịp kéo cưa biến thành một bài hát ngắn về nghề mộc và bữa cơm.",
    source: "Đồng dao truyền miệng",
    license: "Phạm vi công cộng",
    accent: "Giọng tổng hợp · Trung (Huế)",
    pattern: "saw",
    sentences: [
      {
        id: "cua-1",
        translation: "Pull the saw, cut and split",
        tokens: [
          { text: "Kéo cưa", entry: "kéo cưa", gloss: "to pull a saw", pos: "động từ" },
          { text: "lừa xẻ", entry: "lừa xẻ", gloss: "rhythmic sawing phrase", pos: "cụm nhịp" },
        ],
      },
      {
        id: "cua-2",
        translation: "The strong worker gets the king's meal",
        tokens: [
          { text: "Ông thợ", entry: "ông thợ", gloss: "the craftsman", pos: "danh từ" },
          { text: "nào", entry: "nào", gloss: "which / whoever", pos: "từ hỏi" },
          { text: "khỏe", entry: "khỏe", gloss: "strong / healthy", pos: "tính từ" },
          { text: "về", entry: "về", gloss: "to return / toward", pos: "động từ" },
          { text: "ăn cơm vua", entry: "ăn cơm vua", gloss: "eat the king's meal", pos: "cụm động từ" },
        ],
      },
    ],
  },
];

export const TONES: Array<{
  key: ToneKey;
  label: string;
  mark: string;
  example: string;
  description: string;
  contour: number[];
}> = [
  { key: "ngang", label: "ngang", mark: "—", example: "ma", description: "cao và bằng", contour: [0.7, 0.71, 0.7, 0.69, 0.7] },
  { key: "huyền", label: "huyền", mark: "`", example: "mà", description: "thấp dần, mềm", contour: [0.63, 0.55, 0.46, 0.37, 0.3] },
  { key: "sắc", label: "sắc", mark: "´", example: "má", description: "vút lên nhanh", contour: [0.38, 0.44, 0.54, 0.7, 0.88] },
  { key: "hỏi-ngã", label: "hỏi = ngã", mark: "̉  ̃", example: "mả / mã", description: "võng xuống rồi lên", contour: [0.58, 0.4, 0.25, 0.4, 0.61] },
  { key: "nặng", label: "nặng", mark: ".", example: "mạ", description: "thấp, ngắn, chặn", contour: [0.49, 0.38, 0.25, 0.18, 0.14] },
];

export const QUICK_WORDS = [
  { entry: "con", gloss: "loại từ cho động vật", status: "known", seen: 12 },
  { entry: "đi", gloss: "to go", status: "known", seen: 9 },
  { entry: "hỏi", gloss: "to ask", status: "learning", seen: 5 },
  { entry: "cành tre", gloss: "bamboo branch", status: "learning", seen: 2 },
  { entry: "răng", gloss: "how? · miền Trung", status: "new", seen: 1 },
];
