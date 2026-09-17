// Показывает чтения дня (Апостол и Евангелие) в блоке #daily-reading.
// Использует cycle.js + bible-text.js и три файла данных из reading-data/:
//   pascha-dates.json   — известные даты Пасхи по годам
//   ordinary-cycle.json — таблица рядовых чтений по седмицам
//   nt-text.json        — текст Нового Завета (Синодальный перевод, 1876,
//                          общественное достояние)
// Если для сегодняшнего дня данных ещё нет (седмица не собрана) — блок
// просто скрывается, как и в quotes.js.
(function () {
    var section = document.getElementById('daily-reading');
    var dateEl = document.getElementById('reading-date');
    var apRefEl = document.getElementById('reading-apostle-ref');
    var apTextEl = document.getElementById('reading-apostle-text');
    var apBlockEl = document.getElementById('reading-apostle-block');
    var goRefEl = document.getElementById('reading-gospel-ref');
    var goTextEl = document.getElementById('reading-gospel-text');
    var goBlockEl = document.getElementById('reading-gospel-block');
    var noteEl = document.getElementById('reading-note');

    if (!section || typeof LiturgicalCycle === 'undefined' || typeof BibleText === 'undefined') return;

    Promise.all([
        fetch('reading-data/pascha-dates.json').then(function (r) { return r.json(); }),
        fetch('reading-data/ordinary-cycle.json').then(function (r) { return r.json(); }),
        fetch('reading-data/nt-text.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
        var paschaDates = results[0];
        var cycle = results[1];
        var bibleData = results[2];

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var pascha = LiturgicalCycle.pickPascha(today, paschaDates);
        if (!pascha) { section.style.display = 'none'; return; }

        var pos = LiturgicalCycle.resolveCyclePosition(today, pascha);
        if (pos.period === 'unresolved') { section.style.display = 'none'; return; }

        var weekTable = (cycle[pos.period] || {})[pos.week];
        var entry = weekTable ? weekTable[pos.weekday] : null;
        if (!entry) { section.style.display = 'none'; return; }

        var months = ["января", "февраля", "марта", "апреля", "мая", "июня",
                      "июля", "августа", "сентября", "октября", "ноября", "декабря"];
        if (dateEl) {
            dateEl.textContent = today.getDate() + ' ' + months[today.getMonth()] + ' ' + today.getFullYear();
        }
        if (noteEl) {
            if (entry.note) { noteEl.textContent = entry.note; noteEl.style.display = ''; }
            else { noteEl.style.display = 'none'; }
        }

        function fillBlock(refEl, textEl, blockEl, ref, zachalo) {
            if (!ref) { if (blockEl) blockEl.style.display = 'none'; return; }
            if (blockEl) blockEl.style.display = '';
            if (refEl) refEl.textContent = ref + (zachalo ? ' (зач. ' + zachalo + ')' : '');
            var text = BibleText.getText(bibleData, ref);
            if (textEl) textEl.textContent = text || '';
            if (!text && blockEl) blockEl.style.display = 'none';
        }

        fillBlock(apRefEl, apTextEl, apBlockEl, entry.apostle, entry.apostle_zachalo);
        fillBlock(goRefEl, goTextEl, goBlockEl, entry.gospel, entry.gospel_zachalo);

        // ИСПРАВЛЕНО: Теперь мы явно показываем блок, если данные успешно загрузились,
        // либо оставляем его скрытым, если на сегодня нет ни Апостола, ни Евангелия
        if (!entry.apostle && !entry.gospel) {
            section.style.display = 'none';
        } else {
            section.style.display = 'block';
        }
    }).catch(function (error) {
        // ДОБАВЛЕНО: Вывод ошибки в консоль, чтобы понять, почему скрипт падает
        console.error("Ошибка в readings.js:", error);
        
        // Файлы недоступны/повреждены — прячем блок, а не показываем пустоту/ошибку
        section.style.display = 'none';
    });
})();