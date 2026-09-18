import { promises as fs } from 'fs';

const YEAR = 2024;
const DELAY_MS = 800; // Немного ускорили паузу
const OUTPUT_FILE = `orthodox-readings-${YEAR}.json`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getDatesForYear(year: number): string[] {
  const dates: string[] = [];
  let currentDate = new Date(`${year}-01-01T12:00:00Z`);
  
  while (currentDate.getFullYear() === year) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

async function parseOrthodoxCalendar() {
  console.log(`Начинаем чистовой сбор чтений на ${YEAR} год...`);
  const dates = getDatesForYear(YEAR);
  const resultData: Record<string, any> = {};

  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];
    process.stdout.write(`\r[${i + 1}/${dates.length}] Загрузка: ${dateStr}`);

    try {
      const response = await fetch(`https://azbyka.ru/days/api/day/${dateStr}.json`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      const text = await response.text();
      const data = JSON.parse(text);
      
      // Ищем блок с чтениями (обычно type === 1)
      const readingsBlock = data?.texts?.find((t: any) => t.type === 1);

      if (readingsBlock) {
        resultData[dateStr] = {
          html: readingsBlock.text, // Сырой текст (для номеров зачал и русского перевода)
          refs: readingsBlock.refs || [] // Массив ссылок [Rom, Mt...]
        };
      } else {
        resultData[dateStr] = null; // Чтений нет (например, особые дни)
      }

    } catch (error: any) {
      resultData[dateStr] = { error: "Не удалось загрузить" };
    }

    await delay(DELAY_MS);
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(resultData, null, 2), 'utf-8');
  console.log(`\n\nГотово! База сохранена в ${OUTPUT_FILE}`);
}

parseOrthodoxCalendar();