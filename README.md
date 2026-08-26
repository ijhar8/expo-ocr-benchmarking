# OCR MVP

![Expo](https://img.shields.io/badge/Expo-57-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.86-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A React Native (Expo) application for benchmarking and comparing on-device OCR engines on mobile devices.

## Overview

This app provides a platform to evaluate and compare different OCR engines running on-device, specifically targeting invoice processing use cases. It supports:

- **ML Kit** (Google's on-device text recognition)
- **PP-OCRv6** (PaddlePaddle's OCR engine)
- **DocTR** (Mindee's document text recognition)

## Features

- Real-time OCR benchmarking on captured images
- Side-by-side comparison of OCR engine results
- Confidence scoring and latency measurements
- Invoice field extraction utilities
- PDF document support
- Cross-platform (iOS & Android)

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- For iOS: Xcode 15+ and CocoaPods
- For Android: Android Studio and JDK 17

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd ocr-mvp

# Install dependencies
npm install

# Install iOS pods (macOS only)
cd ios && pod install && cd ..
```

## Usage

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Build APK
npm run build:apk
```

## Project Structure

```
ocr-mvp/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   ├── result.tsx         # OCR result display
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # React context providers
│   ├── engines/           # OCR engine implementations
│   │   ├── mlkit.ts       # Google ML Kit integration
│   │   ├── paddle.ts      # PaddleOCR integration
│   │   └── doctr.ts       # DocTR integration
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── modules/               # Local Expo modules
│   ├── expo-contour-detector/
│   └── expo-ocr-pdf-rasterizer/
├── assets/                # Static assets
└── scripts/               # Build scripts
```

## OCR Engines

### ML Kit

Google's on-device text recognition with zero binary cost. Supports Latin and Devanagari scripts.

### PP-OCRv6

PaddlePaddle's lightweight OCR engine with multiple tiers:
- **Tiny**: 1.5M params, ~3-6 MB
- **Small**: 7.7M params, ~15-30 MB (recommended)
- **Medium**: 34.5M params, ~70-140 MB

### DocTR

Mindee's document text recognition with rich confidence signals including per-word confidence and objectness scores.

## Configuration

Environment variables can be configured in `.env`:

```bash
EXPO_USE_COMMUNITY_AUTOLINKING=1
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Expo](https://expo.dev) for the React Native framework
- [PaddlePaddle](https://paddlepaddle.github.io/PaddleOCR/) for PP-OCR
- [Mindee](https://github.com/mindee/doctr) for DocTR
- [Google ML Kit](https://developers.google.com/ml-kit) for on-device text recognition
