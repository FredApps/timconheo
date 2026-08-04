import type { Bi } from "../types";

/**
 * Every fixed string the interface can show, in both languages.
 *
 * The table is `as const satisfies Record<string, Bi>` so `StringKey` stays a
 * closed union: a missing key is a compile error at the call site, and a missing
 * Vietnamese half is a compile error here.
 *
 * Content -- story titles, glosses, dialect notes -- is not in this table. That
 * lives with the data as `Bi` values, because it is written per item.
 */
export const STRINGS = {
  "app.title": { en: "Tìm Con Heo", vi: "Tìm Con Heo" },
  "app.dialect": { en: "Đà Nẵng", vi: "Đà Nẵng" },
  "app.tagline": { en: "Read Vietnamese for real", vi: "Đọc tiếng Việt thật" },
  "app.loading": { en: "Opening your garden…", vi: "Đang mở khu vườn của bạn…" },

  // -- navigation -------------------------------------------------------------
  "nav.home": { en: "Home", vi: "Hôm nay" },
  "nav.library": { en: "Library", vi: "Thư viện" },
  "nav.review": { en: "Review", vi: "Ôn tập" },
  "nav.tones": { en: "Tones", vi: "Thanh điệu" },
  "nav.words": { en: "Words", vi: "Từ của tôi" },
  "nav.garden": { en: "Garden", vi: "Vườn" },
  "nav.import": { en: "My text", vi: "Bài riêng" },
  "nav.about": { en: "About", vi: "Về ứng dụng" },
  "nav.primary": { en: "Primary navigation", vi: "Điều hướng chính" },
  // The bottom bar and the header bar are both in the document; only one is
  // visible at a time, but they need distinct names all the same.
  "nav.sections": { en: "Main sections", vi: "Các mục chính" },
  "nav.menu": { en: "More", vi: "Thêm" },
  "nav.menuOpen": { en: "Open the menu", vi: "Mở trình đơn" },
  "nav.menuClose": { en: "Close the menu", vi: "Đóng trình đơn" },
  "nav.close": { en: "Close", vi: "Đóng" },
  "nav.back": { en: "Back", vi: "Về" },
  "nav.signOut": { en: "Sign out", vi: "Đăng xuất" },
  "nav.signOutOf": { en: "Sign out of {username}", vi: "Đăng xuất khỏi {username}" },
  "nav.theme": { en: "Change theme", vi: "Đổi giao diện" },
  "nav.themeLight": { en: "Light theme", vi: "Giao diện sáng" },
  "nav.themeDark": { en: "Dark theme", vi: "Giao diện tối" },
  "nav.themeSystem": { en: "Match the system theme", vi: "Theo giao diện hệ thống" },
  "nav.language": { en: "Language", vi: "Ngôn ngữ" },
  "nav.languageBilingual": { en: "English + Vietnamese", vi: "Anh + Việt" },
  "nav.languageEnglish": { en: "English only", vi: "Chỉ tiếng Anh" },
  "nav.languageVietnamese": { en: "Vietnamese first", vi: "Ưu tiên tiếng Việt" },
  "nav.voice": { en: "Central voice", vi: "Giọng miền Trung" },

  // -- shared states ----------------------------------------------------------
  "state.loading": { en: "Loading…", vi: "Đang tải…" },
  "state.saving": { en: "Saving…", vi: "Đang lưu…" },
  "state.saved": { en: "Saved", vi: "Đã lưu" },
  "state.retry": { en: "Try again", vi: "Thử lại" },
  "state.offlineTitle": { en: "Cannot reach the server", vi: "Không kết nối được máy chủ" },
  "state.offlineBody": {
    en: "Your work is safe on the server. This looks like a network problem, not a sign-out.",
    vi: "Dữ liệu của bạn vẫn an toàn trên máy chủ. Đây có vẻ là lỗi mạng, không phải bị đăng xuất.",
  },
  "state.saveFailed": { en: "That did not save. Try again.", vi: "Chưa lưu được. Hãy thử lại." },
  "state.loadFailed": { en: "That did not load.", vi: "Chưa tải được." },

  // -- home -------------------------------------------------------------------
  "home.eyebrow": { en: "A small daily reading habit", vi: "Một thói quen đọc nhỏ mỗi ngày" },
  "home.greeting": { en: "Hello, read one good line", vi: "Chào bạn, đọc một câu thật hay" },
  "home.intro": {
    en: "No streaks or pressure. Just a little Vietnamese, with a patient ear for Đà Nẵng.",
    vi: "Không áp lực hay chuỗi ngày. Chỉ một chút tiếng Việt, với đôi tai kiên nhẫn cho giọng Đà Nẵng.",
  },
  "home.start": { en: "Start reading", vi: "Bắt đầu đọc" },
  "home.reread": { en: "Read again", vi: "Đọc lại" },
  "home.ready": { en: "Ready for you", vi: "Đang chờ bạn" },
  "home.sorted": {
    en: "Ordered toward your next comfortable step.",
    vi: "Xếp theo bước tiếp theo vừa sức với bạn.",
  },
  "home.sortedUnmeasured": {
    en: "Ordered from gentlest first, until you have saved some words.",
    vi: "Xếp từ nhẹ nhất, cho tới khi bạn lưu được một ít từ.",
  },
  "home.summary": { en: "Learning summary", vi: "Tóm tắt việc học" },
  "home.known": { en: "rooted words", vi: "từ đã bén rễ" },
  "home.syllables": { en: "syllables read", vi: "âm tiết đã đọc" },
  "home.readingDays": { en: "reading days", vi: "ngày đã đọc" },
  "home.storiesDone": { en: "readings finished", vi: "bài đã đọc xong" },
  "home.sentences": { en: "{count} sentences", vi: "{count} câu" },
  "home.toneTitle": { en: "Hear the Central difference", vi: "Nghe khác biệt miền Trung" },
  "home.toneBody": {
    en: "Hỏi and ngã merge in Đà Nẵng. Learn the contour without pretending the written marks disappear.",
    vi: "Hỏi và ngã hòa vào nhau ở Đà Nẵng. Học đường nét âm thanh mà không giả vờ dấu viết biến mất.",
  },
  "home.reviewTitle": { en: "A gentle review", vi: "Một lượt ôn nhẹ nhàng" },
  "home.reviewBody": {
    en: "The clock makes the promise, not a card count.",
    vi: "Đồng hồ giữ lời hứa, không phải số thẻ.",
  },
  "home.importTitle": { en: "Have a Vietnamese text?", vi: "Có một đoạn tiếng Việt?" },
  "home.importBody": { en: "Paste it here and make it readable.", vi: "Dán vào đây để biến thành bài đọc." },

  // -- library ----------------------------------------------------------------
  "library.title": { en: "Library", vi: "Thư viện" },
  "library.intro": {
    en: "Everything is open. Difficulty sorts the path; it never locks a door.",
    vi: "Mọi bài đều mở. Độ khó chỉ xếp đường đi, không khóa cánh cửa nào.",
  },
  "library.sort": { en: "Order readings by", vi: "Sắp xếp bài đọc theo" },
  "library.sortReadiness": { en: "Best next for me", vi: "Vừa sức nhất với tôi" },
  "library.sortDifficulty": { en: "Intrinsic difficulty", vi: "Độ khó nội tại" },
  "library.sortShortest": { en: "Shortest first", vi: "Ngắn nhất trước" },
  "library.filterTier": { en: "Filter by level", vi: "Lọc theo bậc" },
  "library.filterAll": { en: "All levels", vi: "Mọi bậc" },
  "library.tier": { en: "Level {tier}", vi: "Bậc {tier}" },
  "library.why": { en: "Why this rating", vi: "Vì sao xếp hạng này" },
  "library.whyBody": {
    en: "Intrinsic difficulty {score} out of 10. {rare}% of words fall outside the beginner core; sentences average {syllables} syllables.",
    vi: "Độ khó nội tại {score} trên 10. {rare}% số từ nằm ngoài vốn cơ bản; câu dài trung bình {syllables} âm tiết.",
  },
  "library.read": { en: "Open reading", vi: "Mở bài đọc" },
  "library.count": { en: "{count} readings", vi: "{count} bài đọc" },
  "library.completed": { en: "Finished", vi: "Đã xong" },
  "library.unknown": { en: "{percent}% unfamiliar", vi: "{percent}% chưa quen" },
  "library.unknownUnmeasured": { en: "Not measured yet", vi: "Chưa đo được" },
  "library.minutes": { en: "{count} min", vi: "{count} phút" },
  "library.empty": { en: "No readings match that filter.", vi: "Không có bài nào khớp bộ lọc." },

  // -- reader -----------------------------------------------------------------
  "reader.help": { en: "Reading help", vi: "Mức trợ giúp" },
  "reader.full": { en: "Full help", vi: "Đầy đủ" },
  "reader.assisted": { en: "Guided", vi: "Có gợi ý" },
  "reader.raw": { en: "Plain text", vi: "Văn bản" },
  "reader.textSize": { en: "Text size", vi: "Cỡ chữ" },
  "reader.smaller": { en: "Smaller text", vi: "Chữ nhỏ hơn" },
  "reader.larger": { en: "Larger text", vi: "Chữ lớn hơn" },
  "reader.centralNotes": { en: "Central notes", vi: "Ghi chú miền Trung" },
  "reader.centralNotesOn": { en: "Hide Central notes", vi: "Ẩn ghi chú miền Trung" },
  "reader.centralNotesOff": { en: "Show Central notes", vi: "Hiện ghi chú miền Trung" },
  "reader.listenAll": { en: "Listen to all", vi: "Nghe toàn bài" },
  "reader.stop": { en: "Stop", vi: "Dừng" },
  "reader.listenSentence": { en: "Listen to sentence {number}", vi: "Nghe câu {number}" },
  "reader.listenWord": { en: "Listen to {word}", vi: "Nghe {word}" },
  "reader.complete": { en: "I finished reading", vi: "Tôi đã đọc xong" },
  "reader.completing": { en: "Saving your reading…", vi: "Đang lưu bài đọc…" },
  "reader.done": { en: "A small thing, read well.", vi: "Một điều nhỏ, đọc thật kỹ." },
  "reader.syllablesRead": {
    en: "You read {count} Vietnamese syllables.",
    vi: "Bạn đã đọc {count} âm tiết tiếng Việt.",
  },
  "reader.source": { en: "Source", vi: "Nguồn" },
  "reader.remember": { en: "Save for review", vi: "Lưu để ôn lại" },
  "reader.remembering": { en: "Saving…", vi: "Đang lưu…" },
  "reader.wordDetails": { en: "About {word}", vi: "Về từ {word}" },
  "reader.wordStatus": { en: "How well do you know this word?", vi: "Bạn biết từ này đến đâu?" },
  "reader.new": { en: "New", vi: "Mới" },
  "reader.learning": { en: "Learning", vi: "Đang học" },
  "reader.known": { en: "Known", vi: "Đã biết" },
  "reader.ignored": { en: "Skip", vi: "Bỏ qua" },
  "reader.unseen": { en: "Not opened yet", vi: "Chưa mở" },
  "reader.centralNote": { en: "Central note", vi: "Ghi chú miền Trung" },
  "reader.classifier": { en: "This is a classifier", vi: "Đây là một loại từ" },
  "reader.classifierBody": {
    en: "Vietnamese counts almost nothing without one. Learn it together with the noun.",
    vi: "Tiếng Việt hầu như không đếm gì mà thiếu loại từ. Hãy học chung với danh từ.",
  },
  "reader.hanViet": { en: "Sino-Vietnamese root", vi: "Gốc Hán-Việt" },
  "reader.savedWord": { en: "Saved {entry} for review.", vi: "Đã lưu {entry} để ôn lại." },
  "reader.rootedWord": { en: "{entry} is rooted.", vi: "{entry} đã bén rễ." },
  "reader.updatedWord": { en: "Updated {entry}.", vi: "Đã cập nhật {entry}." },
  "reader.completedStory": { en: "Reading added to your garden.", vi: "Đã thêm bài đọc vào khu vườn." },

  // -- speech -----------------------------------------------------------------
  "speech.preparing": { en: "Preparing {voice}…", vi: "Đang chuẩn bị giọng {voice}…" },
  "speech.playingCentral": { en: "FPT Central · {voice}", vi: "FPT miền Trung · {voice}" },
  "speech.device": { en: "Device Vietnamese", vi: "Giọng Việt của thiết bị" },
  "speech.useDeviceNow": { en: "Use device voice now", vi: "Dùng giọng thiết bị ngay" },
  "speech.fellBack": {
    en: "The Central voice was unavailable, so this is your device's Vietnamese voice.",
    vi: "Không dùng được giọng miền Trung, nên đây là giọng tiếng Việt của thiết bị.",
  },
  "speech.unavailable": { en: "No Vietnamese voice is available.", vi: "Không có giọng tiếng Việt nào." },
  "speech.instant": { en: "Ready to play instantly", vi: "Sẵn sàng phát ngay" },
  "speech.willGenerate": { en: "Will be generated on first play", vi: "Sẽ được tạo ở lần phát đầu" },
  "speech.about": {
    en: "My An and Gia Huy are FPT.AI's generic Central Vietnamese voices, not studio recordings of Đà Nẵng speakers.",
    vi: "My An và Gia Huy là giọng miền Trung tổng hợp của FPT.AI, không phải bản thu phòng của người Đà Nẵng.",
  },

  // -- review -----------------------------------------------------------------
  "review.title": { en: "Review for a while", vi: "Ôn tập một lúc" },
  "review.intro": {
    en: "Choose a time box. The clock ends the session; nothing is lost if you stop.",
    vi: "Chọn một khoảng thời gian. Đồng hồ kết thúc lượt học; dừng lại cũng không mất gì.",
  },
  "review.chooseLength": { en: "Session length", vi: "Độ dài lượt học" },
  "review.minutes": { en: "minutes", vi: "phút" },
  "review.minutesCount": { en: "{count} minutes", vi: "{count} phút" },
  "review.start": { en: "Start gently", vi: "Bắt đầu nhẹ nhàng" },
  "review.end": { en: "End session", vi: "Kết thúc lượt học" },
  "review.left": { en: "about {minutes} minutes left", vi: "còn khoảng {minutes} phút" },
  "review.almost": { en: "almost done", vi: "sắp xong" },
  "review.elapsed": { en: "Session progress", vi: "Tiến độ lượt học" },
  "review.reveal": { en: "Show meaning", vi: "Xem nghĩa" },
  "review.again": { en: "Again", vi: "Lại lần nữa" },
  "review.hard": { en: "Hard", vi: "Khó" },
  "review.good": { en: "Good", vi: "Được rồi" },
  "review.easy": { en: "Easy", vi: "Dễ" },
  "review.emptyTitle": { en: "Nothing is due right now", vi: "Bây giờ chưa có từ nào đến hạn" },
  "review.emptyBody": {
    en: "Save a word while reading and it will return here when it is ready.",
    vi: "Lưu một từ khi đọc, từ sẽ quay lại đây khi đến lúc.",
  },
  "review.doneTitle": { en: "That is enough for now", vi: "Vậy là đủ cho lúc này" },
  "review.doneBody": {
    en: "Come back whenever you like. Nothing expires.",
    vi: "Quay lại lúc nào cũng được. Không có gì hết hạn.",
  },
  "review.context": { en: "A sentence from your reading", vi: "Một câu từ bài bạn đã đọc" },
  "review.forgiveness": {
    en: "Welcome back — I spread your reviews over the next few weeks. Nothing was lost.",
    vi: "Mừng bạn quay lại — các lượt ôn đã được trải ra trong vài tuần tới. Không có gì bị mất.",
  },

  // -- tones ------------------------------------------------------------------
  "tones.title": { en: "Find the shape of a voice", vi: "Tìm đường nét của giọng" },
  "tones.intro": {
    en: "Đà Nẵng keeps hỏi and ngã close. The written marks remain; your ear learns the living contour.",
    vi: "Đà Nẵng giữ hỏi và ngã gần nhau. Dấu viết vẫn còn; tai bạn học đường nét đang sống.",
  },
  "tones.count": { en: "spoken shapes", vi: "đường nét khi nói" },
  "tones.chooseTone": { en: "Choose a tone to practise", vi: "Chọn một thanh để luyện" },
  "tones.listen": { en: "Listen", vi: "Nghe" },
  "tones.record": { en: "Record your voice", vi: "Ghi âm giọng bạn" },
  "tones.recording": { en: "Recording — speak now", vi: "Đang ghi — hãy nói" },
  "tones.stop": { en: "Stop recording", vi: "Dừng ghi âm" },
  "tones.chartTitle": { en: "Pitch over time", vi: "Cao độ theo thời gian" },
  "tones.chartTarget": { en: "Target contour: {shape}", vi: "Đường nét mẫu: {shape}" },
  "tones.chartAttempt": { en: "Your attempt is the dashed line.", vi: "Lần thử của bạn là đường nét đứt." },
  "tones.chartNoAttempt": { en: "No recording yet.", vi: "Chưa có bản ghi nào." },
  "tones.contoursAreStylised": {
    en: "These contours are teaching targets drawn by hand, not measurements of recorded speech.",
    vi: "Các đường nét này là hình mẫu vẽ tay để dạy, không phải số đo từ lời nói thu được.",
  },
  "tones.micNeeded": {
    en: "This needs microphone permission. Nothing is uploaded — the pitch is measured on your device.",
    vi: "Cần quyền dùng micrô. Không có gì được gửi đi — cao độ được đo ngay trên máy bạn.",
  },
  "tones.micDenied": { en: "The microphone is not available.", vi: "Không dùng được micrô." },
  "tones.correct": { en: "Good ear.", vi: "Tai nghe tốt." },
  "tones.tryAgain": {
    en: "Not quite. Listen to the contour again.",
    vi: "Chưa đúng. Hãy nghe lại đường nét.",
  },
  "tones.scored": { en: "Contour match: {percent}%", vi: "Khớp đường nét: {percent}%" },
  "tones.demoTitle": { en: "Demonstration: hỏi and ngã", vi: "Minh họa: hỏi và ngã" },
  "tones.demoBody": {
    en: "mả and mã are two different spellings with one Đà Nẵng contour. There is no wrong answer here — that is the point.",
    vi: "mả và mã là hai cách viết nhưng chỉ một đường nét ở Đà Nẵng. Bài này không có đáp án sai — đó chính là ý.",
  },
  "tones.demoHeard": { en: "You heard: {syllable}", vi: "Bạn vừa nghe: {syllable}" },
  "tones.checkTitle": { en: "Five-choice listening check", vi: "Bài nghe năm lựa chọn" },
  "tones.checkBody": {
    en: "One syllable, five contours. This one does have a right answer.",
    vi: "Một âm tiết, năm đường nét. Bài này có đáp án đúng.",
  },
  "tones.checkPlay": { en: "Play a syllable", vi: "Phát một âm tiết" },
  "tones.choose": { en: "Choose the tone you heard", vi: "Chọn thanh bạn vừa nghe" },

  // -- garden -----------------------------------------------------------------
  "garden.title": { en: "Your garden", vi: "Khu vườn của bạn" },
  "garden.intro": {
    en: "It only grows. Nothing here wilts because you were away.",
    vi: "Nó chỉ lớn lên. Không có gì héo đi vì bạn vắng mặt.",
  },
  "garden.scene": { en: "Your language garden", vi: "Khu vườn ngôn ngữ của bạn" },
  "garden.plants": {
    en: "{count} plants for {total} rooted words",
    vi: "{count} cây cho {total} từ đã bén rễ",
  },

  // -- words ------------------------------------------------------------------
  "words.title": { en: "Your words", vi: "Từ của tôi" },
  "words.intro": {
    en: "Known words and learning words are allowed to be different things.",
    vi: "Từ đã biết và từ đang học có thể là hai chuyện khác nhau.",
  },
  "words.search": { en: "Search a word", vi: "Tìm một từ" },
  "words.filter": { en: "Filter by status", vi: "Lọc theo trạng thái" },
  "words.all": { en: "All", vi: "Tất cả" },
  "words.sort": { en: "Sort by", vi: "Sắp xếp theo" },
  "words.sortRecent": { en: "Recently updated", vi: "Vừa cập nhật" },
  "words.sortAlpha": { en: "Alphabetical", vi: "Theo bảng chữ cái" },
  "words.sortSeen": { en: "Most seen", vi: "Gặp nhiều nhất" },
  "words.timesSeen": { en: "seen {count} times", vi: "đã gặp {count} lần" },
  "words.statusOf": { en: "Status of {entry}", vi: "Trạng thái của {entry}" },
  "words.empty": { en: "No words yet", vi: "Chưa có từ nào" },
  "words.emptyBody": {
    en: "Open a reading, tap a word, and save it when you want it to return.",
    vi: "Mở một bài đọc, chạm vào một từ và lưu lại khi muốn nó quay lại.",
  },
  "words.noMatch": { en: "No words match that search.", vi: "Không có từ nào khớp." },
  "words.count": { en: "{count} of {total} words", vi: "{count} trên {total} từ" },

  // -- import -----------------------------------------------------------------
  "import.title": { en: "Make your own reading", vi: "Tạo bài đọc của riêng bạn" },
  "import.intro": {
    en: "Paste Vietnamese text. Segmentation is a helpful approximation, not a linguistic authority.",
    vi: "Dán văn bản tiếng Việt. Tách từ chỉ là gợi ý gần đúng, không phải phán quyết ngôn ngữ.",
  },
  "import.private": { en: "Stored with your account", vi: "Lưu cùng tài khoản của bạn" },
  "import.titleLabel": { en: "Title", vi: "Tên bài" },
  "import.titlePlaceholder": { en: "A morning by the sea", vi: "Một buổi sáng bên biển" },
  "import.textLabel": { en: "Vietnamese text", vi: "Văn bản tiếng Việt" },
  "import.textPlaceholder": { en: "Paste Vietnamese text here…", vi: "Dán văn bản tiếng Việt vào đây…" },
  "import.counter": { en: "{used} of {max} characters", vi: "{used} trên {max} ký tự" },
  "import.tooLong": { en: "That is longer than {max} characters.", vi: "Dài hơn {max} ký tự." },
  "import.save": { en: "Save text", vi: "Lưu văn bản" },
  "import.saving": { en: "Saving…", vi: "Đang lưu…" },
  "import.saved": { en: "Saved to your account.", vi: "Đã lưu vào tài khoản của bạn." },
  "import.savedList": { en: "Your saved texts", vi: "Văn bản đã lưu" },
  "import.open": { en: "Open", vi: "Mở" },
  "import.delete": { en: "Delete", vi: "Xóa" },
  "import.deleteConfirm": { en: "Delete “{title}”?", vi: "Xóa “{title}”?" },
  "import.deleteYes": { en: "Yes, delete", vi: "Xóa" },
  "import.deleteNo": { en: "Keep it", vi: "Giữ lại" },
  "import.deleting": { en: "Deleting…", vi: "Đang xóa…" },
  "import.preview": { en: "Preview", vi: "Xem trước" },
  "import.previewEmpty": { en: "A preview appears here.", vi: "Bản xem trước sẽ hiện ở đây." },
  "import.stats": { en: "{words} words · {sentences} sentences", vi: "{words} từ · {sentences} câu" },
  "import.approxNote": { en: "Word boundaries are approximate.", vi: "Ranh giới từ chỉ là gần đúng." },
  "import.audioNote": {
    en: "Pressing play sends that text to FPT.AI to generate audio. Nothing is sent until you press play.",
    vi: "Bấm phát sẽ gửi đoạn văn bản đó tới FPT.AI để tạo âm thanh. Chưa bấm thì chưa gửi gì.",
  },

  // -- about ------------------------------------------------------------------
  "about.title": { en: "Read Vietnamese as it is", vi: "Đọc tiếng Việt như nó vốn có" },
  "about.body": {
    en: "A small tool for beginners, with an ear pointed toward Đà Nẵng and Quảng Nam.",
    vi: "Một công cụ nhỏ cho người mới bắt đầu, với đôi tai hướng về Đà Nẵng và Quảng Nam.",
  },
  "about.noPressure": { en: "No pressure", vi: "Không áp lực" },
  "about.noPressureBody": {
    en: "No streaks, hearts, XP, or daily guilt. The garden records what grew.",
    vi: "Không chuỗi ngày, tim, XP hay cảm giác tội lỗi. Khu vườn ghi lại điều đã lớn.",
  },
  "about.honest": { en: "Honest help", vi: "Trợ giúp trung thực" },
  "about.honestBody": {
    en: "Difficulty and dialect notes are explained instead of pretending to be exact.",
    vi: "Độ khó và ghi chú phương ngữ được giải thích thay vì giả vờ chính xác.",
  },
  "about.open": { en: "Open material", vi: "Tư liệu mở" },
  "about.openBody": {
    en: "Traditional texts are recorded with source and licence information.",
    vi: "Văn bản truyền thống được ghi rõ nguồn và giấy phép.",
  },
  "about.classifiers": { en: "Classifiers and kinship", vi: "Loại từ và xưng hô" },
  "about.classifiersBody": {
    en: "Two things English does not have, marked on the words themselves rather than saved for a grammar chapter.",
    vi: "Hai điều tiếng Anh không có, được đánh dấu ngay trên từ thay vì để dành cho một chương ngữ pháp.",
  },
  "about.version": { en: "Version {version}", vi: "Phiên bản {version}" },

  // -- sign in ----------------------------------------------------------------
  "login.welcome": { en: "Welcome back", vi: "Mừng bạn quay lại" },
  "login.create": { en: "Create account", vi: "Tạo tài khoản" },
  "login.intro": {
    en: "A calm place to read Vietnamese, hear Central tones, and return to words when they are ready.",
    vi: "Một nơi yên tĩnh để đọc tiếng Việt, nghe thanh điệu miền Trung, và gặp lại từ khi đến lúc.",
  },
  "login.username": { en: "Username", vi: "Tên đăng nhập" },
  "login.password": { en: "Password", vi: "Mật khẩu" },
  "login.submit": { en: "Sign in", vi: "Đăng nhập" },
  "login.submitting": { en: "Signing in…", vi: "Đang đăng nhập…" },
  "login.creating": { en: "Creating your account…", vi: "Đang tạo tài khoản…" },
  "login.toSignup": { en: "Need an account? Create one.", vi: "Chưa có tài khoản? Tạo một cái." },
  "login.toLogin": { en: "Already have an account? Sign in.", vi: "Đã có tài khoản? Đăng nhập." },

  // -- errors -----------------------------------------------------------------
  "error.INVALID_CREDENTIALS": {
    en: "The username or password is not correct.",
    vi: "Tên đăng nhập hoặc mật khẩu chưa đúng.",
  },
  "error.INVALID_USERNAME": {
    en: "Use 3–32 letters, numbers, dots, dashes, or underscores.",
    vi: "Dùng 3–32 chữ cái, số, dấu chấm, gạch ngang hoặc gạch dưới.",
  },
  "error.INVALID_PASSWORD": { en: "Use at least 6 characters.", vi: "Dùng ít nhất 6 ký tự." },
  "error.SIGNUPS_CLOSED": { en: "Signups are closed.", vi: "Đăng ký đang đóng." },
  "error.USERNAME_TAKEN": {
    en: "That username is already taken.",
    vi: "Tên đăng nhập này đã có người dùng.",
  },
  "error.RATE_LIMITED": {
    en: "Too many attempts. Wait a moment and try again.",
    vi: "Thử quá nhiều lần. Hãy đợi một lát rồi thử lại.",
  },
  "error.AUTH_REQUIRED": { en: "Please sign in again.", vi: "Hãy đăng nhập lại." },
  "error.INVALID_IMPORT": { en: "That text could not be saved.", vi: "Không lưu được văn bản đó." },
  "error.INVALID_ENTRY": { en: "That word could not be saved.", vi: "Không lưu được từ đó." },
  "error.NETWORK": { en: "Cannot reach the server.", vi: "Không kết nối được máy chủ." },
  "error.UNKNOWN": { en: "Something went wrong. Try again.", vi: "Có lỗi xảy ra. Hãy thử lại." },
} as const satisfies Record<string, Bi>;

export type StringKey = keyof typeof STRINGS;
