import { EstimateSummary } from './estimator';

/**
 * Generates and downloads a clean, Excel-compatible CSV file with UTF-8 BOM.
 */
export function exportEstimateToCsv(summary: EstimateSummary, projectName = 'ArchStudio Project'): void {
  const rows: string[][] = [];

  // Header & Metadata
  rows.push(['ARCHSTUDIO 3D - SMART CONSTRUCTION ESTIMATE & BILL OF MATERIALS']);
  rows.push(['Project Name', projectName]);
  rows.push(['Date Generated', new Date().toLocaleDateString()]);
  rows.push(['Reserve / Waste Factor', `${Math.round(summary.wasteFactor * 100)}%`]);
  rows.push([]);

  // Top KPI Summary
  rows.push(['PROJECT KEY METRICS']);
  rows.push(['Total Interior Floor Area', `${summary.totalFloorArea.toFixed(1)} m²`]);
  rows.push(['Gross Wall Area', `${summary.totalGrossWallArea.toFixed(1)} m²`]);
  rows.push(['Door & Window Cutout Area', `-${summary.totalOpeningsArea.toFixed(1)} m²`]);
  rows.push(['Net Finishable Wall Area', `${summary.totalNetWallArea.toFixed(1)} m²`]);
  rows.push([]);

  // Section 1: Wall Finishes
  rows.push(['1. WALL FINISHES (WALLPAPERS & PAINTS)']);
  rows.push([
    'Material Name',
    'Category',
    'Net Area (m²)',
    'With Reserve (m²)',
    'Required Quantity',
    'Unit',
    'Unit Price (USD)',
    'Total Price (USD)',
  ]);

  summary.wallFinishItems.forEach((item) => {
    rows.push([
      `"${item.materialName}"`,
      item.category.toUpperCase(),
      item.netArea.toFixed(2),
      item.reserveArea.toFixed(2),
      item.requiredUnits.toString(),
      item.unit,
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.totalPrice.toFixed(2)}`,
    ]);
  });
  rows.push([]);

  // Section 2: Flooring & Ceiling
  rows.push(['2. FLOORING & CEILING FINISHES']);
  rows.push([
    'Surface Type',
    'Material Name',
    'Net Area (m²)',
    'With Reserve (m²)',
    'Unit Price (USD/m²)',
    'Total Price (USD)',
  ]);

  summary.surfaceFinishItems.forEach((item) => {
    rows.push([
      item.type.toUpperCase(),
      `"${item.materialName}"`,
      item.netArea.toFixed(2),
      item.reserveArea.toFixed(2),
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.totalPrice.toFixed(2)}`,
    ]);
  });
  rows.push([]);

  // Section 3: Furniture & Curtains
  if (summary.furnitureItems.length > 0) {
    rows.push(['3. FURNITURE & CURTAINS']);
    rows.push([
      'Item Name',
      'Category',
      'Dimensions (W × H × D m)',
      'Quantity',
      'Unit Price (USD)',
      'Total Price (USD)',
    ]);

    summary.furnitureItems.forEach((item) => {
      const dim = `${item.dimensions.width}m × ${item.dimensions.height}m × ${item.dimensions.depth}m`;
      rows.push([
        `"${item.name}"`,
        item.category.toUpperCase(),
        dim,
        item.quantity.toString(),
        `$${item.unitPrice.toFixed(2)}`,
        `$${item.totalPrice.toFixed(2)}`,
      ]);
    });
    rows.push([]);
  }

  // Section 4: Labor & Delivery
  rows.push(['4. LABOR & DELIVERY']);
  rows.push(['Service', 'Cost (USD)']);
  rows.push(['Finishing & Installation Labor', `$${summary.laborCost.toFixed(2)}`]);
  rows.push(['Freight & Delivery Fee', `$${summary.deliveryCost.toFixed(2)}`]);
  rows.push([]);

  // Grand Totals
  rows.push(['FINANCIAL SUMMARY']);
  rows.push(['Finishing Materials Subtotal', `$${summary.finishingMaterialsSubtotal.toFixed(2)}`]);
  rows.push(['Furniture & Decor Subtotal', `$${summary.furnitureSubtotal.toFixed(2)}`]);
  rows.push(['Labor & Delivery Subtotal', `$${(summary.laborCost + summary.deliveryCost).toFixed(2)}`]);
  rows.push(['GRAND TOTAL ESTIMATE (USD)', `$${summary.grandTotal.toFixed(2)}`]);

  // Convert to CSV string with \r\n
  const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\r\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ArchStudio_Estimate_${Date.now()}.csv`);
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
