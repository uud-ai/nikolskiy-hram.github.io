// Порт src/cycle.py: определение положения даты в подвижном годовом круге
// чтений. Дату Пасхи не вычисляем сами — берём из reading-data/pascha-dates.json.
// Дальше только арифметика дат: Пятидесятница = Пасха + 49 дней, Неделя N по
// Пятидесятнице = Пятидесятница + 7N дней, седмица N — шесть будних дней перед ней.
// Постная Триодь (см. reading-data/triodion-cycle.json) считается симметрично,
// но НАЗАД от ближайшей будущей Пасхи: 70 дней до неё — Неделя о мытаре и
// фарисее (начало Триоди), последние 6 — Страстная седмица (holy_week).

var LiturgicalCycle = (function () {
    var WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    var WEEKDAY_KEYS_REV = ["sun", "sat", "fri", "thu", "wed", "tue", "mon"]; // индекс = bp % 7
    var HOLY_WEEK_KEYS = ["sat", "fri", "thu", "wed", "tue", "mon"]; // индекс = bp - 1, для bp 1..6

    function addDays(date, n) {
        var d = new Date(date.getTime());
        d.setDate(d.getDate() + n);
        return d;
    }

    function daysBetween(a, b) {
        // a, b — Date в полночь локального времени
        return Math.round((b.getTime() - a.getTime()) / 86400000);
    }

    function paschaCandidates(paschaDates) {
        var candidates = [];
        for (var key in paschaDates) {
            if (!paschaDates.hasOwnProperty(key) || key.charAt(0) === '_') continue;
            candidates.push(new Date(paschaDates[key].date + 'T00:00:00'));
        }
        candidates.sort(function (a, b) { return a - b; });
        return candidates;
    }

    function pickPascha(day, paschaDates) {
        var candidates = paschaCandidates(paschaDates);
        var chosen = null;
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] <= day) chosen = candidates[i]; else break;
        }
        return chosen;
    }

    function pickNextPascha(day, paschaDates) {
        var candidates = paschaCandidates(paschaDates);
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] >= day) return candidates[i];
        }
        return null;
    }

    function resolveTriodionPosition(day, nextPascha) {
        var bp = daysBetween(day, nextPascha); // дней до ближайшей будущей Пасхи
        if (bp < 1 || bp > 70) return null;
        if (bp <= 6) {
            return { period: 'holy_week', weekday: HOLY_WEEK_KEYS[bp - 1] };
        }
        var week = Math.floor(bp / 7);
        var weekday = WEEKDAY_KEYS_REV[bp % 7];
        return { period: 'triodion_period', week: String(week), weekday: weekday };
    }

    function resolveCyclePosition(day, pascha, nextPascha) {
        if (nextPascha) {
            var triodionPos = resolveTriodionPosition(day, nextPascha);
            if (triodionPos) return triodionPos;
        }
        if (!pascha) {
            return { period: 'unresolved' };
        }
        var pentecost = addDays(pascha, 49);

        if (day < pascha) {
            return { period: 'unresolved' };
        }
        if (day >= pascha && day < pentecost) {
            var daysSincePascha = daysBetween(pascha, day);
            if (daysSincePascha === 0) {
                return { period: 'pascha_period', week: 'pascha', weekday: 'sun' };
            }
            // Пасха сама по себе вне нумерации; Неделя 2 (Фомина) — первая
            // пронумерованная неделя, поэтому смещение +2, а не +1.
            var week = Math.floor((daysSincePascha - 1) / 7) + 2;
            var weekday = WEEKDAY_KEYS[(daysSincePascha - 1) % 7];
            return { period: 'pascha_period', week: String(week), weekday: weekday };
        }
        if (daysBetween(pentecost, day) === 0) {
            return { period: 'pascha_period', week: 'pentecost', weekday: 'sun' };
        }
        if (day > pentecost) {
            var daysSincePentecost = daysBetween(pentecost, day);
            var wk = Math.floor((daysSincePentecost - 1) / 7) + 1;
            var wd = WEEKDAY_KEYS[(daysSincePentecost - 1) % 7];
            return { period: 'pentecost_period', week: String(wk), weekday: wd };
        }
        return { period: 'unresolved' };
    }

    return { pickPascha: pickPascha, pickNextPascha: pickNextPascha, resolveCyclePosition: resolveCyclePosition };
})();

if (typeof module !== 'undefined') module.exports = LiturgicalCycle;
