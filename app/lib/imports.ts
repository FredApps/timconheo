import { COMMON_COMPOUNDS } from "../data/compounds";
import type { ImportRecord } from "../../shared/types";
import type { Story } from "../types";
export function segmentImport(raw: string): string[] {
  const words = raw.trim().split(/\s+/).filter(Boolean); const result: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const pair = (words[index] + " " + (words[index + 1] ?? "")).replace(/[.,!?;:]+$/g, "");
    if (COMMON_COMPOUNDS.some((compound) => compound.toLocaleLowerCase("vi") === pair.toLocaleLowerCase("vi"))) { result.push(words[index] + " " + words[index + 1]); index += 1; } else result.push(words[index]);
  }
  return result;
}
export function storyFromImport(record: ImportRecord): Story {
  const tokens = segmentImport(record.raw);
  return { id: "import-" + record.id, title: record.title, titleEn: record.title, tier: 1, kind: "import", region: "national", description: { en: "A text from your account.", vi: "Một văn bản từ tài khoản của bạn." }, source: "Your account", license: "user", pattern: "sprout", sentences: [{ id: "import-" + record.id + "-1", translation: { en: "Your imported text", vi: "Văn bản bạn nhập" }, tokens: tokens.map((text) => ({ text })) }] };
}

