import { promises as fs } from 'fs';

const INPUT_FILE = 'orthodox-readings-2024.json';
const OUTPUT_FILE = 'pentecost-cycle-generated.json';

// Отправная точка — Пятидесятница 2024 года
const PENTECOST_2024 = new Date('2024-06-23T12:00:00Z');

const APOSTLE_BOOKS = 'Рим|1Кор|2Кор|Гал|Еф|Флп|Кол|1Сол|2Сол|1Тим|2Тим|Тит|Флм|Евр|Иак|1Пет|2Пет|1Ин|2Ин|3Ин|Иуд|Деян';
const GOSPEL_BOOKS = 'Мф|Мк|Лк|Ин|Матф|Марк|Лук|Иоан';

// Регулярки теперь игнорируют порядок слов в скобках и ловят любые виды тире (-–—)
const apostleRegex = new RegExp(`((${APOSTLE_BOOKS})\\. ?[0-9:,;\\-–—]+)(?:[^(]*\\([^)]*?([0-9]+)[^)]*\\))?`, 'i');
const gospelRegex = new RegExp(`((${GOSPEL_BOOKS})\\. ?[0-9:,;\\-–—]+)(?:[^(]*\\([^)]*?([0-9]+)[^)]*\\))?`, 'i');

const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function transformData() {
  console.log('Очистка сырых данных и сборка дерева...');
  const rawData = JSON.parse(await fs.readFile(INPUT_FILE, 'utf-8'));

  const pentecostPeriod: Record<string, any> = {};

  for (let daysSincePentecost = 1; daysSincePentecost <= 32 * 7; daysSincePentecost++) {
    const targetDate = new Date(PENTECOST_2024);
    targetDate.setDate(targetDate.getDate() + daysSincePentecost);

    const dateString = targetDate.toISOString().split('T')[0];
    const dayData = rawData[dateString];

    if (!dayData || !dayData.html) continue;

    const weekNumber = Math.floor((daysSincePentecost - 1) / 7) + 1;
    const dayName = daysOfWeek[targetDate.getDay()];

    if (!pentecostPeriod[weekNumber]) {
      pentecostPeriod[weekNumber] = {};
    }

    // 1. Очищаем HTML: спасаем тире, удаляем теги, убираем пробелы
    let plainText = dayData.html.replace(/&ndash;|&mdash;/gi, '-');
    plainText = plainText.replace(/<[^>]+>/gi, '');
    plainText = plainText.replace(/&[a-z]+;/gi, ' ');

    // 2. Отсекаем чтения Утрени, чтобы искать только Литургию
    let litText = plainText;
    const litIndex = plainText.indexOf('Лит.');
    if (litIndex !== -1) {
      litText = plainText.substring(litIndex);
    }

    const apostleMatch = litText.match(apostleRegex);
    const gospelMatch = litText.match(gospelRegex);

    const readingEntry: any = {};

    if (apostleMatch) {
      // Стандартизируем вывод: убираем пробелы и меняем любые тире на обычный дефис
      readingEntry.apostle = apostleMatch[1].replace(/ /g, '').replace(/[–—]/g, '-');
      if (apostleMatch[3]) {
        readingEntry.apostle_zachalo = parseInt(apostleMatch[3], 10);
      }
    }

    if (gospelMatch) {
      readingEntry.gospel = gospelMatch[1].replace(/ /g, '').replace(/[–—]/g, '-');
      if (gospelMatch[3]) {
        readingEntry.gospel_zachalo = parseInt(gospelMatch[3], 10);
      }
    }

    if (readingEntry.apostle || readingEntry.gospel) {
      pentecostPeriod[weekNumber.toString()][dayName] = readingEntry;
    }
  }

  const finalOutput = { pentecost_period: pentecostPeriod };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2), 'utf-8');
  console.log(`\nГотово! Результат сохранен в ${OUTPUT_FILE}`);
}

transformData().catch(console.error);