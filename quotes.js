// Показывает случайную цитату из quotes.json в блоке #quotes при каждой загрузке страницы.
// Формат quotes.json — массив объектов:
//   { "text": "...", "author": "...", "source": "" }
// Поле "source" необязательное — если оставить пустым, строка с источником просто не покажется.
(function () {
    var textEl = document.getElementById('quote-text');
    var authorEl = document.getElementById('quote-author');
    var sourceEl = document.getElementById('quote-source');
    var section = document.getElementById('quotes');

    if (!textEl || !section) return;

    fetch('quotes.json')
        .then(function (response) {
            if (!response.ok) throw new Error('quotes.json: ' + response.status);
            return response.json();
        })
        .then(function (quotes) {
            if (!Array.isArray(quotes) || quotes.length === 0) {
                section.style.display = 'none';
                return;
            }
            var quote = quotes[Math.floor(Math.random() * quotes.length)];

            textEl.textContent = '«' + quote.text + '»';
            if (authorEl) authorEl.textContent = '— ' + quote.author;
            if (sourceEl) {
                if (quote.source) {
                    sourceEl.textContent = quote.source;
                    sourceEl.style.display = '';
                } else {
                    sourceEl.style.display = 'none';
                }
            }
        })
        .catch(function () {
            // Если файл недоступен или повреждён — прячем блок, а не показываем пустоту/ошибку
            section.style.display = 'none';
        });
})();
