(function () {
    console.log("1. Скрипт readings.js начал работу");

    var section = document.getElementById('daily-reading');
    var dateEl = document.getElementById('reading-date');
    var apRefEl = document.getElementById('reading-apostle-ref');
    var apTextEl = document.getElementById('reading-apostle-text');
    var apBlockEl = document.getElementById('reading-apostle-block');
    var goRefEl = document.getElementById('reading-gospel-ref');
    var goTextEl = document.getElementById('reading-gospel-text');
    var goBlockEl = document.getElementById('reading-gospel-block');
    var noteEl = document.getElementById('reading-note');

    if (!section) console.error("2. Ошибка: Блок #daily-reading не найден в HTML!");
    if (typeof LiturgicalCycle === 'undefined') console.error("2. Ошибка: Не загружен cycle.js (LiturgicalCycle не определен)");
    if (typeof BibleText === 'undefined') console.error("2. Ошибка: Не загружен bible-text.js (BibleText не определен)");

    if (!section || typeof LiturgicalCycle === 'undefined' || typeof BibleText === 'undefined') {
        console.log("3. Скрипт остановлен из-за критических ошибок выше.");
        return;
    }

    console.log("3. Зависимости в норме. Начинаем загрузку JSON файлов...");

    Promise.all([
        fetch('reading-data/pascha-dates.json').then(function (r) { return r.json(); }),
        fetch('reading-data/ordinary-cycle.json').then(function (r) { return r.json(); }),
        fetch('reading-data/nt-text.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
        console.log("4. Все 3 файла JSON успешно загружены!");
        
        var paschaDates = results[0];
        var cycle = results[1];
        var bibleData = results[2];

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log("5. Сегодняшняя дата:", today);

        var pascha = LiturgicalCycle.pickPascha(today, paschaDates);
        console.log("6. Дата Пасхи для текущего года:", pascha);
        if (!pascha) { 
            console.log("-> Скрываем блок: Дата Пасхи не найдена."); 
            section.style.display = 'none'; return; 
        }

        var pos = LiturgicalCycle.resolveCyclePosition(today, pascha);
        console.log("7. Позиция в церковном цикле:", pos);
        if (pos.period === 'unresolved') { 
            console.log("-> Скрываем блок: Период определен как unresolved."); 
            section.style.display = 'none'; return; 
        }

        var weekTable = (cycle[pos.period] || {})[pos.week];
        var entry = weekTable ? weekTable[pos.weekday] : null;
        console.log("8. Данные о чтениях на сегодня:", entry);
        
        if (!entry) { 
            console.log("-> Скрываем блок: В ordinary-cycle.json нет данных для сегодняшнего дня."); 
            section.style.display = 'none'; return; 
        }

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

        if (!entry.apostle && !entry.gospel) {
            console.log("-> Скрываем блок: В базе нет ни Апостола, ни Евангелия на сегодня.");
            section.style.display = 'none';
        } else {
            console.log("9. УРА! Чтения найдены, показываем блок на сайте.");
            section.style.display = 'block';
        }
    }).catch(function (error) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА (catch):", error);
        section.style.display = 'none';
    });
})();