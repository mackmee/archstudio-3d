import { Room, Wall, PlacedFurniture } from '@/types/floorplan';
import { getFurnitureCatalogItem } from '@/data/furniture';

/**
 * Intelligent Room Auto-Furnishing Engine:
 * Analyzes room labels and boundaries, placing starter furniture with
 * natural spacing and orientation. All placed items are 100% editable.
 */
export function autoFurnishFloorplan(
  rooms: Room[],
  walls: Wall[],
  existingFurniture: PlacedFurniture[] = []
): { newFurniture: PlacedFurniture[]; addedCount: number } {
  const result: PlacedFurniture[] = [...existingFurniture];
  let addedCount = 0;

  rooms.forEach((room) => {
    // Check if this room already has furniture inside / close to it
    const hasExisting = existingFurniture.some((f) => {
      const dist = Math.hypot(f.position[0] - room.x, f.position[2] - room.y);
      return dist < 2.0;
    });

    if (hasExisting) return;

    const name = room.name.toLowerCase();

    // 1. BEDROOM (Yotoqxona / Спальня)
    if (
      name.includes('yotoq') ||
      name.includes('спальн') ||
      name.includes('bed') ||
      name.includes('dam olish')
    ) {
      // Queen Bed
      const bedItem = getFurnitureCatalogItem('furn_bed_queen');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: bedItem.id,
        name: bedItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y - 0.35).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: bedItem.defaultColor,
        price: bedItem.price,
      });
      addedCount++;

      // Nightstand on right of bed
      const nightItem = getFurnitureCatalogItem('furn_nightstand');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: nightItem.id,
        name: nightItem.name,
        position: [Number((room.x + 1.25).toFixed(3)), 0, Number((room.y - 0.35).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: nightItem.defaultColor,
        price: nightItem.price,
      });
      addedCount++;

      // Modular Wardrobe
      const wardItem = getFurnitureCatalogItem('furn_wardrobe');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: wardItem.id,
        name: wardItem.name,
        position: [Number((room.x - 1.2).toFixed(3)), 0, Number((room.y + 0.8).toFixed(3))],
        rotationY: Math.PI / 2,
        scale: 1.0,
        color: wardItem.defaultColor,
        price: wardItem.price,
      });
      addedCount++;
    }

    // 2. KIDS / STUDY (Bolalar xonasi / Детская / Kabinet)
    else if (
      name.includes('bola') ||
      name.includes('детск') ||
      name.includes('kid') ||
      name.includes('child') ||
      name.includes('kabinet') ||
      name.includes('ish') ||
      name.includes('dars')
    ) {
      // Modern Study Desk & Chair
      const deskItem = getFurnitureCatalogItem('furn_desk');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: deskItem.id,
        name: deskItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y - 0.4).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: deskItem.defaultColor,
        price: deskItem.price,
      });
      addedCount++;

      // Wardrobe / Storage
      const wardItem = getFurnitureCatalogItem('furn_wardrobe');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: wardItem.id,
        name: wardItem.name,
        position: [Number((room.x - 1.1).toFixed(3)), 0, Number((room.y + 0.7).toFixed(3))],
        rotationY: Math.PI / 2,
        scale: 0.9,
        color: wardItem.defaultColor,
        price: wardItem.price,
      });
      addedCount++;
    }

    // 3. LIVING ROOM (Mehmonxona / Гостиная / Zal)
    else if (
      name.includes('mehmon') ||
      name.includes('гостин') ||
      name.includes('living') ||
      name.includes('zal') ||
      name.includes('hall') ||
      name.includes('salon')
    ) {
      // 3-Seater Sofa
      const sofaItem = getFurnitureCatalogItem('furn_sofa_3seater');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: sofaItem.id,
        name: sofaItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y + 0.8).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: sofaItem.defaultColor,
        price: sofaItem.price,
      });
      addedCount++;

      // Coffee Table
      const coffeeItem = getFurnitureCatalogItem('furn_coffee_table');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: coffeeItem.id,
        name: coffeeItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y - 0.1).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: coffeeItem.defaultColor,
        price: coffeeItem.price,
      });
      addedCount++;

      // Media Console & TV
      const tvItem = getFurnitureCatalogItem('furn_tv_console');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: tvItem.id,
        name: tvItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y - 1.35).toFixed(3))],
        rotationY: Math.PI,
        scale: 1.0,
        color: tvItem.defaultColor,
        price: tvItem.price,
      });
      addedCount++;

      // Potted Plant
      const plantItem = getFurnitureCatalogItem('furn_potted_plant');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: plantItem.id,
        name: plantItem.name,
        position: [Number((room.x + 1.5).toFixed(3)), 0, Number((room.y + 0.8).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: plantItem.defaultColor,
        price: plantItem.price,
      });
      addedCount++;
    }

    // 4. KITCHEN & DINING (Oshxona / Кухня / Столовая)
    else if (
      name.includes('oshxona') ||
      name.includes('кухн') ||
      name.includes('kitchen') ||
      name.includes('dining') ||
      name.includes('ovqat')
    ) {
      // Dining Table & Chairs
      const diningItem = getFurnitureCatalogItem('furn_dining_set');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: diningItem.id,
        name: diningItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number(room.y.toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: diningItem.defaultColor,
        price: diningItem.price,
      });
      addedCount++;

      // Kitchen Island / Counter
      const islandItem = getFurnitureCatalogItem('furn_kitchen_island');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: islandItem.id,
        name: islandItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y - 1.3).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: islandItem.defaultColor,
        price: islandItem.price,
      });
      addedCount++;
    }

    // 5. BATHROOM & SANITARY (Hammom / Ванная / Hojatxona / Санузел)
    else if (
      name.includes('hammom') ||
      name.includes('vann') ||
      name.includes('bath') ||
      name.includes('wc') ||
      name.includes('hojat') ||
      name.includes('tualet') ||
      name.includes('сануз') ||
      name.includes('душ')
    ) {
      // Bathtub
      const bathItem = getFurnitureCatalogItem('furn_bathtub');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: bathItem.id,
        name: bathItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number((room.y - 0.3).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: bathItem.defaultColor,
        price: bathItem.price,
      });
      addedCount++;

      // Wall-Hung Toilet
      const toiletItem = getFurnitureCatalogItem('furn_toilet');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: toiletItem.id,
        name: toiletItem.name,
        position: [Number((room.x + 0.75).toFixed(3)), 0, Number((room.y + 0.45).toFixed(3))],
        rotationY: 0,
        scale: 1.0,
        color: toiletItem.defaultColor,
        price: toiletItem.price,
      });
      addedCount++;
    }

    // 6. HALLWAY / CORRIDOR (Dahliz / Yo‘lak / Прихожая / Коридор)
    else if (
      name.includes('dahliz') ||
      name.includes('yo‘lak') ||
      name.includes('yolak') ||
      name.includes('прихож') ||
      name.includes('коридор') ||
      name.includes('entry')
    ) {
      // Entry Wardrobe
      const wardItem = getFurnitureCatalogItem('furn_wardrobe');
      result.push({
        id: `furn_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        catalogId: wardItem.id,
        name: wardItem.name,
        position: [Number(room.x.toFixed(3)), 0, Number(room.y.toFixed(3))],
        rotationY: 0,
        scale: 0.9,
        color: wardItem.defaultColor,
        price: wardItem.price,
      });
      addedCount++;
    }
  });

  return { newFurniture: result, addedCount };
}
