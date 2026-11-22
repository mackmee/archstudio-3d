import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns';
import https from 'node:https';
import { URL } from 'node:url';
import { splitWallsAtIntersections } from '@/lib/wallGeometry';

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
5. The estimated bounding dimensions of the entire drawn property in meters.

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
  ]
}`;

    // Pass API key via x-goog-api-key header to generativelanguage.googleapis.com
    // Works cleanly with Google AI Studio AQ.* and AIza* keys with automatic model fallback
    const candidateEndpoints: string[] = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent',
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
    let lastErrDetails = '';
    let lastStatusCode = 500;
    let lastErrorCode: string | undefined;

    for (const endpoint of candidateEndpoints) {
      try {
        const res = await postHttpsRequest(endpoint, payload, apiKey, 45000);
        if (res.statusCode === 404) {
          lastErrDetails = res.data;
          lastStatusCode = res.statusCode;
          console.warn(`Endpoint ${endpoint.slice(0, 60)} returned 404, trying next candidate...`);
          continue;
        }
        httpRes = res;
        break;
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        lastErrorCode = code;
        lastErrDetails = err instanceof Error ? err.message : String(err);
        console.error(`HTTPS request failed (${code}):`, lastErrDetails);
      }
    }

    if (!httpRes || httpRes.statusCode >= 400) {
      const status = httpRes?.statusCode || lastStatusCode || 500;
      const rawText = httpRes?.data || lastErrDetails;
      console.error(`Gemini API Error (${status}):`, rawText);

      let parsedMsg = rawText;
      let apiErrorCode = lastErrorCode;
      try {
        const json = JSON.parse(rawText);
        if (json.error?.message) {
          parsedMsg = json.error.message;
        }
        if (json.error?.status || json.error?.code) {
          apiErrorCode = String(json.error.status || json.error.code);
        }
      } catch {
        // use raw text
      }

      return NextResponse.json(
        {
          error: `Gemini API xatosi (${status}): ${parsedMsg}`,
          statusCode: status,
          errorCode: apiErrorCode,
          raw: rawText,
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

    const pixelsPerMeter = imageWidth / estW;

    // Convert raw walls from normalized [0..1] to real-world meters
    const rawWalls = (parsed.walls || []).map((w, index) => {
      return {
        id: `ai_wall_${Date.now()}_${index}`,
        start: {
          x: Number((Math.max(0, Math.min(1, w.startX)) * estW).toFixed(3)),
          y: Number((Math.max(0, Math.min(1, w.startY)) * estH).toFixed(3)),
        },
        end: {
          x: Number((Math.max(0, Math.min(1, w.endX)) * estW).toFixed(3)),
          y: Number((Math.max(0, Math.min(1, w.endY)) * estH).toFixed(3)),
        },
        thickness: w.thickness && w.thickness >= 0.1 ? w.thickness : 0.18,
      };
    });

    // Vertex Snapping Algorithm:
    // Snap nearby wall endpoints together (within 0.15m) so walls form clean closed loops
    const snapThreshold = 0.15; // 15 cm
    const snappedWalls = rawWalls.map((wall) => ({
      ...wall,
      start: { ...wall.start },
      end: { ...wall.end },
    }));

    for (let i = 0; i < snappedWalls.length; i++) {
      for (let j = i + 1; j < snappedWalls.length; j++) {
        const w1 = snappedWalls[i];
        const w2 = snappedWalls[j];

        // w1.start to w2.start
        if (Math.hypot(w1.start.x - w2.start.x, w1.start.y - w2.start.y) <= snapThreshold) {
          const avgX = Number(((w1.start.x + w2.start.x) / 2).toFixed(3));
          const avgY = Number(((w1.start.y + w2.start.y) / 2).toFixed(3));
          w1.start.x = avgX;
          w1.start.y = avgY;
          w2.start.x = avgX;
          w2.start.y = avgY;
        }

        // w1.start to w2.end
        if (Math.hypot(w1.start.x - w2.end.x, w1.start.y - w2.end.y) <= snapThreshold) {
          const avgX = Number(((w1.start.x + w2.end.x) / 2).toFixed(3));
          const avgY = Number(((w1.start.y + w2.end.y) / 2).toFixed(3));
          w1.start.x = avgX;
          w1.start.y = avgY;
          w2.end.x = avgX;
          w2.end.y = avgY;
        }

        // w1.end to w2.start
        if (Math.hypot(w1.end.x - w2.start.x, w1.end.y - w2.start.y) <= snapThreshold) {
          const avgX = Number(((w1.end.x + w2.start.x) / 2).toFixed(3));
          const avgY = Number(((w1.end.y + w2.start.y) / 2).toFixed(3));
          w1.end.x = avgX;
          w1.end.y = avgY;
          w2.start.x = avgX;
          w2.start.y = avgY;
        }

        // w1.end to w2.end
        if (Math.hypot(w1.end.x - w2.end.x, w1.end.y - w2.end.y) <= snapThreshold) {
          const avgX = Number(((w1.end.x + w2.end.x) / 2).toFixed(3));
          const avgY = Number(((w1.end.y + w2.end.y) / 2).toFixed(3));
          w1.end.x = avgX;
          w1.end.y = avgY;
          w2.end.x = avgX;
          w2.end.y = avgY;
        }
      }
    }

    // Convert openings and associate with mapped wall IDs
    const convertedOpenings = (parsed.openings || [])
      .filter((op) => op.wallIndex >= 0 && op.wallIndex < snappedWalls.length)
      .map((op, idx) => {
        const wall = snappedWalls[op.wallIndex];
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

    // Auto T-Junction Splitting Algorithm:
    // Automatically splits walls where interior partition walls meet exterior or other walls,
    // snapping touching endpoints and remapping door/window openings
    const splitResult = splitWallsAtIntersections(snappedWalls, convertedOpenings, 0.15);
    const finalWalls = splitResult.walls;
    const finalOpenings = splitResult.openings;

    // Convert room labels
    const convertedRooms = (parsed.rooms || []).map((r, idx) => {
      return {
        id: `ai_room_${Date.now()}_${idx}`,
        name: r.name || (language === 'uz' ? `Xona ${idx + 1}` : `Комната ${idx + 1}`),
        x: Number((Math.max(0, Math.min(1, r.x)) * estW).toFixed(2)),
        y: Number((Math.max(0, Math.min(1, r.y)) * estH).toFixed(2)),
        color: '#6366f1',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        estimatedWidthMeters: estW,
        estimatedHeightMeters: estH,
        pixelsPerMeter,
        walls: finalWalls,
        openings: finalOpenings,
        rooms: convertedRooms,
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
