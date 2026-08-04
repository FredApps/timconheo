# Reading-material sources

The Vietnamese shown in a sourced reading must reproduce the selected source variant word for word. English translations, word boundaries, glosses, and difficulty metadata are editorial learning aids and are not part of the quoted source.

Twelve readings ship with the app: three tier-0 lessons, four folk rhymes, three folk verses, and two original prose scenes.

## Traditional material (public domain)

Anonymous traditional verse is public domain by age and anonymity. Published _collections_ are not: an editor's normalisation, ordering and annotation are their own work. Each row therefore names the page the wording was checked against, and every gloss and translation in the app is written here rather than lifted.

| Reading                          | Selected source                                                                                                                                                                                                       | Variant and rights note                                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Con mèo mà trèo cây cau_        | [Ca dao Mẹ transcription](https://cadao.me/con-meo-ma-treo-cay-cau/)                                                                                                                                                  | Complete common four-line anonymous folk version.                                                                                                                                   |
| _Dung dăng dung dẻ_              | [Vietnam National Authority of Tourism](https://www.dulichvn.org.vn/index.php/item/25680)                                                                                                                             | Complete nine-line version ending “Ngồi xệp xuống đây”; other regional variants exist.                                                                                              |
| _Kéo cưa lừa xẻ_                 | [Báo Pháp Luật Việt Nam](https://baophapluat.vn/keo-cua-lua-xe-post117403.html)                                                                                                                                       | Complete five-line common game-rhyme version; the source also documents a separate “kéo kít” variant, which is not mixed into this reading.                                         |
| _Bầu ơi thương lấy bí cùng_      | [State Committee for Overseas Vietnamese Affairs (SCOV)](https://scov.gov.vn/van-hoc-nghe-thuat/ca-dao-tuc-ngu/ca-dao-tuc-ngu-hay-ve-long-yeu-nuoc-phan-1-.html)                                                      | The standard two-line couplet, with no comma after “Bầu ơi” and ending on “giàn”, as printed at the source.                                                                         |
| _Trâu ơi ta bảo trâu này_        | [State Committee for Overseas Vietnamese Affairs (SCOV)](https://scov.gov.vn/que-huong/goc-thieu-nhi/ca-dao-ve-san-xuat.html)                                                                                         | The six-line “giữ nghiệp nông gia” variant, including the comma in “Ta đây trâu đấy, ai mà quản công”. Shorter four-line variants circulate and are not mixed in.                   |
| _Đất Quảng Nam chưa mưa đà thấm_ | [Hội An Center for Cultural Heritage Management and Preservation](https://hoianheritage.danang.gov.vn/vi/trao-doi-chuyen-nganh/chuyen-de-nghien-cuu-trao-doi/do-thi-co-hoi-an-gia-tri-van-hoa-va-nghe-thuat-526.html) | The selected couplet preserves “đà” and includes the Hồng Đào line. [Báo Quảng Nam documents both “đã” and “đà” variants](https://baoquangnam.vn/dem-tuoi-mot-cau-ca-3154504.html). |

## Attributed excerpt (rights reserved)

| Reading            | Selected source                                                                                                               | Variant and rights note                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Mẹ yêu không nào_ | [Sheet music credited to Lê Xuân Thọ](https://truongca.com/images/sheet/pdf/me/me-yeu-khong-nao-le-xuan-tho-truongca.com.pdf) | A twentieth-century children's song with a named composer, **not** folklore. Only the short opening stanza is included, it is attributed on screen, and it carries the `copyrightedExcerpt` licence key rather than `publicDomain`. |

This is the one reading in the corpus that is not freely licensed. If the project ever needs an entirely public-domain corpus, replacing this stanza with a traditional đồng dao is the single change required; nothing else depends on it.

## Original material

| Reading                                                               | Rights                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Tier 0 lessons (_Chữ đặc biệt_, _Năm đường nét_, _Những từ đầu tiên_) | Original Tìm Con Heo material, GPL-3.0-only with the application. |
| _Buổi sáng bên sông Hàn_                                              | Original Tìm Con Heo material, GPL-3.0-only with the application. |
| _Một vòng chợ Hội An_                                                 | Original Tìm Con Heo material, GPL-3.0-only with the application. |

**The two prose scenes are set in Central Vietnam; they are not written in Central dialect.** They use standard Vietnamese with everyday vocabulary, and the reader says so on the page via each story's `attributionNote`. Where a genuinely regional form is worth knowing — _trái cây_ over _hoa quả_, _ly_ over _cốc_, _má_ over _mẹ_, the _đà_ of the Quảng Nam couplet — it appears as a Central note on the word, where it can be qualified, rather than being silently baked into a line and presented as authentic regional speech.

A native speaker from Đà Nẵng or Quảng Nam should review these two readings, their English translations, and the FPT My An / Gia Huy pronunciation of them, with particular attention to hỏi/ngã contrasts.

## Audio

Playback uses the FPT.AI generic Central Vietnamese voices **My An** and **Gia Huy**. They are commercial synthetic voices labelled Central; they are not studio recordings of Đà Nẵng speakers, and the app does not present them as such. When FPT is unavailable, slow, or out of quota, playback falls back to the device's own `vi-VN` voice — usually a Northern one — and the badge changes to say so rather than continuing to claim a Central voice.

The stylised tone contours in the tone lab are teaching targets drawn by hand, not pitch measurements of recorded speech. The lab labels them as such.

## Enforcement

`tests/client/corpus.test.ts` checks, for every shipped reading, that:

- joining the displayed tokens reproduces the recorded Vietnamese line exactly (no word can be lost in an edit);
- the audited line sets for the sourced readings are unchanged, character for character;
- every string is NFC-normalised, so a decomposed diacritic cannot silently break lookups;
- story and sentence ids are unique;
- every dictionary entry used by a shipped reading exists in the lexicon;
- the attributed song is not labelled public domain, and every public-domain reading carries a verification URL.
