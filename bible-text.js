// Порт src/bible_text.py: получение текста отрывка (Синодальный перевод,
// 1876, общественное достояние) по ссылке вида 'Мф.22:35-46' или
// 'Мф.10:32-33,37-38,19:27-30'. Текст лежит в reading-data/nt-text.json:
// { book_id: { chapter: { verse: text } } }.

var BibleText = (function () {
    var BOOK_MAP = {
        "Мф": "Matt", "Мк": "Mark", "Лк": "Luke", "Ин": "John",
        "Деян": "Acts", "Рим": "Rom", "1Кор": "1Cor", "2Кор": "2Cor",
        "Гал": "Gal", "Еф": "Eph", "Флп": "Phil", "Кол": "Col", "Евр": "Heb",
        "Иак": "Jas", "1Пет": "1Pet", "2Пет": "2Pet",
        "1Ин": "1John", "2Ин": "2John", "3Ин": "3John", "Иуд": "Jude",
        "1Фес": "1Thess", "2Фес": "2Thess",
        "1Тим": "1Tim", "2Тим": "2Tim", "Тит": "Titus", "Флм": "Phlm",
        "1Фес": "1Thess", "2Фес": "2Thess", "1Сол": "1Thess", "2Сол": "2Thess"
    };

    var SEG_CROSS_CHAPTER = /^(\d+):(\d+)-(\d+):(\d+)$/;
    var SEG_SAME_CHAPTER_RANGE = /^(\d+):(\d+)-(\d+)$/;
    var SEG_SINGLE = /^(\d+):(\d+)$/;
    var SEG_VERSE_RANGE_NO_CHAPTER = /^(\d+)-(\d+)$/;
    var SEG_VERSE_NO_CHAPTER = /^(\d+)$/;
    var SEG_VERSE_TO_CHAPTER_VERSE = /^(\d+)-(\d+):(\d+)$/;

    function chapterVerses(bookData, bookId, chapter) {
        var ch = (bookData[bookId] || {})[String(chapter)] || {};
        return Object.keys(ch).map(Number).sort(function (a, b) { return a - b; });
    }

    function verseText(bookData, bookId, chapter, verse) {
        var ch = (bookData[bookId] || {})[String(chapter)];
        return ch ? ch[String(verse)] : undefined;
    }

    function extractRange(bookData, bookId, ch1, v1, ch2, v2) {
        var out = [];
        if (ch1 === ch2) {
            for (var v = v1; v <= v2; v++) {
                var t = verseText(bookData, bookId, ch1, v);
                if (t) out.push(t);
            }
            return out;
        }
        chapterVerses(bookData, bookId, ch1).forEach(function (v) {
            if (v >= v1) out.push(verseText(bookData, bookId, ch1, v));
        });
        for (var c = ch1 + 1; c < ch2; c++) {
            chapterVerses(bookData, bookId, c).forEach(function (v) {
                out.push(verseText(bookData, bookId, c, v));
            });
        }
        chapterVerses(bookData, bookId, ch2).forEach(function (v) {
            if (v <= v2) out.push(verseText(bookData, bookId, ch2, v));
        });
        return out;
    }

    function parseAndFetch(bookData, ref) {
        var dotIdx = ref.indexOf('.');
        if (dotIdx === -1) return null;
        var bookShort = ref.slice(0, dotIdx);
        var rest = ref.slice(dotIdx + 1);
        var bookId = BOOK_MAP[bookShort];
        if (!bookId || !bookData[bookId]) return null;

        var currentChapter = null;
        var result = [];
        var segments = rest.split(',');
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i].trim();
            var m;
            if ((m = SEG_CROSS_CHAPTER.exec(seg))) {
                var ch1 = +m[1], v1 = +m[2], ch2 = +m[3], v2 = +m[4];
                result = result.concat(extractRange(bookData, bookId, ch1, v1, ch2, v2));
                currentChapter = ch2;
                continue;
            }
            if ((m = SEG_SAME_CHAPTER_RANGE.exec(seg))) {
                var ch = +m[1], sv1 = +m[2], sv2 = +m[3];
                result = result.concat(extractRange(bookData, bookId, ch, sv1, ch, sv2));
                currentChapter = ch;
                continue;
            }
            if ((m = SEG_SINGLE.exec(seg))) {
                var sch = +m[1], svv = +m[2];
                var t1 = verseText(bookData, bookId, sch, svv);
                if (t1) result.push(t1);
                currentChapter = sch;
                continue;
            }
            if ((m = SEG_VERSE_TO_CHAPTER_VERSE.exec(seg)) && currentChapter !== null) {
                var vv1 = +m[1], vch2 = +m[2], vv2 = +m[3];
                result = result.concat(extractRange(bookData, bookId, currentChapter, vv1, vch2, vv2));
                currentChapter = vch2;
                continue;
            }
            if ((m = SEG_VERSE_RANGE_NO_CHAPTER.exec(seg)) && currentChapter !== null) {
                var rv1 = +m[1], rv2 = +m[2];
                result = result.concat(extractRange(bookData, bookId, currentChapter, rv1, currentChapter, rv2));
                continue;
            }
            if ((m = SEG_VERSE_NO_CHAPTER.exec(seg)) && currentChapter !== null) {
                var onlyV = +m[1];
                var t2 = verseText(bookData, bookId, currentChapter, onlyV);
                if (t2) result.push(t2);
                continue;
            }
            return null; // не удалось разобрать сегмент
        }
        return result.length ? result : null;
    }

    function getText(bookData, ref) {
        var parsed = parseAndFetch(bookData, ref);
        return parsed ? parsed.join(' ') : null;
    }

    return { getText: getText, parseAndFetch: parseAndFetch };
})();

if (typeof module !== 'undefined') module.exports = BibleText;
