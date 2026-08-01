
        /* ============================================================
           ЦЕРКОВНЫЙ КАЛЕНДАРЬ — сегодняшняя дата
           Показываем дату по новому и старому стилю + день недели
           ============================================================ */
        (function() {
            const now = new Date();
            const months = ["января","февраля","марта","апреля","мая","июня",
                            "июля","августа","сентября","октября","ноября","декабря"];
            const weekdays = ["воскресенье","понедельник","вторник","среда",
                              "четверг","пятница","суббота"];
            
            // Новый стиль = сегодняшняя дата
            const dayNew = now.getDate();
            const monthNew = months[now.getMonth()];
            
            // Старый стиль = −13 дней (разница юлианского и григорианского календарей с 1900 по 2099)
            const oldDate = new Date(now);
            oldDate.setDate(oldDate.getDate() - 13);
            const dayOld = oldDate.getDate();
            const monthOld = months[oldDate.getMonth()];
            
            const elNew = document.getElementById('cal-date-new');
            const elOld = document.getElementById('cal-date-old');
            const elWd = document.getElementById('cal-weekday');
            
            if (elNew) elNew.textContent = `${dayNew} ${monthNew}`;
            if (elOld) elOld.textContent = `${dayOld} ${monthOld}`;
            if (elWd) elWd.textContent = weekdays[now.getDay()];
        })();

        /* ============================================================
           РАСПИСАНИЕ БОГОСЛУЖЕНИЙ
           Загружается из Google Sheets, парсит даты и отображает
           ============================================================ */
        // ИЗМЕНЕНО: расписание теперь берётся из локального файла в этом же репозитории,
        // а не из внешней Google-таблицы (таблицу заблокировал сам Google — см. историю)
        const scheduleCsvUrl = "schedule.csv"; 

        // ДОБАВЛЕНО: защита от XSS — экранируем спецсимволы перед вставкой через innerHTML,
        // на случай опечаток/спецсимволов при ручном редактировании schedule.csv
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        
        // ДОБАВЛЕНО: ключевые слова для выделения престольных праздников Никольского храма
        const patronalKeywords = ['никол', 'николая чудотворца', 'свт. никол', 'святителя никол'];
        
        function isPatronalFeast(title) {
            if (!title) return false;
            const lower = title.toLowerCase();
            return patronalKeywords.some(kw => lower.includes(kw));
        }
        
        function renderSchedule(services, phone) {
            document.getElementById('schedule-title').innerText = 'Ближайшие богослужения';
            const list = document.getElementById('schedule-list');
            list.innerHTML = ''; 

            const now = new Date();
            now.setHours(0, 0, 0, 0); 

            const monthNamesGenitive = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
            const monthNamesMap = {'янв':0, 'фев':1, 'мар':2, 'апр':3, 'май':4, 'мая':4, 'июн':5, 'июл':6, 'авг':7, 'сен':8, 'окт':9, 'ноя':10, 'дек':11};
            const shortDays = { "понедельник": "пн", "вторник": "вт", "среда": "ср", "четверг": "чт", "пятница": "пт", "суббота": "сб", "воскресенье": "вс", "пн": "пн", "вт": "вт", "ср": "ср", "чт": "чт", "пт": "пт", "сб": "сб", "вс": "вс" };

            const parsedServices = services.map(service => {
                let dateObj = null;
                let displayDate = service.date;
                let rawDate = service.date.trim();
                let finalTitle = service.title || '';

                const regexFull = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[\s,.]+([а-яА-Яa-zA-Z]+))?/;
                const matchFull = rawDate.match(regexFull);
                
                const regexShort = /^(\d{1,2})\s+([а-яА-Я]+)(?:[\s,.]+\(?([а-яА-Я]+)\)?)?/;
                const matchShort = rawDate.match(regexShort);

                if (matchFull) {
                    const d = parseInt(matchFull[1]);
                    const m = parseInt(matchFull[2]) - 1;
                    const y = parseInt(matchFull[3]);
                    dateObj = new Date(y, m, d);
                    
                    let dayWord = matchFull[4] ? matchFull[4].toLowerCase() : '';
                    let shortDow = shortDays[dayWord] || dayWord;
                    
                    displayDate = `${d} ${monthNamesGenitive[m]}` + (shortDow ? ` (${shortDow})` : '');
                    
                    let leftover = rawDate.substring(matchFull[0].length).replace(/^[\s.]+/, '').trim();
                    if (leftover) finalTitle = leftover + (finalTitle ? '. ' + finalTitle : '');

                } else if (matchShort) {
                    const d = parseInt(matchShort[1]);
                    const mStr = matchShort[2].toLowerCase().substring(0,3);
                    const m = monthNamesMap[mStr];
                    if (m !== undefined) {
                        const y = now.getFullYear();
                        dateObj = new Date(y, m, d);
                        // Если дата в прошлом — берём следующий год
                        if (dateObj < now) dateObj.setFullYear(dateObj.getFullYear() + 1);
                        
                        let dayWord = matchShort[3] ? matchShort[3].toLowerCase() : '';
                        let shortDow = shortDays[dayWord] || dayWord;
                        displayDate = `${d} ${monthNamesGenitive[m]}` + (shortDow ? ` (${shortDow})` : '');
                        
                        let leftover = rawDate.substring(matchShort[0].length).replace(/^[\s.]+/, '').trim();
                        if (leftover) finalTitle = leftover + (finalTitle ? '. ' + finalTitle : '');
                    }
                }

                finalTitle = finalTitle.replace(/^[\s.]+/, '');
                return { ...service, dateObj, displayDate, finalTitle };
            });

            const upcomingServices = parsedServices.filter(service => {
                if (service.dateObj) {
                    return service.dateObj >= now;
                }
                return true; 
            });

            // ИЗМЕНЕНО: сначала показываем только 2 ближайшие даты, остальное — по кнопке «Показать ещё»
            const INITIAL_COUNT = 2;

            function renderList(items) {
                list.innerHTML = '';
                if (items.length === 0) {
                    list.innerHTML = '<li style="text-align: center; padding: 15px 0;">Ближайшие службы уточняются.</li>';
                    return;
                }
                items.forEach(service => {
                    const li = document.createElement('li');
                    
                    // ДОБАВЛЕНО: подсветка престольных праздников
                    if (isPatronalFeast(service.finalTitle) || isPatronalFeast(service.title)) {
                        li.classList.add('patronal');
                    }
                    
                    let eventsHTML = '';
                    if (service.events && service.events.length > 0) {
                        eventsHTML = service.events.map(ev => `<div style="margin-bottom: 8px;"><strong>${escapeHtml(ev.time)}</strong> — ${escapeHtml(ev.name)}</div>`).join('');
                    } else {
                        eventsHTML = `<div style="margin-bottom: 8px;"><strong>${escapeHtml(service.time || '')}</strong> ${service.desc ? '— ' + escapeHtml(service.desc) : ''}</div>`;
                    }

                    // ДОБАВЛЕНО: экранирование через escapeHtml() — защита от XSS
                    li.innerHTML = `
                        <div class="schedule-header">${escapeHtml(service.displayDate)}${service.finalTitle ? '. ' + escapeHtml(service.finalTitle) : ''}</div>
                        <div class="schedule-details">${eventsHTML}</div>
                    `;
                    list.appendChild(li);
                });
            }

            renderList(upcomingServices.slice(0, INITIAL_COUNT));

            // ДОБАВЛЕНО: кнопка «Показать ещё» — раскрывает остальные ближайшие службы целиком
            const moreWrap = document.getElementById('schedule-more-wrap');
            const moreBtn = document.getElementById('schedule-more-btn');
            if (moreWrap && moreBtn) {
                if (upcomingServices.length > INITIAL_COUNT) {
                    moreWrap.style.display = 'block';
                    moreBtn.addEventListener('click', function() {
                        renderList(upcomingServices);
                        moreWrap.style.display = 'none';
                    }, { once: true });
                } else {
                    moreWrap.style.display = 'none';
                }
            }
        }

        Papa.parse(scheduleCsvUrl, {
            download: true,
            header: true,
            encoding: 'UTF-8',
            complete: function(results) {
                const data = results.data;
                const servicesMap = new Map();
                
                data.forEach(row => {
                    if(!row['Дата'] || !row['Время']) return;
                    
                    const dateKey = row['Дата'];
                    if(!servicesMap.has(dateKey)) {
                        servicesMap.set(dateKey, { date: dateKey, title: row['Праздник'] || "", events: [] });
                    }
                    servicesMap.get(dateKey).events.push({ time: row['Время'], name: row['Служба'] });
                });
                
                const servicesArray = Array.from(servicesMap.values());
                renderSchedule(servicesArray, "+7 (924) 458-88-78");
            },
            error: function(err) {
                console.error(err);
                document.getElementById('schedule-list').innerHTML = '<li style="text-align:center;">Расписание уточняйте по телефону <a href="tel:+79244588878" style="color: var(--accent); font-weight: bold;">+7 (924) 458-88-78</a></li>';
            }
        });

        /* ============================================================
           LIGHTBOX — просмотр фото в увеличенном виде
           ============================================================ */
        (function() {
            const galleryImages = document.querySelectorAll('#gallery-grid .gallery-img');
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const lightboxCounter = document.getElementById('lightbox-counter');
            const btnClose = document.getElementById('lightbox-close');
            const btnPrev = document.getElementById('lightbox-prev');
            const btnNext = document.getElementById('lightbox-next');
            let currentIndex = 0;

            function show(index) {
                currentIndex = (index + galleryImages.length) % galleryImages.length;
                const img = galleryImages[currentIndex];
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightboxCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            function close() {
                lightbox.classList.remove('active');
                document.body.style.overflow = '';
            }

            galleryImages.forEach((img, i) => {
                img.addEventListener('click', () => show(i));
            });
            btnClose.addEventListener('click', close);
            btnPrev.addEventListener('click', (e) => { e.stopPropagation(); show(currentIndex - 1); });
            btnNext.addEventListener('click', (e) => { e.stopPropagation(); show(currentIndex + 1); });
            lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
            document.addEventListener('keydown', (e) => {
                if (!lightbox.classList.contains('active')) return;
                if (e.key === 'Escape') close();
                if (e.key === 'ArrowLeft') show(currentIndex - 1);
                if (e.key === 'ArrowRight') show(currentIndex + 1);
            });
        })();

        /* ============================================================
           ЛЕНИВАЯ ЗАГРУЗКА КАРТЫ — iframe подгружается по клику
           ============================================================ */
        (function() {
            const placeholder = document.getElementById('map-placeholder');
            const showBtn = document.getElementById('map-show-btn');
            if (!placeholder) return;
            
            function loadMap() {
                const iframe = document.createElement('iframe');
                iframe.src = "https://yandex.ru/map-widget/v1/?ll=118.826725%2C52.883713&mode=search&text=Забайкальский%20край%2C%20Сретенский%20район%2C%20пгт.%20Усть-Карск%2C%20ул.%20Партизанская%2C%201&z=16";
                iframe.width = "100%";
                iframe.height = "400";
                iframe.frameBorder = "0";
                iframe.allowFullscreen = true;
                iframe.style.display = "block";
                iframe.title = "Карта расположения Никольского храма";
                placeholder.replaceWith(iframe);
                // ДОБАВЛЕНО: кнопка снизу больше не нужна, раз карта уже показана
                if (showBtn) showBtn.remove();
            }
            
            placeholder.addEventListener('click', loadMap);
            placeholder.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadMap(); }
            });
            if (showBtn) showBtn.addEventListener('click', loadMap);
        })();
    