import { LEXICON } from "./lexicon";

/**
 * Multi-syllable words, used to segment imported text.
 *
 * Vietnamese writes syllables separately, so "học sinh" looks like two words and
 * is one. Every multi-syllable dictionary entry is a compound by definition, so
 * the list seeds itself from the lexicon and only names the extras -- common
 * words the shipped corpus happens not to contain yet.
 *
 * Sorted longest-first, because the segmenter takes the longest match and
 * "buổi sáng" must win over "buổi".
 */
const EXTRA_COMPOUNDS = [
  "việt nam",
  "tiếng việt",
  "học sinh",
  "sinh viên",
  "giáo viên",
  "bác sĩ",
  "gia đình",
  "bạn bè",
  "anh trai",
  "chị gái",
  "em gái",
  "em trai",
  "ông bà",
  "bố mẹ",
  "con gái",
  "con trai",
  "hôm nay",
  "hôm qua",
  "ngày mai",
  "bây giờ",
  "buổi tối",
  "buổi trưa",
  "cuối tuần",
  "thời gian",
  "công việc",
  "nhà hàng",
  "khách sạn",
  "sân bay",
  "bệnh viện",
  "trường học",
  "xe máy",
  "xe đạp",
  "điện thoại",
  "máy tính",
  "quần áo",
  "nước mắm",
  "phở bò",
  "bún bò",
  "mì quảng",
  "cơm gà",
  "thức ăn",
  "rất nhiều",
  "một chút",
  "tất cả",
  "tại sao",
  "như thế nào",
  "bao nhiêu",
  "ở đâu",
  "thế nào",
  "có thể",
  "không thể",
  "làm việc",
  "nghỉ ngơi",
  "đi làm",
  "đi ngủ",
  "xin lỗi",
  "không sao",
  "tạm biệt",
  "miền trung",
  "miền bắc",
  "miền nam",
  "phố cổ",
  "bãi biển",
];

export const COMMON_COMPOUNDS: string[] = [
  ...new Set([...Object.keys(LEXICON).filter((entry) => entry.includes(" ")), ...EXTRA_COMPOUNDS]),
].sort((a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length || a.localeCompare(b));
