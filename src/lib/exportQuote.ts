import { EstimateSummary } from './estimator';
import { Currency, Language } from '@/store/usePreferencesStore';
import { formatPrice } from './currency';
import { materialNames, furnitureNames } from './i18n';

/**
 * Generates and downloads a clean, Excel-compatible CSV file with UTF-8 BOM.
 */
export function exportEstimateToCsv(
  summary: EstimateSummary,
  projectName = 'ArchStudio Project',
  currency: Currency = 'UZS',
  language: Language = 'uz',
  rate = 12800
): void {
  const rows: string[][] = [];
  const currLabel = currency === 'USD' ? 'USD ($)' : language === 'uz' ? 'UZS (so‘m)' : 'UZS (сум)';

  // Header & Metadata
  rows.push([
    language === 'uz'
      ? 'ARCHSTUDIO 3D - QURILISH SMETASI VA MATERIALLAR RO‘YXATI (BOM)'
      : 'ARCHSTUDIO 3D - СМЕТА НА РЕМОНТ И ВЕДОМОСТЬ МАТЕРИАЛОВ (BOM)',
  ]);
  rows.push([language === 'uz' ? 'Loyiha Nomi' : 'Название Проекта', projectName]);
  rows.push([language === 'uz' ? 'Sana' : 'Дата', new Date().toLocaleDateString()]);
  rows.push([language === 'uz' ? 'Valyuta' : 'Валюта', currLabel]);
  rows.push([language === 'uz' ? 'Isrof / Zaxira' : 'Запас на обрезку', `${Math.round(summary.wasteFactor * 100)}%`]);
  rows.push([]);

  // Top KPI Summary
  rows.push([language === 'uz' ? 'LOYIHANING ASOSIY KO‘RSATKICHLARI' : 'ОСНОВНЫЕ МЕТРИКИ ПРОЕКТА']);
  rows.push([language === 'uz' ? 'Pol Maydoni' : 'Площадь Пола', `${summary.totalFloorArea.toFixed(1)} m²`]);
  rows.push([language === 'uz' ? 'Yalpi Devor Maydoni' : 'Общая Площадь Стен', `${summary.totalGrossWallArea.toFixed(1)} m²`]);
  rows.push([language === 'uz' ? 'Eshik va Deraza O‘ymalari' : 'Вычет Проемов', `-${summary.totalOpeningsArea.toFixed(1)} m²`]);
  rows.push([language === 'uz' ? 'Sof Pardozlanadigan Yuza' : 'Чистая Площадь Стен', `${summary.totalNetWallArea.toFixed(1)} m²`]);
  rows.push([]);

  // Section 1: Wall Finishes
  rows.push([language === 'uz' ? '1. DEVOR PARDOZLASH (GULQOG‘OZ VA BO‘YOQ)' : '1. ОТДЕЛКА СТЕН (ОБОИ И КРАСКА)']);
  rows.push([
    language === 'uz' ? 'Material Nomi' : 'Материал',
    language === 'uz' ? 'Turi' : 'Тип',
    language === 'uz' ? 'Sof Maydon (m²)' : 'Чистая Площадь (м²)',
    language === 'uz' ? 'Zaxira Bilan (m²)' : 'С Запасом (м²)',
    language === 'uz' ? 'Miqdor' : 'Кол-во',
    language === 'uz' ? 'Birlik' : 'Ед.',
    `${language === 'uz' ? 'Birlik Narxi' : 'Цена за ед.'} (${currLabel})`,
    `${language === 'uz' ? 'Jami Narxi' : 'Сумма'} (${currLabel})`,
  ]);

  summary.wallFinishItems.forEach((item) => {
    const name = materialNames[item.materialId]?.[language] || item.materialName;
    rows.push([
      `"${name}"`,
      item.category.toUpperCase(),
      item.netArea.toFixed(2),
      item.reserveArea.toFixed(2),
      item.requiredUnits.toString(),
      item.unit,
      formatPrice(item.unitPrice, currency, language, rate),
      formatPrice(item.totalPrice, currency, language, rate),
    ]);
  });
  rows.push([]);

  // Section 2: Flooring & Ceiling
  rows.push([language === 'uz' ? '2. POL VA SHIFT QOPLAMALARI' : '2. НАПОЛЬНЫЕ И ПОТОЛОЧНЫЕ ПОКРЫТИЯ']);
  rows.push([
    language === 'uz' ? 'Yuza' : 'Поверхность',
    language === 'uz' ? 'Material Nomi' : 'Материал',
    language === 'uz' ? 'Sof Maydon (m²)' : 'Чистая Площадь (м²)',
    language === 'uz' ? 'Zaxira Bilan (m²)' : 'С Запасом (м²)',
    `${language === 'uz' ? 'Narxi / m²' : 'Цена за м²'} (${currLabel})`,
    `${language === 'uz' ? 'Jami Narxi' : 'Сумма'} (${currLabel})`,
  ]);

  summary.surfaceFinishItems.forEach((item) => {
    const name = materialNames[item.materialId]?.[language] || item.materialName;
    rows.push([
      item.type.toUpperCase(),
      `"${name}"`,
      item.netArea.toFixed(2),
      item.reserveArea.toFixed(2),
      formatPrice(item.unitPrice, currency, language, rate),
      formatPrice(item.totalPrice, currency, language, rate),
    ]);
  });
  rows.push([]);

  // Section 3: Furniture & Curtains
  if (summary.furnitureItems.length > 0) {
    rows.push([language === 'uz' ? '3. MEBEL, YORITGICH VA PARDALAR' : '3. МЕБЕЛЬ, СВЕТ И ШТОРЫ']);
    rows.push([
      language === 'uz' ? 'Jihoz Nomi' : 'Наименование',
      language === 'uz' ? 'Kategoriya' : 'Категория',
      language === 'uz' ? 'O‘lchamlari (K × B × Ch m)' : 'Габариты (Ш × В × Г м)',
      language === 'uz' ? 'Soni' : 'Кол-во',
      `${language === 'uz' ? 'Dona Narxi' : 'Цена за шт.'} (${currLabel})`,
      `${language === 'uz' ? 'Jami Narxi' : 'Сумма'} (${currLabel})`,
    ]);

    summary.furnitureItems.forEach((item) => {
      const name = furnitureNames[item.catalogId]?.[language] || item.name;
      const dim = `${item.dimensions.width}m × ${item.dimensions.height}m × ${item.dimensions.depth}m`;
      rows.push([
        `"${name}"`,
        item.category.toUpperCase(),
        dim,
        item.quantity.toString(),
        formatPrice(item.unitPrice, currency, language, rate),
        formatPrice(item.totalPrice, currency, language, rate),
      ]);
    });
    rows.push([]);
  }

  // Section 4: Room-by-Room Distribution
  if (summary.roomEstimates && summary.roomEstimates.length > 0) {
    rows.push([
      language === 'uz'
        ? '4. XONALAR KESIMIDA TAQSIMOT VA XARAJATLAR'
        : '4. ПОКОМНАТНОЕ РАСПРЕДЕЛЕНИЕ И ЗАТРАТЫ',
    ]);
    rows.push([
      language === 'uz' ? 'Xona Nomi' : 'Комната',
      language === 'uz' ? 'Pol Maydoni (m²)' : 'Площадь (м²)',
      language === 'uz' ? 'Sof Devor (m²)' : 'Стены нетто (м²)',
      `${language === 'uz' ? 'Materiallar' : 'Материалы'} (${currLabel})`,
      `${language === 'uz' ? 'Mebel & Jihoz' : 'Мебель'} (${currLabel})`,
      `${language === 'uz' ? 'Xona Jami' : 'Итого по комнате'} (${currLabel})`,
    ]);

    summary.roomEstimates.forEach((re) => {
      rows.push([
        `"${re.roomName}"`,
        re.floorArea.toFixed(1),
        re.netWallArea.toFixed(1),
        formatPrice(re.materialsSubtotal, currency, language, rate),
        formatPrice(re.furnitureSubtotal, currency, language, rate),
        formatPrice(re.subtotal, currency, language, rate),
      ]);
    });
    rows.push([]);
  }

  // Grand Totals
  rows.push([language === 'uz' ? 'MOLIYAVIY XULOSA' : 'ИТОГОВЫЙ БЮДЖЕТ']);
  rows.push([
    language === 'uz' ? 'Pardozlash Materiallari Jami' : 'Итого Отделка',
    formatPrice(summary.finishingMaterialsSubtotal, currency, language, rate),
  ]);
  rows.push([
    language === 'uz' ? 'Mebel va Bezaklar Jami' : 'Итого Мебель и Свет',
    formatPrice(summary.furnitureSubtotal, currency, language, rate),
  ]);
  rows.push([
    language === 'uz' ? 'UMUMIY SMETA BYUDJETI' : 'ОБЩАЯ СМЕТА РЕМОНТА',
    formatPrice(summary.grandTotal, currency, language, rate),
  ]);

  // Convert to CSV string with \r\n
  const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\r\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ArchStudio_Smeta_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean print mode for print/PDF export
 */
export function printEstimateReport(): void {
  window.print();
}
