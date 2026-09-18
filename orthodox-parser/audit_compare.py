#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Compare ordinary-cycle.json's pentecost_period entries against freshly
fetched azbyka.ru data for a given reference year (see audit_fetch.py),
report mismatches."""
import json
import re
import os
import sys
import datetime

APOSTLE_BOOKS = r'Рим|1Кор|2Кор|Гал|Еф|Флп|Кол|1Сол|2Сол|1Тим|2Тим|Тит|Флм|Евр|Иак|1Пет|2Пет|1Ин|2Ин|3Ин|Иуд|Деян'
GOSPEL_BOOKS = r'Мф|Мк|Лк|Ин|Матф|Марк|Лук|Иоан'
APOSTLE_RE = re.compile(r'(?<!\d)((?:%s)\.? ?[0-9:,;\-–—]+)(?:[^(]*\(([^)]*?(\d+)[^)]*)\))?' % APOSTLE_BOOKS, re.IGNORECASE)
GOSPEL_RE = re.compile(r'(?<!\d)((?:%s)\.? ?[0-9:,;\-–—]+)(?:[^(]*\(([^)]*?(\d+)[^)]*)\))?' % GOSPEL_BOOKS, re.IGNORECASE)
WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


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
    ryad_idx = text.find('Ряд.')
    if ryad_idx != -1:
        text = text[ryad_idx:]
    return text, (ryad_idx != -1)


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


def get_day_block(raw_json_path):
    if not os.path.exists(raw_json_path):
        return None, None
    with open(raw_json_path, encoding='utf-8') as f:
        data = json.load(f)
    for t in data.get('texts', []):
        if t.get('type') == 1:
            return t.get('text') or '', t.get('refs') or []
    return None, None


def main():
    pentecost_str = sys.argv[1]
    audit_dir = sys.argv[2]
    max_week = int(sys.argv[3]) if len(sys.argv) > 3 else 28
    sundays_only_from = int(sys.argv[4]) if len(sys.argv) > 4 else (max_week + 1)

    pentecost = datetime.date(*[int(x) for x in pentecost_str.split('-')])

    with open('../reading-data/ordinary-cycle.json', encoding='utf-8') as f:
        cycle = json.load(f)
    pp = cycle['pentecost_period']

    mismatches = []
    checked = 0

    def cell_date(w, wd):
        idx = WEEKDAY_KEYS.index(wd)
        dsp = (w - 1) * 7 + idx + 1
        return pentecost + datetime.timedelta(days=dsp)

    weeks_to_check = list(range(1, max_week + 1))
    weekdays_to_check = WEEKDAY_KEYS

    for w in weeks_to_check:
        for wd in weekdays_to_check:
            stored = (pp.get(str(w)) or {}).get(wd)
            date = cell_date(w, wd)
            path = os.path.join(audit_dir, date.isoformat() + '.json')
            html, refs = get_day_block(path)
            checked += 1
            if html is None:
                mismatches.append((w, wd, date.isoformat(), stored, 'NO DATA', None))
                continue
            lit_text, had_ryad = get_lit_text(html)
            live = extract_reading(lit_text)
            stored_ap = (stored or {}).get('apostle')
            stored_go = (stored or {}).get('gospel')
            live_ap = live.get('apostle')
            live_go = live.get('gospel')
            if stored_ap != live_ap or stored_go != live_go:
                mismatches.append((w, wd, date.isoformat(), stored, live, had_ryad))

    for w in range(sundays_only_from, sundays_only_from + 4):
        wd = 'sun'
        stored = (pp.get(str(w)) or {}).get(wd)
        dsp = w * 7
        date = pentecost + datetime.timedelta(days=dsp)
        path = os.path.join(audit_dir, date.isoformat() + '.json')
        html, refs = get_day_block(path)
        checked += 1
        if html is None:
            mismatches.append((w, wd, date.isoformat(), stored, 'NO DATA', None))
            continue
        lit_text, had_ryad = get_lit_text(html)
        live = extract_reading(lit_text)
        stored_ap = (stored or {}).get('apostle')
        stored_go = (stored or {}).get('gospel')
        live_ap = live.get('apostle')
        live_go = live.get('gospel')
        if stored_ap != live_ap or stored_go != live_go:
            mismatches.append((w, wd, date.isoformat(), stored, live, had_ryad))

    print('Checked %d cells, %d mismatches' % (checked, len(mismatches)))
    out = []
    for w, wd, date, stored, live, had_ryad in mismatches:
        out.append({'week': w, 'weekday': wd, 'date': date, 'stored': stored, 'live': live, 'had_ryad': had_ryad})
    with open('audit_mismatches_%s.json' % pentecost_str, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('written audit_mismatches_%s.json' % pentecost_str)


if __name__ == '__main__':
    main()
