// Показывает список новостей из news.json в блоке #news-grid.
// Формат news.json — { "items": [ { "title": "...", "date": "YYYY-MM-DD", "image": "", "text": "..." } ] }
// Поле "image" необязательное — если пустое, картинка у новости просто не показывается.
// Новости сортируются по дате (сначала самые свежие) и рендерятся через textContent,
// а не innerHTML — чтобы текст новости не мог случайно выполниться как HTML/скрипт.
(function () {
    var grid = document.getElementById('news-grid');
    if (!grid) return;

    var monthNamesGenitive = ["января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"];

    function formatDate(dateStr) {
        var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
        if (!match) return dateStr || '';
        var year = parseInt(match[1], 10);
        var month = parseInt(match[2], 10) - 1;
        var day = parseInt(match[3], 10);
        if (!monthNamesGenitive[month]) return dateStr;
        return day + ' ' + monthNamesGenitive[month] + ' ' + year + ' г.';
    }

    function renderEmpty(message, className) {
        grid.innerHTML = '';
        var p = document.createElement('p');
        p.className = className || 'news-empty';
        p.textContent = message;
        grid.appendChild(p);
    }

    function renderNews(items) {
        grid.innerHTML = '';

        if (!Array.isArray(items) || items.length === 0) {
            renderEmpty('Пока новостей нет. Загляните позже.');
            return;
        }

        var sorted = items.slice().sort(function (a, b) {
            return (b.date || '') < (a.date || '') ? -1 : (b.date || '') > (a.date || '') ? 1 : 0;
        });

        sorted.forEach(function (item) {
            var card = document.createElement('article');
            card.className = 'news-card';

            if (item.image) {
                var img = document.createElement('img');
                img.className = 'news-card-image';
                img.src = item.image;
                img.alt = item.title || '';
                img.loading = 'lazy';
                card.appendChild(img);
            }

            var body = document.createElement('div');
            body.className = 'news-card-body';

            if (item.date) {
                var dateEl = document.createElement('div');
                dateEl.className = 'news-card-date';
                dateEl.textContent = formatDate(item.date);
                body.appendChild(dateEl);
            }

            var titleEl = document.createElement('h2');
            titleEl.className = 'news-card-title';
            titleEl.textContent = item.title || '';
            body.appendChild(titleEl);

            var textEl = document.createElement('p');
            textEl.className = 'news-card-text';
            textEl.textContent = item.text || '';
            body.appendChild(textEl);

            card.appendChild(body);
            grid.appendChild(card);
        });
    }

    fetch('news.json')
        .then(function (response) {
            if (!response.ok) throw new Error('news.json: ' + response.status);
            return response.json();
        })
        .then(function (data) {
            renderNews(data && data.items);
        })
        .catch(function () {
            renderEmpty(
                'Не удалось загрузить новости. Актуальную информацию можно уточнить по телефону +7 (924) 458-88-78.',
                'news-error'
            );
        });
})();
