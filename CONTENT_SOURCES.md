# Reading-material sources

The Vietnamese shown in a sourced reading must reproduce the selected source variant word for word. English translations, word boundaries, glosses, and difficulty metadata are editorial learning aids and are not part of the quoted source.

| Reading | Selected source | Variant and rights note |
|---|---|---|
| Tier 0 lessons | Original Tìm Con Heo material | GPL-3.0-only with the application. |
| *Mẹ yêu không nào* | [Sheet music credited to Lê Xuân Thọ](https://truongca.com/images/sheet/pdf/me/me-yeu-khong-nao-le-xuan-tho-truongca.com.pdf) | Only the short opening stanza is included. It is attributed and is not labelled public domain. |
| *Con mèo mà trèo cây cau* | [Ca dao Mẹ transcription](https://cadao.me/con-meo-ma-treo-cay-cau/) | Complete common four-line anonymous folk version. |
| *Dung dăng dung dẻ* | [Vietnam National Authority of Tourism](https://www.dulichvn.org.vn/index.php/item/25680) | Complete nine-line version ending “Ngồi xệp xuống đây”; other regional variants exist. |
| *Đất Quảng Nam chưa mưa đà thấm* | [Hội An Center for Cultural Heritage Management and Preservation](https://hoianheritage.danang.gov.vn/vi/trao-doi-chuyen-nganh/chuyen-de-nghien-cuu-trao-doi/do-thi-co-hoi-an-gia-tri-van-hoa-va-nghe-thuat-526.html) | The selected couplet preserves “đà” and includes the Hồng Đào line. [Báo Quảng Nam documents both “đã” and “đà” variants](https://baoquangnam.vn/dem-tuoi-mot-cau-ca-3154504.html). |
| *Kéo cưa lừa xẻ* | [Báo Pháp Luật Việt Nam](https://baophapluat.vn/keo-cua-lua-xe-post117403.html) | Complete five-line common game-rhyme version; the source also documents a separate “kéo kít” variant, which is not mixed into this reading. |

`tests/corpus.test.ts` verifies that rendered tokens reconstruct every recorded Vietnamese line and locks the audited line sets against accidental truncation.
