import Foundation
import ExpoModulesCore

public class ExpoContourDetectorModule: Module {

  public func definition() -> ModuleDefinition {
    Name("ExpoContourDetector")

    // Synchronous native C++ extraction from base64 binary buffer (Float32Array)
    Function("extractBoundingBoxes") { (
      base64Map: String,
      width: Int,
      height: Int,
      threshold: Double,
      minArea: Double,
      minScore: Double,
      unclipRatio: Double,
      maxCandidates: Int
    ) -> [[String: Any]] in
      return ContourDetectorBridge.extractBoxes(
        fromBase64: base64Map,
        width: Int32(width),
        height: Int32(height),
        threshold: Float(threshold),
        minArea: Float(minArea),
        minScore: Float(minScore),
        unclipRatio: Float(unclipRatio),
        maxCandidates: Int32(maxCandidates)
      ) as? [[String: Any]] ?? []
    }

    // Async extraction for large heatmaps
    AsyncFunction("extractBoundingBoxesAsync") { (
      base64Map: String,
      width: Int,
      height: Int,
      threshold: Double,
      minArea: Double,
      minScore: Double,
      unclipRatio: Double,
      maxCandidates: Int,
      promise: Promise
    ) in
      DispatchQueue.global(qos: .userInitiated).async {
        let results = ContourDetectorBridge.extractBoxes(
          fromBase64: base64Map,
          width: Int32(width),
          height: Int32(height),
          threshold: Float(threshold),
          minArea: Float(minArea),
          minScore: Float(minScore),
          unclipRatio: Float(unclipRatio),
          maxCandidates: Int32(maxCandidates)
        )
        DispatchQueue.main.async {
          promise.resolve(results)
        }
      }
    }
  }
}
