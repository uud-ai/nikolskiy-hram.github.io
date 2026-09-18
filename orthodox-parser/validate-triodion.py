#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Cross-check every extracted apostle/gospel ref in triodion-cycle.json
against the day's raw `refs` array (English book codes) from
orthodox-readings-2024.json, to catch extraction bugs (wrong book, garbled
verse range, etc.)."""
import json
import re
import datetime

CYR_TO_ENG = {
    "Мф": "Mt", "Мк": "Mk", "Лк": "Lk", "Ин": "Jn",
    "Деян": "Acts", "Рим": "Rom", "1Кор": "1Cor", "2Кор": "2Cor",
    "Гал": "Gal", "Еф": "Eph", "Флп": "Phil", "Кол": "Col", "Евр": "Hebr",
    "Иак": "Jas", "1Пет": "1Pet", "2Пет": "2Pet",
    "1Ин": "1Jn", "2Ин": "2Jn", "3Ин": "3Jn", "Иуд": "Jude",
    "1Тим": "1Tim", "2Тим": "2Tim", "Тит": "Titus", "Флм": "Phlm",
    "1Сол": "1Thess", "2Сол": "2Thess",
}

PASCHA_2024 = datetime.date(2024, 5, 5)


def ref_to_key(ref):
    m = re.match(r'^([0-9]?[А-ЯЁа-яё]+)\.(.+)$', ref)
    if not m:
        return None
    book, rest = m.group(1), m.group(2)
    eng = CYR_TO_ENG.get(book)
    if not eng:
        return None
    return eng + '.' + rest.replace('-', '')  # normalize for loose compare


def normalize_engref(r):
    return r.replace('-', '').replace(' ', '')


def main():
    raw = json.load(open('orthodox-readings-2024.json', encoding='utf-8'))
    tri = json.load(open('../reading-data/triodion-cycle.json', encoding='utf-8'))

    problems = []
    checked = 0

    def check(bp, entry, label):
        nonlocal checked
        if not entry:
            return
        date = PASCHA_2024 - datetime.timedelta(days=bp)
        key = date.isoformat()
        day_refs = (raw.get(key) or {}).get('refs') or []
        day_refs_norm = [normalize_engref(r) for r in day_refs]
        for field in ('apostle', 'gospel'):
            ref = entry.get(field)
            if not ref:
                continue
            checked += 1
            eng_key = ref_to_key(ref)
            if eng_key is None:
                problems.append((bp, label, field, ref, 'unmapped book'))
                continue
            eng_key_norm = normalize_engref(eng_key)
            # loose containment check: book code + chapter should appear among day's refs
            book_prefix = eng_key_norm.split(':')[0]
            alt_prefix = book_prefix.replace('Jude', 'Juda') if 'Jude' in book_prefix else None
            found = any(er.startswith(book_prefix) or (alt_prefix and er.startswith(alt_prefix)) for er in day_refs_norm)
            if not found:
                problems.append((bp, label, field, ref, 'NOT FOUND in day refs: %s' % day_refs))

    for w_str, week in tri['triodion_period'].items():
        w = int(w_str)
        for wd, entry in week.items():
            weekday_keys_rev = ['sun', 'sat', 'fri', 'thu', 'wed', 'tue', 'mon']
            k = weekday_keys_rev.index(wd)
            bp = w * 7 + k if k != 0 else w * 7
            # reconstruct bp properly: sun->bp=7w, sat->7w+1, fri->7w+2, thu->7w+3, wed->7w+4, tue->7w+5, mon->7w+6
            offset_map = {'sun': 0, 'sat': 1, 'fri': 2, 'thu': 3, 'wed': 4, 'tue': 5, 'mon': 6}
            bp = w * 7 + offset_map[wd]
            check(bp, entry, 'triodion w=%s %s' % (w_str, wd))

    holy_offset = {'sat': 1, 'fri': 2, 'thu': 3, 'wed': 4, 'tue': 5, 'mon': 6}
    for wd, entry in tri['holy_week'].items():
        check(holy_offset[wd], entry, 'holy_week %s' % wd)

    print('Checked %d refs' % checked)
    if problems:
        print('PROBLEMS FOUND: %d' % len(problems))
        for p in problems:
            print(p)
    else:
        print('No problems found.')


if __name__ == '__main__':
    main()
