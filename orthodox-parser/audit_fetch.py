#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Fetch azbyka.ru raw day data for every (week, weekday) cell in
ordinary-cycle.json's pentecost_period, for a given reference year's
Pentecost date, and cache to audit/<year>/<date>.json."""
import urllib.request, json, time, datetime, sys, os

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json'}
WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def fetch_day(date_str, out_dir):
    out_path = os.path.join(out_dir, date_str + '.json')
    if os.path.exists(out_path):
        return
    url = 'https://azbyka.ru/days/api/day/%s.json' % date_str
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        with open(out_path, 'wb') as f:
            f.write(data)
        print('OK', date_str)
    except Exception as e:
        print('ERR', date_str, e)
    time.sleep(0.4)


def main():
    pentecost_str = sys.argv[1]  # e.g. 2025-06-08
    out_dir = sys.argv[2]
    max_week = int(sys.argv[3]) if len(sys.argv) > 3 else 28
    sundays_only_from = int(sys.argv[4]) if len(sys.argv) > 4 else (max_week + 1)

    os.makedirs(out_dir, exist_ok=True)
    pentecost = datetime.date(*[int(x) for x in pentecost_str.split('-')])

    dates_needed = set()
    for w in range(1, max_week + 1):
        for wd in WEEKDAY_KEYS:
            idx = WEEKDAY_KEYS.index(wd)
            dsp = (w - 1) * 7 + idx + 1
            d = pentecost + datetime.timedelta(days=dsp)
            dates_needed.add(d.isoformat())
    for w in range(sundays_only_from, sundays_only_from + 4):
        dsp = w * 7
        d = pentecost + datetime.timedelta(days=dsp)
        dates_needed.add(d.isoformat())

    for d in sorted(dates_needed):
        fetch_day(d, out_dir)

    print('TOTAL:', len(dates_needed))


if __name__ == '__main__':
    main()
