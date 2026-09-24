# build_calendar_names.py
#
# Строит JSON-файл с названиями церковных праздников и памятей святых
# на каждый гражданский день года — без указаний чтений Писания.
#
# Источник: официальный API патриархия.ru (api.patriarchia.ru/v1/events/{дата}).
# API принимает дату по СТАРОМУ СТИЛЮ (юлианский календарь). Разница между
# новым и старым стилем в 1900–2099 гг. постоянна и равна 13 дням, поэтому
# церковная (старостильная) дата = гражданская дата минус 13 дней.
#
# Использование:
#   python build_calendar_names.py --from 2026-01-01 --to 2026-12-31 --out ../calendar-names.json
#
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

API_BASE = "https://api.patriarchia.ru/v1/events"
OLD_STYLE_OFFSET_DAYS = 13

HEADERS = {
    "User-Agent": "ParishCalendarParser/1.0 (+https://nikolskiyhram.site/)",
    "Accept": "application/json",
}

# Классы параграфов/блоков, которые НЕ являются названиями праздников/святых
# (указания на чтения Писания и богослужебные примечания) — исключаем их.
EXCLUDED_CLASSES = {"reading", "m-note", "notes"}


def parse_iso_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def extract_names(calendar_text: str) -> list[str]:
    """Извлекает только названия праздников/памятей святых из calendar_text,
    отбрасывая чтения Писания и богослужебные примечания."""

    if not calendar_text:
        return []

    soup = BeautifulSoup(calendar_text, "html.parser")

    # Удаляем блоки, не относящиеся к названиям (чтения, примечания).
    selector = ", ".join(f".{cls}" for cls in EXCLUDED_CLASSES)
    for tag in soup.select(selector):
        tag.decompose()

    names: list[str] = []
    for p in soup.find_all("p"):
        text = p.get_text(" ", strip=True)
        text = " ".join(text.split())
        if text:
            names.append(text)

    return names


def fetch_names_for_civil_date(
    session: requests.Session, civil_date: date
) -> list[str]:
    church_date = civil_date - timedelta(days=OLD_STYLE_OFFSET_DAYS)
    url = f"{API_BASE}/{church_date.isoformat()}"

    response = session.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    payload = response.json()

    return extract_names(payload.get("calendar_text", ""))


def daterange(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Строит JSON с названиями церковных праздников/святых по дням года"
    )
    parser.add_argument("--from", dest="date_from", required=True, help="Первая дата YYYY-MM-DD")
    parser.add_argument("--to", dest="date_to", required=True, help="Последняя дата YYYY-MM-DD")
    parser.add_argument("--out", dest="out_path", required=True, help="Путь к выходному JSON-файлу")
    parser.add_argument("--delay", type=float, default=1.0, help="Задержка между запросами, сек.")
    args = parser.parse_args()

    date_from = parse_iso_date(args.date_from)
    date_to = parse_iso_date(args.date_to)

    if date_from > date_to:
        print("Ошибка: --from должна быть раньше --to", file=sys.stderr)
        return 1

    out_path = Path(args.out_path)

    result: dict[str, list[str]] = {}
    if out_path.exists():
        try:
            result = json.loads(out_path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            result = {}

    session = requests.Session()

    total = (date_to - date_from).days + 1
    done = 0
    errors: list[str] = []

    skipped_empty = 0

    for civil_date in daterange(date_from, date_to):
        key = civil_date.isoformat()
        done += 1

        try:
            names = fetch_names_for_civil_date(session, civil_date)
            if names:
                result[key] = names
                print(f"[{done}/{total}] {key}: {len(names)} блок(ов)")
            else:
                # patriarchia.ru публикует календарь не на весь год вперёд разом,
                # а постепенно — пустой ответ значит "данных пока нет", а не
                # "праздников в этот день нет". Не затираем этим ключ, если он
                # уже был заполнен в прошлом запуске.
                skipped_empty += 1
                print(f"[{done}/{total}] {key}: данных пока нет на источнике, пропуск")
        except Exception as exc:
            errors.append(f"{key}: {exc}")
            print(f"[{done}/{total}] {key}: ОШИБКА — {exc}", file=sys.stderr)

        time.sleep(args.delay)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    print()
    print(f"Готово. Дней обработано: {total}. Пропущено (нет данных): {skipped_empty}. Ошибок: {len(errors)}.")
    print(f"Файл: {out_path}")

    if errors:
        print()
        print("Список ошибок:")
        for err in errors:
            print(f"  {err}")

    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
