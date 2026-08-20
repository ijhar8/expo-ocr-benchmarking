import { requireNativeModule } from 'expo-modules-core';

export interface DetectedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export interface ContourExtractionOptions {
  threshold?: number;    // Probability threshold (default: 0.3)
  minArea?: number;      // Minimum pixel count (default: 12)
  minScore?: number;     // Minimum mean probability (default: 0.5)
  unclipRatio?: number;  // Bounding box expansion ratio (default: 1.6)
  maxCandidates?: number;// Maximum boxes to return (default: 800)
}

let nativeModule: any = null;
try {
  nativeModule = requireNativeModule('ExpoContourDetector');
} catch (e) {
  // Native module will be active after pod install / expo prebuild
  console.log('[ExpoContourDetector] Native module not loaded, using fast JS fallback');
}

/**
 * Converts Float32Array to Base64 binary string without copying overhead
 */
function float32ArrayToBase64(floatArray: Float32Array): string {
  const uint8 = new Uint8Array(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);
  let binary = '';
  const len = uint8.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      uint8.subarray(i, Math.min(i + chunkSize, len)) as any
    );
  }
  return btoa(binary);
}

/**
 * Pure TypeScript fallback for Connected Component & Box Extraction
 */
function extractBoxesJS(
  probMap: Float32Array,
  width: number,
  height: number,
  options: Required<ContourExtractionOptions>
): DetectedBoundingBox[] {
  const { threshold, minArea, minScore, unclipRatio, maxCandidates } = options;
  const total = width * height;
  const visited = new Uint8Array(total);
  const results: DetectedBoundingBox[] = [];

  const queueX = new Int32Array(total);
  const queueY = new Int32Array(total);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const startIdx = y * width + x;
      if (visited[startIdx] || probMap[startIdx] < threshold) {
        continue;
      }

      // BFS connected component search
      let qHead = 0;
      let qTail = 0;
      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;
      visited[startIdx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;
      let sumScore = 0;

      while (qHead < qTail) {
        const curX = queueX[qHead];
        const curY = queueY[qHead];
        qHead++;

        const curIdx = curY * width + curX;
        const score = probMap[curIdx];
        pixelCount++;
        sumScore += score;

        if (curX < minX) minX = curX;
        if (curX > maxX) maxX = curX;
        if (curY < minY) minY = curY;
        if (curY > maxY) maxY = curY;

        // 4-connected / 8-connected neighbors
        const dx = [-1, 1, 0, 0, -1, 1, -1, 1];
        const dy = [0, 0, -1, 1, -1, -1, 1, 1];

        for (let i = 0; i < 8; i++) {
          const nx = curX + dx[i];
          const ny = curY + dy[i];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx] && probMap[nIdx] >= threshold) {
              visited[nIdx] = 1;
              queueX[qTail] = nx;
              queueY[qTail] = ny;
              qTail++;
            }
          }
        }
      }

      if (pixelCount < minArea) continue;
      const meanScore = sumScore / pixelCount;
      if (meanScore < minScore) continue;

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const perimeter = 2 * (boxW + boxH);
      const distance = unclipRatio > 1 && perimeter > 0 ? (pixelCount * (unclipRatio - 1)) / perimeter : 0;

      const finalMinX = Math.max(0, minX - distance);
      const finalMinY = Math.max(0, minY - distance);
      const finalMaxX = Math.min(width - 1, maxX + distance);
      const finalMaxY = Math.min(height - 1, maxY + distance);

      const w = finalMaxX - finalMinX;
      const h = finalMaxY - finalMinY;

      if (w > 2 && h > 2) {
        results.push({
          x: finalMinX,
          y: finalMinY,
          width: w,
          height: h,
          score: Number(meanScore.toFixed(3)),
        });
      }

      if (results.length >= maxCandidates) break;
    }
    if (results.length >= maxCandidates) break;
  }

  // Sort top-to-bottom reading order
  results.sort((a, b) => {
    const lineThreshold = Math.min(a.height, b.height) * 0.5;
    if (Math.abs(a.y - b.y) > lineThreshold) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return results;
}

/**
 * Extracts bounding boxes from DBNet/FAST probability heatmap using C++ JSI Native module (or JS fallback)
 */
export function extractBoundingBoxes(
  probMap: Float32Array,
  width: number,
  height: number,
  options: ContourExtractionOptions = {}
): DetectedBoundingBox[] {
  const opts: Required<ContourExtractionOptions> = {
    threshold: options.threshold ?? 0.3,
    minArea: options.minArea ?? 12,
    minScore: options.minScore ?? 0.5,
    unclipRatio: options.unclipRatio ?? 1.6,
    maxCandidates: options.maxCandidates ?? 800,
  };

  if (nativeModule && typeof nativeModule.extractBoundingBoxes === 'function') {
    try {
      const b64 = float32ArrayToBase64(probMap);
      const boxes = nativeModule.extractBoundingBoxes(
        b64,
        width,
        height,
        opts.threshold,
        opts.minArea,
        opts.minScore,
        opts.unclipRatio,
        opts.maxCandidates
      );
      if (Array.isArray(boxes)) {
        return boxes;
      }
    } catch (e) {
      console.warn('[ExpoContourDetector] Native call failed, falling back to JS:', e);
    }
  }

  return extractBoxesJS(probMap, width, height, opts);
}

export default {
  extractBoundingBoxes,
};
