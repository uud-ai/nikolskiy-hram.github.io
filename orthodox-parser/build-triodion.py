#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Строит reading-data/triodion-cycle.json (Постная Триодь: от Недели о мытаре
и фарисее до конца Страстной седмицы) из сырого скрейпа
orthodox-readings-2024.json (azbyka.ru), используя Пасху 2024 года
(5 мая 2024) как точку отсчёта.

Нумерация не зависит от календарной даты, а только от расстояния в днях
до Пасхи — поэтому один год скрейпа покрывает Триодь для ЛЮБОГО года,
как и уже существующий pentecost_period в ordinary-cycle.json.

Схема (bp = "дней до Пасхи"):
  bp 1..6   -> holy_week: Великие Пн..Сб (у каждого дня уникальные чтения,
               не встраиваются в общую недельную сетку)
  bp 7..70  -> triodion_period[w] (w = 1..10), где w = bp // 7 (при bp % 7 == 0
               день — воскресенье этой недели, иначе будний день перед ним);
               w=1 -> Неделя ваий (Вход Господень), ... w=10 -> Неделя о мытаре
               и фарисее (начало Триоди)
"""
import json
import re
import datetime

PASCHA_2024 = datetime.date(2024, 5, 5)

APOSTLE_BOOKS = r'Рим|1Кор|2Кор|Гал|Еф|Флп|Кол|1Сол|2Сол|1Тим|2Тим|Тит|Флм|Евр|Иак|1Пет|2Пет|1Ин|2Ин|3Ин|Иуд|Деян'
GOSPEL_BOOKS = r'Мф|Мк|Лк|Ин|Матф|Марк|Лук|Иоан'

APOSTLE_RE = re.compile(r'(?<!\d)((?:%s)\.? ?[0-9:,;\-–—]+)(?:[^(]*\(([^)]*?(\d+)[^)]*)\))?' % APOSTLE_BOOKS, re.IGNORECASE)
GOSPEL_RE = re.compile(r'(?<!\d)((?:%s)\.? ?[0-9:,;\-–—]+)(?:[^(]*\(([^)]*?(\d+)[^)]*)\))?' % GOSPEL_BOOKS, re.IGNORECASE)

WEEKDAY_KEYS_REV = ['sun', 'sat', 'fri', 'thu', 'wed', 'tue', 'mon']  # index = bp % 7
HOLY_KEYS = ['sat', 'fri', 'thu', 'wed', 'tue', 'mon']  # index = bp - 1, for bp 1..6

SUNDAY_NOTES = {
    1: "Неделя ваий (Вход Господень в Иерусалим, Вербное воскресенье)",
    2: "Неделя 5-я Великого поста, прп. Марии Египетской",
    3: "Неделя 4-я Великого поста, прп. Иоанна Лествичника",
    4: "Неделя 3-я, Крестопоклонная",
    5: "Неделя 2-я Великого поста, свт. Григория Паламы",
    6: "Неделя 1-я Великого поста, Торжество Православия",
    7: "Неделя сыропустная (Прощёное воскресенье), Воспоминание Адамова изгнания",
    8: "Неделя мясопустная, о Страшном Суде",
    9: "Неделя о блудном сыне",
    10: "Неделя о мытаре и фарисее",
}
WEEK_NOTES = {
    1: "Страстная седмица (Лазарева суббота — сб)",
    2: "5-я седмица Великого поста",
    3: "4-я седмица Великого поста",
    4: "3-я седмица Великого поста (Крестопоклонная)",
    5: "2-я седмица Великого поста",
    6: "1-я седмица Великого поста",
    7: "Сырная седмица (масленица)",
    8: "Мясопустная седмица",
    9: "Седмица о блудном сыне",
    10: "Седмица о мытаре и фарисее (сплошная, без поста в среду и пятницу)",
}
HOLY_DAY_NAMES = {
    'mon': "Великий Понедельник", 'tue': "Великий Вторник", 'wed': "Великая Среда",
    'thu': "Великий Четверг (Тайная Вечеря)", 'fri': "Великая Пятница", 'sat': "Великая Суббота",
}


def clean_ref(raw):
    raw = raw.replace('–', '-').replace('—', '-').replace(' ', '')
    return raw.rstrip('.,;')


def strip_html(html):
    text = html.replace('&ndash;', '-').replace('&mdash;', '-')
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)
    return text


def extract_reading(lit_text):
    entry = {}
    m = APOSTLE_RE.search(lit_text)
    if m:
        entry['apostle'] = clean_ref(m.group(1))
        if m.group(3):
            entry['apostle_zachalo'] = int(m.group(3))
    m = GOSPEL_RE.search(lit_text)
    if m:
        entry['gospel'] = clean_ref(m.group(1))
        if m.group(3):
            entry['gospel_zachalo'] = int(m.group(3))
    return entry


def get_lit_text(html):
    text = strip_html(html)
    idx = text.find('Лит.')
    if idx != -1:
        text = text[idx:]
    # Если в этот день выпадает подвижный праздник (например, Благовещение
    # на Крестопоклонную), сайт azbyka сначала даёт чтение праздника, а
    # затем настоящее рядовое (для триодного круга) чтение — после метки
    # "Ряд.". Нам нужно именно рядовое, иначе таблица по неделям окажется
    # заражена случайным совпадением праздника с этим годом (2024).
    ryad_idx = text.find('Ряд.')
    if ryad_idx != -1:
        text = text[ryad_idx:]
    return text


def main():
    with open('orthodox-readings-2024.json', encoding='utf-8') as f:
        raw = json.load(f)

    holy_week = {}
    triodion_period = {str(w): {} for w in range(1, 11)}

    for bp in range(1, 71):
        date = PASCHA_2024 - datetime.timedelta(days=bp)
        key = date.isoformat()
        day_data = raw.get(key)
        html = (day_data or {}).get('html') or ''

        if bp <= 6:
            weekday = HOLY_KEYS[bp - 1]
            if bp == 2:
                # Великая Пятница: Литургии в этот день не бывает (день
                # аминистический); есть только чтения часов/вечерни, и они
                # составные (охватывают все 4 Евангелия) — в формат сайта
                # (один Апостол + одно Евангелие) не укладываются.
                holy_week[weekday] = {
                    'note': HOLY_DAY_NAMES[weekday] + " — Литургия не совершается; чтения Царских часов и вечерни составные (не отображаются)"
                }
                continue
            lit_text = get_lit_text(html)
            entry = extract_reading(lit_text)
            if bp == 3:
                # Великий Четверг: Апостол читается один (1Кор.11:23-32), а
                # Евангелие на Литургии составное (Мф+Ин+Лк вперемешку) —
                # показываем только Апостол, Евангелие не укладывается в
                # формат "один отрывок одной книги".
                entry.pop('gospel', None)
                entry.pop('gospel_zachalo', None)
            entry['note'] = HOLY_DAY_NAMES[weekday]
            holy_week[weekday] = entry
            continue

        w = bp // 7
        weekday = WEEKDAY_KEYS_REV[bp % 7]
        lit_text = get_lit_text(html)
        entry = extract_reading(lit_text)
        if not entry:
            triodion_period[str(w)][weekday] = None
            continue
        if weekday == 'sun':
            entry['note'] = SUNDAY_NOTES[w]
        triodion_period[str(w)][weekday] = entry

    for w in range(1, 11):
        wk = triodion_period[str(w)]
        for wd in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']:
            wk.setdefault(wd, None)

    output = {
        "_comment": (
            "Постная Триодь: рядовые чтения от Недели о мытаре и фарисее до конца "
            "Страстной седмицы. Ключ в triodion_period — 'моя' неделя, отсчитанная "
            "НАЗАД от Пасхи (w=1 — неделя, кончающаяся Вербным воскресеньем; w=10 — "
            "неделя, кончающаяся Неделей о мытаре и фарисее). Каждая неделя — будни "
            "(mon..sat) перед воскресеньем, которым она заканчивается (sun). "
            "holy_week — Страстная седмица (Пн..Сб), особые для каждого дня чтения, "
            "вне общей недельной сетки. Будни Великого поста в большинстве своём "
            "не имеют Апостола/Евангелия на Литургии (положены только чтения "
            "Ветхого Завета на часах/вечерне для Литургии Преждеосвященных Даров) — "
            "это не пробел в данных, а особенность устава, поэтому такие дни null."
        ),
        "_coverage": {
            "source": "azbyka.ru, скрейп на 2024 год (см. orthodox-parser/orthodox-readings-2024.json), Пасха 2024 = 2024-05-05",
            "known_limitations": [
                "Великая Пятница (holy_week.fri): Литургии не бывает, чтения часов составные — не показываются, только note.",
                "Великий Четверг (holy_week.thu): Евангелие на Литургии составное (Мф+Ин+Лк) — не показывается, только Апостол.",
                "zachalo не всегда извлечён (нестандартный формат подписи в источнике) — это не влияет на текст, только на пометку 'зач. N'."
            ]
        },
        "triodion_period": triodion_period,
        "holy_week": holy_week,
    }

    with open('../reading-data/triodion-cycle.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print('OK, written reading-data/triodion-cycle.json')


if __name__ == '__main__':
    main()
