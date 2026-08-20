#import "ContourDetector.h"
#include <algorithm>
#include <cmath>
#include <unordered_map>
#include <vector>

struct ComponentStats {
    int label;
    int minX;
    int maxX;
    int minY;
    int maxY;
    int pixelCount;
    float sumScore;
};

// Disjoint-Set Union for Connected Component Labeling
struct DisjointSet {
    std::vector<int> parent;
    DisjointSet(int n) : parent(n) {
        for (int i = 0; i < n; ++i) parent[i] = i;
    }
    int find(int i) {
        if (parent[i] == i)
            return i;
        return parent[i] = find(parent[i]);
    }
    void unite(int i, int j) {
        int root_i = find(i);
        int root_j = find(j);
        if (root_i != root_j) {
            parent[root_i] = root_j;
        }
    }
};

std::vector<DetectedBox> ExtractBoxesFromProbMap(
    const float* probMap,
    int width,
    int height,
    float threshold,
    float minArea,
    float minScore,
    float unclipRatio,
    int maxCandidates
) {
    std::vector<DetectedBox> results;
    if (!probMap || width <= 0 || height <= 0) {
        return results;
    }

    int totalPixels = width * height;
    std::vector<int> labels(totalPixels, 0);
    int nextLabel = 1;
    DisjointSet ds(totalPixels / 2 + 10);

    // Pass 1: Assign initial labels and record equivalences
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = y * width + x;
            if (probMap[idx] < threshold) {
                continue;
            }

            int top = (y > 0) ? labels[(y - 1) * width + x] : 0;
            int left = (x > 0) ? labels[y * width + (x - 1)] : 0;
            int topLeft = (y > 0 && x > 0) ? labels[(y - 1) * width + (x - 1)] : 0;
            int topRight = (y > 0 && x + 1 < width) ? labels[(y - 1) * width + (x + 1)] : 0;

            int minNeighbor = 0;
            auto checkNeighbor = [&](int neighbor) {
                if (neighbor > 0) {
                    if (minNeighbor == 0 || neighbor < minNeighbor) {
                        minNeighbor = neighbor;
                    }
                }
            };

            checkNeighbor(top);
            checkNeighbor(left);
            checkNeighbor(topLeft);
            checkNeighbor(topRight);

            if (minNeighbor == 0) {
                labels[idx] = nextLabel;
                if (nextLabel < (int)ds.parent.size() - 1) {
                    nextLabel++;
                }
            } else {
                labels[idx] = minNeighbor;
                if (top > 0) ds.unite(minNeighbor, top);
                if (left > 0) ds.unite(minNeighbor, left);
                if (topLeft > 0) ds.unite(minNeighbor, topLeft);
                if (topRight > 0) ds.unite(minNeighbor, topRight);
            }
        }
    }

    // Pass 2: Resolve equivalence classes & accumulate component stats
    std::unordered_map<int, ComponentStats> componentMap;

    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = y * width + x;
            int lbl = labels[idx];
            if (lbl == 0) continue;

            int rootLabel = ds.find(lbl);
            float score = probMap[idx];

            auto it = componentMap.find(rootLabel);
            if (it == componentMap.end()) {
                ComponentStats stats;
                stats.label = rootLabel;
                stats.minX = x;
                stats.maxX = x;
                stats.minY = y;
                stats.maxY = y;
                stats.pixelCount = 1;
                stats.sumScore = score;
                componentMap[rootLabel] = stats;
            } else {
                it->second.minX = std::min(it->second.minX, x);
                it->second.maxX = std::max(it->second.maxX, x);
                it->second.minY = std::min(it->second.minY, y);
                it->second.maxY = std::max(it->second.maxY, y);
                it->second.pixelCount += 1;
                it->second.sumScore += score;
            }
        }
    }

    // Process components and perform unclip expansion
    for (const auto& pair : componentMap) {
        const ComponentStats& stats = pair.second;
        if (stats.pixelCount < minArea) {
            continue;
        }

        float meanScore = stats.sumScore / (float)stats.pixelCount;
        if (meanScore < minScore) {
            continue;
        }

        float boxW = (float)(stats.maxX - stats.minX + 1);
        float boxH = (float)(stats.maxY - stats.minY + 1);

        // Vatti unclip expansion factor: expansion distance d = Area * (1 - ratio^2) / Perimeter
        float perimeter = 2.0f * (boxW + boxH);
        float distance = (unclipRatio > 1.0f && perimeter > 0.0f)
            ? ((float)stats.pixelCount * (unclipRatio - 1.0f)) / perimeter
            : 0.0f;

        float expMinX = std::max(0.0f, (float)stats.minX - distance);
        float expMinY = std::max(0.0f, (float)stats.minY - distance);
        float expMaxX = std::min((float)(width - 1), (float)stats.maxX + distance);
        float expMaxY = std::min((float)(height - 1), (float)stats.maxY + distance);

        float finalW = expMaxX - expMinX;
        float finalH = expMaxY - expMinY;

        if (finalW > 2.0f && finalH > 2.0f) {
            DetectedBox box;
            box.x = expMinX;
            box.y = expMinY;
            box.width = finalW;
            box.height = finalH;
            box.score = meanScore;
            results.push_back(box);
        }

        if ((int)results.size() >= maxCandidates) {
            break;
        }
    }

    // Sort boxes into natural top-to-bottom, left-to-right reading order
    std::sort(results.begin(), results.end(), [](const DetectedBox& a, const DetectedBox& b) {
        float lineThreshold = std::min(a.height, b.height) * 0.5f;
        if (std::abs(a.y - b.y) > lineThreshold) {
            return a.y < b.y;
        }
        return a.x < b.x;
    });

    return results;
}
