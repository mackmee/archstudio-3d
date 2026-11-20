import { NextRequest, NextResponse } from 'next/server';

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

    const systemPrompt = `You are a world-class architectural AI engineer specialized in parsing 2D floor plans and blueprints into structured CAD vector entities.
Your job is to accurately detect:
1. All structural walls (both exterior perimeter and interior partition walls).
2. All architectural openings: doors ('door') and windows ('window').
3. Room labels with their approximate 2D center positions and names in ${
      language === 'uz' ? 'Uzbek Latin' : 'Russian'
    }.
4. The estimated bounding dimensions of the entire apartment in meters (e.g. width: 8.5m to 14m, height: 6m to 12m, based on the ${
      targetAreaSqm ? `target area ~${targetAreaSqm} m²` : 'standard residential scale'
    }).

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

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return NextResponse.json(
        { error: `Gemini API request failed (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const aiResult = await response.json();
    const candidateText =
      aiResult?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed: AiFloorplanResponse;
    try {
      parsed = JSON.parse(candidateText);
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

    // Sanity bounds check on meters
    if (estW < 3 || estW > 40) estW = 10.0;
    if (estH < 3 || estH > 40) estH = estW * aspect;

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
        walls: snappedWalls,
        openings: convertedOpenings,
        rooms: convertedRooms,
      },
    });
  } catch (error: unknown) {
    console.error('AI Scan Floorplan Route Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
