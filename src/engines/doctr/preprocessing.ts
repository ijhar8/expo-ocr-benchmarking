import { Skia } from '@shopify/react-native-skia';
import { File } from 'expo-file-system';

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

export interface TensorData {
  data: Float32Array;
  dims: number[];
  origWidth: number;
  origHeight: number;
}

/**
 * Loads an image from a URI and converts it to a normalized Float32 CHW tensor [1, 3, targetH, targetW]
 */
export async function preprocessImageForDetection(
  uri: string,
  targetSize: number = 1024
): Promise<TensorData> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  // Decode with Skia
  const skData = Skia.Data.fromBytes(uint8);
  const image = Skia.Image.MakeImageFromEncoded(skData);

  if (!image) {
    throw new Error(`Failed to decode image from ${uri}`);
  }

  const origWidth = image.width();
  const origHeight = image.height();

  // Create surface with target dimensions
  const surface = Skia.Surface.Make(targetSize, targetSize);
  if (!surface) {
    throw new Error('Failed to create Skia surface for preprocessing');
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('white'));

  // Draw scaled image preserving aspect ratio
  const scale = Math.min(targetSize / origWidth, targetSize / origHeight);
  const drawW = origWidth * scale;
  const drawH = origHeight * scale;

  const srcRect = Skia.XYWHRect(0, 0, origWidth, origHeight);
  const dstRect = Skia.XYWHRect(0, 0, drawW, drawH);
  canvas.drawImageRect(image, srcRect, dstRect, Skia.Paint());
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const pixelBytes = snapshot.readPixels(); // RGBA bytes [targetSize * targetSize * 4]

  if (!pixelBytes) {
    throw new Error('Failed to read pixels from Skia surface');
  }

  // Convert HWC (RGBA) to CHW (RGB) Float32 normalized tensor
  const channelSize = targetSize * targetSize;
  const tensor = new Float32Array(3 * channelSize);

  const rOffset = 0;
  const gOffset = channelSize;
  const bOffset = 2 * channelSize;

  for (let i = 0; i < channelSize; i++) {
    const pIdx = i * 4;
    const r = pixelBytes[pIdx] / 255.0;
    const g = pixelBytes[pIdx + 1] / 255.0;
    const b = pixelBytes[pIdx + 2] / 255.0;

    tensor[rOffset + i] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    tensor[gOffset + i] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    tensor[bOffset + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }

  return {
    data: tensor,
    dims: [1, 3, targetSize, targetSize],
    origWidth,
    origHeight,
  };
}

/**
 * Preprocesses a cropped bounding box from the original image for Recognition [1, 3, 32, 128]
 */
export async function preprocessCropForRecognition(
  imageUri: string,
  box: { x: number; y: number; width: number; height: number },
  targetH: number = 32,
  targetW: number = 128
): Promise<Float32Array> {
  const file = new File(imageUri);
  const buffer = await file.arrayBuffer();
  const skData = Skia.Data.fromBytes(new Uint8Array(buffer));
  const image = Skia.Image.MakeImageFromEncoded(skData);

  if (!image) {
    return new Float32Array(3 * targetH * targetW);
  }

  const surface = Skia.Surface.Make(targetW, targetH);
  if (!surface) {
    return new Float32Array(3 * targetH * targetW);
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('white'));

  const srcRect = Skia.XYWHRect(box.x, box.y, box.width, box.height);
  const dstRect = Skia.XYWHRect(0, 0, targetW, targetH);
  canvas.drawImageRect(image, srcRect, dstRect, Skia.Paint());
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const pixelBytes = snapshot.readPixels();
  if (!pixelBytes) {
    return new Float32Array(3 * targetH * targetW);
  }

  const channelSize = targetH * targetW;
  const tensor = new Float32Array(3 * channelSize);

  for (let i = 0; i < channelSize; i++) {
    const pIdx = i * 4;
    const r = pixelBytes[pIdx] / 255.0;
    const g = pixelBytes[pIdx + 1] / 255.0;
    const b = pixelBytes[pIdx + 2] / 255.0;

    tensor[i] = (r - 0.5) / 0.5;
    tensor[channelSize + i] = (g - 0.5) / 0.5;
    tensor[2 * channelSize + i] = (b - 0.5) / 0.5;
  }

  return tensor;
}
