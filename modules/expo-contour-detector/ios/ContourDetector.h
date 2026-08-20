#pragma once

#include <vector>
#include <cstdint>

struct DetectedBox {
    float x;
    float y;
    float width;
    float height;
    float score;
};

#ifdef __cplusplus
extern "C" {
#endif

std::vector<DetectedBox> ExtractBoxesFromProbMap(
    const float* probMap,
    int width,
    int height,
    float threshold = 0.3f,
    float minArea = 10.0f,
    float minScore = 0.5f,
    float unclipRatio = 1.6f,
    int maxCandidates = 1000
);

#ifdef __cplusplus
}
#endif
