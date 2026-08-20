package expo.modules.contourdetector

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoContourDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoContourDetector")

    Function("extractBoundingBoxes") { base64Map: String, width: Int, height: Int, threshold: Double, minArea: Double, minScore: Double, unclipRatio: Double, maxCandidates: Int ->
      emptyList<Map<String, Any>>()
    }
  }
}
