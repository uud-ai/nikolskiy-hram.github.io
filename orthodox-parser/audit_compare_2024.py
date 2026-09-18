#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Compare ordinary-cycle.json's pentecost_period against the already-scraped
orthodox-readings-2024.json (Pentecost 2024 = 2024-06-23), which appears to be
the actual source year the table was built from."""
import json
import re
import datetime

APOSTLE_BOOKS = r'Рим|1Кор|2Кор|Гал|Еф|Флп|Кол|1Сол|2Сол|1Тим|2Тим|Тит|Флм|Евр|Иак|1Пет|2Пет|1Ин|2Ин|3Ин|Иуд|Деян'
GOSPEL_BOOKS = r'Мф|Мк|Лк|Ин|Матф|Марк|Лук|Иоан'
APOSTLE_RE = re.compile(r'(?<!\d)((?:%s)\.? ?[0-9:,;\-–—]+)(?:[^(]*\(([^)]*?(\d+)[^)]*)\))?' % APOSTLE_BOOKS, re.IGNORECASE)
GOSPEL_RE = re.compile(r'(?<!\d)((?:%s)\.? ?[0-9:,;\-–—]+)(?:[^(]*\(([^)]*?(\d+)[^)]*)\))?' % GOSPEL_BOOKS, re.IGNORECASE)
WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
PENTECOST_2024 = datetime.date(2024, 6, 23)


def clean_ref(raw):
    raw = raw.replace('–', '-').replace('—', '-').replace(' ', '')
    return raw.rstrip('.,;')


def strip_html(html):
    text = html.replace('&ndash;', '-').replace('&mdash;', '-')
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)
    return text


def get_lit_text(html):
    text = strip_html(html)
    idx = text.find('Лит.')
    if idx != -1:
        text = text[idx:]
    r = text.find('Ряд.')
    had_ryad = r != -1
    if had_ryad:
        text = text[r:]
    return text, had_ryad


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


def main():
    raw = json.load(open('orthodox-readings-2024.json', encoding='utf-8'))
    cycle = json.load(open('../reading-data/ordinary-cycle.json', encoding='utf-8'))
    pp = cycle['pentecost_period']

    mismatches = []
    checked = 0
    max_dsp = (datetime.date(2024, 12, 31) - PENTECOST_2024).days  # 191 -> week 28

    for w in range(1, 33):
        for wd in WEEKDAY_KEYS:
            idx = WEEKDAY_KEYS.index(wd)
            dsp = (w - 1) * 7 + idx + 1
            if dsp > max_dsp:
                continue  # out of range of the 2024 scrape
            date = PENTECOST_2024 + datetime.timedelta(days=dsp)
            stored = (pp.get(str(w)) or {}).get(wd)
            if stored is None:
                continue  # nothing to compare (documented gap, e.g. weeks 29-32 weekdays)
            day_data = raw.get(date.isoformat())
            checked += 1
            if not day_data or not day_data.get('html'):
                mismatches.append((w, wd, date.isoformat(), stored, 'NO DATA', None))
                continue
            lit_text, had_ryad = get_lit_text(day_data['html'])
            live = extract_reading(lit_text)
            if stored.get('apostle') != live.get('apostle') or stored.get('gospel') != live.get('gospel'):
                mismatches.append((w, wd, date.isoformat(), stored, live, had_ryad))

    print('Checked %d cells, %d mismatches' % (checked, len(mismatches)))
    out = [{'week': w, 'weekday': wd, 'date': d, 'stored': s, 'live': l, 'had_ryad': r}
           for w, wd, d, s, l, r in mismatches]
    json.dump(out, open('audit_mismatches_2024.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('written audit_mismatches_2024.json')


if __name__ == '__main__':
    main()
