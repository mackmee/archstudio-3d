import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns';
import https from 'node:https';
import { URL } from 'node:url';
import { rectifyAiFloorplan } from '@/lib/wallGeometry';
import { autoFurnishFloorplan } from '@/lib/autoFurnish';
import { getFurnitureCatalogItem } from '@/data/furniture';
import { PlacedFurniture } from '@/types/floorplan';

// Prioritize IPv4 resolution to prevent macOS IPv6 fetch / undici network drops
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  console.warn('Could not set dns default result order:', e);
}

interface HttpsResponse {
  statusCode: number;
  statusMessage: string;
  data: string;
}

/**
 * Reliable Node https.request helper with family: 4 and custom timeout
 */
function postHttpsRequest(
  urlString: string,
  payload: unknown,
  apiKey: string,
  timeoutMs = 45000
): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);
    const postData = JSON.stringify(payload);

    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      family: 4, // Strictly IPv4
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'ArchStudio-3D/1.0',
        'x-goog-api-key': apiKey,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 200,
          statusMessage: res.statusMessage || '',
          data: body,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const err = new Error(`Request timed out after ${timeoutMs / 1000}s`);
      (err as unknown as { code: string }).code = 'ETIMEDOUT';
      reject(err);
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

interface AiFloorplanResponse {
  estimatedWidthMeters?: number;
  estimatedHeightMeters?: number;
  rooms?: Array<{ name: string; x: number; y: number }>;
  walls?: Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    thickness?: number;
  }>;
  openings?: Array<{
    wallIndex: number;
    type: 'door' | 'window';
    positionRatio: number;
    width?: number;
    height?: number;
    sillHeight?: number;
  }>;
  furniture?: Array<{
    catalogKey: string;
    x: number;
    y: number;
    rotationDeg?: number;
    roomName?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is missing in server environment (.env.local)',
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      imageWidth = 1000,
      imageHeight = 800,
      targetAreaSqm,
      language = 'uz',
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'imageBase64 parameter is required' },
        { status: 400 }
      );
    }

    // Strip data URL scheme prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const systemPrompt = `You are a world-class architectural AI engineer specialized in parsing 2D floor plans, blueprints, and architectural layouts into precise CAD vector entities.
Your job is to thoroughly detect:
1. Exact printed architectural dimensions:
   - CAREFULLY examine the blueprint for printed dimension chains, numbers, and axis markings.
   - Blueprints in CIS / Uzbekistan / Central Asia are almost always dimensioned in MILLIMETERS (e.g. 20 000, 25 000, 5 500, 4 200, 3 500, 2 400).
   - Divide millimeter numbers by 1000 to convert to meters (e.g. 20 000 mm = 20.0 m, 25 000 mm = 25.0 m).
   - Use the total outermost horizontal and vertical dimension numbers as the authoritative ground truth for "estimatedWidthMeters" and "estimatedHeightMeters" instead of guessing!
   - If no dimension numbers are printed, calculate dimensions based on ${
     targetAreaSqm ? `the user's target area of ~${targetAreaSqm} m²` : 'standard residential architectural scale'
   }.
2. All structural walls across the ENTIRE blueprint:
   - Trace ALL walled structures shown: both the primary house and any auxiliary buildings (e.g., Garaj / Garage, Yozgi oshxona / Summer kitchen, Omborxona / Storage, Boiler room, Courtyard boundary walls). Do NOT skip secondary structures!
   - Perimeter exterior walls (thickness ~0.20-0.25m) and interior partition walls (thickness ~0.12-0.15m). Interior partition walls must connect cleanly to outer walls or other partition walls (forming T-junctions or L-corners without floating gaps).
3. All architectural openings:
   - Doors ('door'): You MUST actively scan every room boundary (entry, bedrooms, bathrooms, kitchen, living room, garage, storage) for door openings and swing arcs. In an architectural layout, every interior room must have an access door! Typically width 0.8m - 1.0m, height 2.1m.
   - Windows ('window'): Scan exterior walls for parallel double lines or window glass markings. Typically width 1.2m - 1.8m, height 1.4m, sillHeight 0.9m.
4. Room labels with their approximate 2D center positions and standard names in ${
      language === 'uz' ? 'Uzbek Latin' : 'Russian'
    }. Include names for auxiliary rooms (e.g. Garaj, Yozgi oshxona, Omborxona).
5. Any visible furniture items drawn in the floorplan (beds, sofas, dining tables, kitchen sets, wardrobes, desks, bathtubs, toilets):
   - Provide "catalogKey": "double_bed" | "single_bed" | "sofa" | "dining_table" | "kitchen_set" | "wardrobe" | "desk" | "bathtub" | "toilet" | "coffee_table"
   - "x", "y": normalized center coordinates (0.0 to 1.0)
   - "rotationDeg": approximate rotation angle in degrees (0, 90, 180, 270)
   - "roomName": optional room name string
6. The estimated bounding dimensions of the entire drawn property in meters.

CRITICAL RULES FOR COORDINATES:
- Return all coordinates as NORMALIZED FLOATS strictly between 0.00 and 1.00 relative to the image bounding box.
- (0.0, 0.0) is the TOP-LEFT corner of the image.
- (1.0, 1.0) is the BOTTOM-RIGHT corner of the image.
- For every wall, provide:
  - "startX", "startY": start coordinate (0.0 to 1.0)
  - "endX", "endY": end coordinate (0.0 to 1.0)
  - "thickness": in meters (default 0.20 for exterior walls, 0.15 for interior walls)
- For every opening:
  - "wallIndex": 0-based integer index of the wall in the "walls" array where this opening is located.
  - "type": "door" or "window"
  - "positionRatio": float between 0.1 and 0.9 along the wall vector from start to end
  - "width": in meters (e.g. 0.9 for standard single door, 1.2-1.6 for windows)
  - "height": in meters (e.g. 2.1 for door, 1.4 for window)
  - "sillHeight": in meters (0 for door, 0.9 for window)
- For every room:
  - "name": localized room name in ${
    language === 'uz'
      ? 'Uzbek (e.g. Mehmonxona, Yotoqxona, Oshxona, Hammom, Dahliz)'
      : 'Russian (e.g. Гостиная, Спальня, Кухня, Ванная, Прихожая)'
  }
  - "x", "y": normalized center coordinates (0.0 to 1.0)

Return ONLY valid JSON matching this schema:
{
  "estimatedWidthMeters": number,
  "estimatedHeightMeters": number,
  "rooms": [
    { "name": string, "x": number, "y": number }
  ],
  "walls": [
    { "startX": number, "startY": number, "endX": number, "endY": number, "thickness": number }
  ],
  "openings": [
    { "wallIndex": number, "type": "door" | "window", "positionRatio": number, "width": number, "height": number, "sillHeight": number }
  ],
  "furniture": [
    { "catalogKey": string, "x": number, "y": number, "rotationDeg": number, "roomName": string }
  ]
}`;

    // Multi-Model Fallback Chain in exact priority order
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-3-flash-preview',
    ];

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    let httpRes: HttpsResponse | null = null;
    let usedModel: string | null = null;
    let lastErrDetails = '';
    let lastStatusCode = 503;
    let lastErrorCode: string | undefined;

    interface AttemptRecord {
      model: string;
      status: number;
      message?: string;
    }
    const attempts: AttemptRecord[] = [];

    for (const model of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      try {
        const res = await postHttpsRequest(endpoint, payload, apiKey, 45000);
        attempts.push({ model, status: res.statusCode });

        // 404: Model not found -> immediately move to next model
        if (res.statusCode === 404) {
          lastErrDetails = res.data;
          lastStatusCode = res.statusCode;
          console.warn(`[Gemini Scanner] ${model} returned 404, trying next candidate...`);
          continue;
        }

        // 503 (high demand / overloaded) or 429 (rate limit): wait 1500ms and retry once
        if (res.statusCode === 503 || res.statusCode === 429) {
          console.warn(
            `[Gemini Scanner] ${model} returned ${res.statusCode}. Waiting 1500ms before retry...`
          );
          await new Promise((r) => setTimeout(r, 1500));

          try {
            const retryRes = await postHttpsRequest(endpoint, payload, apiKey, 45000);
            attempts.push({ model: `${model} (retry)`, status: retryRes.statusCode });

            if (retryRes.statusCode < 400) {
              httpRes = retryRes;
              usedModel = model;
              break;
            } else {
              lastErrDetails = retryRes.data;
              lastStatusCode = retryRes.statusCode;
              console.warn(
                `[Gemini Scanner] ${model} retry returned ${retryRes.statusCode}, moving to next candidate...`
              );
              continue;
            }
          } catch (retryErr: unknown) {
            const errText = retryErr instanceof Error ? retryErr.message : String(retryErr);
            attempts.push({ model: `${model} (retry error)`, status: 500, message: errText });
            console.warn(`[Gemini Scanner] ${model} retry network error:`, errText);
            continue;
          }
        }

        if (res.statusCode < 400) {
          httpRes = res;
          usedModel = model;
          break;
        } else {
          lastErrDetails = res.data;
          lastStatusCode = res.statusCode;
          console.warn(`[Gemini Scanner] ${model} returned ${res.statusCode}, trying next candidate...`);
          continue;
        }
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        lastErrorCode = code;
        lastErrDetails = err instanceof Error ? err.message : String(err);
        attempts.push({ model, status: 500, message: lastErrDetails });
        console.error(`[Gemini Scanner] HTTPS request failed for ${model} (${code}):`, lastErrDetails);
        continue;
      }
    }

    if (!httpRes || httpRes.statusCode >= 400) {
      const status = httpRes?.statusCode || lastStatusCode || 503;
      const summaryAttempts = attempts.map((a) => `${a.model} (${a.status})`).join(', ');
      const errorMsg = `Barcha Gemini modellar vaqtincha band: ${summaryAttempts}`;
      console.error(`Gemini API All Models Failed (${status}):`, summaryAttempts);

      return NextResponse.json(
        {
          error: errorMsg,
          statusCode: status,
          errorCode: lastErrorCode || 'ALL_MODELS_UNAVAILABLE',
          attempts,
          raw: lastErrDetails,
        },
        { status }
      );
    }

    let candidateText = '{}';
    try {
      const aiResult = JSON.parse(httpRes.data);
      candidateText = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } catch {
      console.error('Failed to parse Gemini response JSON:', httpRes.data);
      return NextResponse.json(
        { error: 'AI serveridan noto‘g‘ri formatdagi javob qaytdi.' },
        { status: 502 }
      );
    }

    let parsed: AiFloorplanResponse;
    try {
      const cleanJson = candidateText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error('Failed to parse Gemini candidate text:', candidateText);
      return NextResponse.json(
        { error: 'AI output was not valid JSON' },
        { status: 502 }
      );
    }

    // Determine estimated physical dimensions
    const aspect = imageHeight > 0 && imageWidth > 0 ? imageHeight / imageWidth : 0.75;
    let estW = parsed.estimatedWidthMeters || 10.0;
    let estH = parsed.estimatedHeightMeters || estW * aspect;

    // Sanity bounds check on meters (accommodates large 20m x 25m or larger single-family homes/lots)
    if (estW < 2 || estW > 80) {
      estW = targetAreaSqm ? Math.sqrt(targetAreaSqm / aspect) : 20.0;
    }
    if (estH < 2 || estH > 80) {
      estH = estW * aspect;
    }

    // Calculate actual bounding box of the walls themselves in normalized [0..1] coordinates
    // This fixes the "White Margin Shrink" bug where blueprints have white borders, margins, or caption text
    let wallMinX = 1.0;
    let wallMaxX = 0.0;
    let wallMinY = 1.0;
    let wallMaxY = 0.0;

    (parsed.walls || []).forEach((w) => {
      wallMinX = Math.min(wallMinX, w.startX, w.endX);
      wallMaxX = Math.max(wallMaxX, w.startX, w.endX);
      wallMinY = Math.min(wallMinY, w.startY, w.endY);
      wallMaxY = Math.max(wallMaxY, w.startY, w.endY);
    });

    // Guard against degenerate bounds
    if (wallMinX >= wallMaxX) {
      wallMinX = 0.05;
      wallMaxX = 0.95;
    }
    if (wallMinY >= wallMaxY) {
      wallMinY = 0.05;
      wallMaxY = 0.95;
    }

    const wallSpanX = Math.max(0.1, wallMaxX - wallMinX);
    const wallSpanY = Math.max(0.1, wallMaxY - wallMinY);

    // Coordinate mapping functions:
    // Maps normalized image coordinates [0..1] into physical meters such that the
    // house walls themselves span exactly [0..estW] and [0..estH]
    const toMetersX = (normX: number) =>
      Number((((Math.max(0, Math.min(1, normX)) - wallMinX) / wallSpanX) * estW).toFixed(3));
    const toMetersY = (normY: number) =>
      Number((((Math.max(0, Math.min(1, normY)) - wallMinY) / wallSpanY) * estH).toFixed(3));

    // Calculate Georeferenced Background Image Placement for 1:1 Pixel-Perfect Overlay
    const imgWidthMeters = Number((estW / wallSpanX).toFixed(3));
    const imgHeightMeters = Number((estH / wallSpanY).toFixed(3));
    const imgLeftMeters = Number((-(wallMinX / wallSpanX) * estW).toFixed(3));
    const imgTopMeters = Number((-(wallMinY / wallSpanY) * estH).toFixed(3));
    const pixelsPerMeter = Number((imageWidth / imgWidthMeters).toFixed(2));

    // Convert raw walls to meters
    const rawWalls = (parsed.walls || []).map((w, index) => {
      return {
        id: `ai_wall_${Date.now()}_${index}`,
        start: {
          x: toMetersX(w.startX),
          y: toMetersY(w.startY),
        },
        end: {
          x: toMetersX(w.endX),
          y: toMetersY(w.endY),
        },
        thickness: w.thickness && w.thickness >= 0.1 ? w.thickness : 0.18,
      };
    });

    // Convert openings and associate with mapped wall IDs
    const convertedOpenings = (parsed.openings || [])
      .filter((op) => op.wallIndex >= 0 && op.wallIndex < rawWalls.length)
      .map((op, idx) => {
        const wall = rawWalls[op.wallIndex];
        const isDoor = op.type === 'door';
        const positionRatio = Math.max(0.1, Math.min(0.9, op.positionRatio || 0.5));

        return {
          id: `ai_opening_${Date.now()}_${idx}`,
          wallId: wall.id,
          type: op.type,
          positionRatio,
          width: op.width && op.width > 0.5 ? op.width : isDoor ? 0.9 : 1.4,
          height: op.height && op.height > 0.5 ? op.height : isDoor ? 2.1 : 1.4,
          sillHeight:
            op.sillHeight !== undefined ? op.sillHeight : isDoor ? 0 : 0.9,
          flip: false,
        };
      });

    // CAD Auto-Rectifier:
    // Orthogonal 90° snap, collinear axis alignment, endpoint snapping, and intersection splitting
    const rectified = rectifyAiFloorplan(rawWalls, convertedOpenings);
    const finalWalls = rectified.walls;
    const finalOpenings = rectified.openings;

    // Convert room labels with wall-bounding-box normalized coordinates
    const convertedRooms = (parsed.rooms || []).map((r, idx) => {
      return {
        id: `ai_room_${Date.now()}_${idx}`,
        name: r.name || (language === 'uz' ? `Xona ${idx + 1}` : `Комната ${idx + 1}`),
        x: toMetersX(r.x),
        y: toMetersY(r.y),
        color: '#6366f1',
      };
    });

    // Map detected furniture symbols
    const furnitureCatalogMap: Record<string, string> = {
      double_bed: 'furn_bed_queen',
      bed: 'furn_bed_queen',
      single_bed: 'furn_bed_queen',
      sofa: 'furn_sofa_3seater',
      sofa_l: 'furn_sofa_3seater',
      couch: 'furn_sofa_3seater',
      dining_table: 'furn_dining_set',
      table: 'furn_dining_set',
      kitchen_set: 'furn_kitchen_island',
      kitchen: 'furn_kitchen_island',
      wardrobe: 'furn_wardrobe',
      closet: 'furn_wardrobe',
      desk: 'furn_desk',
      study_desk: 'furn_desk',
      bathtub: 'furn_bathtub',
      tub: 'furn_bathtub',
      toilet: 'furn_toilet',
      wc: 'furn_toilet',
      coffee_table: 'furn_coffee_table',
      armchair: 'furn_armchair',
    };

    const detectedFurniture: PlacedFurniture[] = (parsed.furniture || []).map((f, idx) => {
      const catalogId = furnitureCatalogMap[f.catalogKey?.toLowerCase()] || 'furn_sofa_3seater';
      const catItem = getFurnitureCatalogItem(catalogId);
      const rotRad = ((f.rotationDeg || 0) * Math.PI) / 180;
      return {
        id: `ai_furn_${Date.now()}_${idx}`,
        catalogId: catItem.id,
        name: catItem.name,
        position: [toMetersX(f.x), 0, toMetersY(f.y)] as [number, number, number],
        rotationY: rotRad,
        scale: 1.0,
        color: catItem.defaultColor,
        price: catItem.price,
      };
    });

    // Smart Fallback Auto-Furnishing:
    // If Gemini detected fewer than 2 furniture items, auto-furnish the rooms
    let finalFurniture = detectedFurniture;
    if (finalFurniture.length < 2 && convertedRooms.length > 0) {
      const autoResult = autoFurnishFloorplan(convertedRooms, finalWalls, finalFurniture);
      finalFurniture = autoResult.newFurniture;
    }

    return NextResponse.json({
      success: true,
      data: {
        usedModel: usedModel || 'gemini-2.5-flash',
        estimatedWidthMeters: estW,
        estimatedHeightMeters: estH,
        pixelsPerMeter,
        walls: finalWalls,
        openings: finalOpenings,
        rooms: convertedRooms,
        furniture: finalFurniture,
        alignment: {
          imageX: imgLeftMeters,
          imageY: imgTopMeters,
          imageWidthMeters: imgWidthMeters,
          imageHeightMeters: imgHeightMeters,
        },
      },
    });
  } catch (error: unknown) {
    console.error('AI Scan Floorplan Route Error:', error);
    const errObj = error as { message?: string; code?: string };
    const causeCode = errObj?.code || 'INTERNAL_ERROR';
    const causeMsg = errObj?.message || 'Unknown internal error';

    return NextResponse.json(
      {
        error: `AI skaner server xatosi: ${causeMsg}`,
        errorCode: causeCode,
        details: causeMsg,
      },
      { status: 500 }
    );
  }
}
