import test from "node:test";
import assert from "node:assert/strict";
import { STORIES } from "../app/data";

const renderedLines = (storyId: string) => {
  const story = STORIES.find((item) => item.id === storyId);
  assert.ok(story, `missing story ${storyId}`);
  return story.sentences.map((sentence) => sentence.tokens.map((token) => token.text).join(" "));
};

test("displayed Vietnamese contains every word recorded in the source line", () => {
  const clean = (value: string) => value.trim().replace(/[.,!?;:…]+$/u, "");
  for (const story of STORIES.filter((item) => !item.interactive)) {
    for (const sentence of story.sentences) {
      const displayed = sentence.tokens.map((token) => token.text).join(" ");
      assert.equal(clean(displayed), clean(sentence.translation.vi), `${story.id}/${sentence.id} is truncated`);
    }
  }
});

test("sourced readings preserve their audited line sets", () => {
  assert.deepEqual(renderedLines("dong-dao-con-co-be-be"), ["Con cò bé bé", "Nó đậu cành tre", "Đi không hỏi mẹ", "Biết đi đường nào"]);
  assert.deepEqual(renderedLines("dong-dao-con-meo"), ["Con mèo mà trèo cây cau", "Hỏi thăm chú chuột đi đâu vắng nhà", "Chú chuột đi chợ đường xa", "Mua mắm mua muối giỗ cha chú mèo"]);
  assert.deepEqual(renderedLines("ca-dao-dat-quang"), ["Đất Quảng Nam chưa mưa đà thấm", "Rượu Hồng Đào chưa nhấm đà say"]);
  assert.deepEqual(renderedLines("dong-dao-keo-cua"), ["Kéo cưa lừa xẻ", "Ông thợ nào khỏe", "Về ăn cơm vua", "Ông thợ nào thua", "Về bú tí mẹ"]);
});

test("source and rights metadata do not call the attributed song folklore", () => {
  const song = STORIES.find((story) => story.id === "dong-dao-con-co-be-be");
  assert.equal(song?.license, "copyrightedExcerpt");
  assert.match(song?.source ?? "", /Lê Xuân Thọ/);
  for (const story of STORIES.filter((item) => item.license === "publicDomain")) assert.ok(story.sourceUrl, `${story.id} needs a verification URL`);
});
