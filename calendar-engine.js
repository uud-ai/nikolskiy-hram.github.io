// calendar-engine.js

/**
 * Загружает JSON-файл (например, pascha-dates.json или ordinary-cycle.json)
 */
async function loadJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Не удалось загрузить ${url}`);
    return await response.json();
  } catch (error) {
    console.error("Ошибка загрузки данных календаря:", error);
    return null;
  }
}

/**
 * Вычисляет рядовые чтения на конкретную дату (JavaScript Date)
 */
export async function getReadingsForDate(targetDate = new Date()) {
  const year = targetDate.getFullYear();
  
  // 1. Загружаем справочник дат Пасхи
  const paschaData = await loadJson('pascha-dates.json');
  if (!paschaData || !paschaData[year]) {
    console.warn(`Дата Пасхи для ${year} года не найдена в pascha-dates.json`);
    return null;
  }

  const paschaDateStr = paschaData[year].date; // Например, "2026-04-12"
  const paschaDate = new Date(paschaDateStr);
  
  // Пятидесятница — это Пасха + 49 дней
  const pentecostDate = new Date(paschaDate);
  pentecostDate.setDate(pentecostDate.getDate() + 49);

  // Сравниваем целевую дату с Пятидесятницей
  const diffTime = targetDate.getTime() - pentecostDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Если дата раньше Пятидесятницы, но после Пасхи — это период Пасхи (pascha_period)
  // Если прошло 0 или больше дней — это период Пятидесятницы (pentecost_period)
  
  if (diffDays < 0) {
    // Период от Пасхи до Пятидесятницы
    // (здесь можно подключить логику pascha_period, если потребуется)
    return { period: "pascha_period", message: "Период Пятидесятницы еще не наступил" };
  }

  // Вычисляем номер недели (седмицы) и день недели (0 - вс, 1 - пн, ..., 6 - сб)
  const weekNumber = Math.floor(diffDays / 7) + 1;
  const jsDayOfWeek = targetDate.getDay();
  
  // Маппинг дней недели под ключи в нашем ordinary-cycle.json (mon..sun)
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = dayKeys[jsDayOfWeek];

  // 2. Загружаем вечный устав чтений ordinary-cycle.json
  const cycleData = await loadJson('ordinary-cycle.json');
  if (!cycleData || !cycleData.pentecost_period) {
    return null;
  }

  const periodWeeks = cycleData.pentecost_period;

  // Проверяем, существует ли такая неделя и день в нашей базе
  if (periodWeeks[weekNumber] && periodWeeks[weekNumber][dayKey]) {
    return {
      week: weekNumber,
      day: dayKey,
      readings: periodWeeks[weekNumber][dayKey],
      note: periodWeeks[weekNumber].sun?.note || ''
    };
  }

  return {
    week: weekNumber,
    day: dayKey,
    readings: null,
    note: "Рядовое чтение не найдено (возможно, праздничный день)"
  };
}