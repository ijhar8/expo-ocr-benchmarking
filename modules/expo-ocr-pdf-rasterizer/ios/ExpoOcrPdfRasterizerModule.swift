import Foundation
import PDFKit
import ExpoModulesCore

public class ExpoOcrPdfRasterizerModule: Module {

  public func definition() -> ModuleDefinition {
    Name("ExpoOcrPdfRasterizer")

    // Returns the number of pages in the PDF
    AsyncFunction("getPageCount") { (fileUri: String, promise: Promise) in
      guard let url = Self.localURL(from: fileUri),
            let doc = PDFDocument(url: url) else {
        promise.reject("ERR_PDF_OPEN", "Cannot open PDF at \(fileUri)")
        return
      }
      promise.resolve(doc.pageCount)
    }

    // Renders a single page (0-indexed) to a JPEG in the temp directory
    // Returns the file:// URI of the resulting JPEG
    AsyncFunction("renderPage") { (fileUri: String, pageIndex: Int, scale: Double, promise: Promise) in
      guard let url = Self.localURL(from: fileUri),
            let doc = PDFDocument(url: url) else {
        promise.reject("ERR_PDF_OPEN", "Cannot open PDF at \(fileUri)")
        return
      }
      guard let page = doc.page(at: pageIndex) else {
        promise.reject("ERR_PDF_PAGE", "Page \(pageIndex) does not exist")
        return
      }

      let pageRect = page.bounds(for: .mediaBox)
      let renderScale = CGFloat(max(0.5, min(scale, 4.0)))
      let renderSize = CGSize(
        width: pageRect.width * renderScale,
        height: pageRect.height * renderScale
      )

      let renderer = UIGraphicsImageRenderer(size: renderSize)
      let image = renderer.image { ctx in
        // White background
        UIColor.white.set()
        ctx.fill(CGRect(origin: .zero, size: renderSize))

        ctx.cgContext.saveGState()
        ctx.cgContext.scaleBy(x: renderScale, y: renderScale)
        // PDFKit draws bottom-up; flip vertically
        ctx.cgContext.translateBy(x: 0, y: pageRect.height)
        ctx.cgContext.scaleBy(x: 1, y: -1)
        page.draw(with: .mediaBox, to: ctx.cgContext)
        ctx.cgContext.restoreGState()
      }

      guard let jpegData = image.jpegData(compressionQuality: 0.88) else {
        promise.reject("ERR_PDF_RENDER", "Failed to encode page as JPEG")
        return
      }

      let tempDir = FileManager.default.temporaryDirectory
      let fileName = "pdf_page_\(Int(Date().timeIntervalSince1970 * 1000))_\(pageIndex).jpg"
      let outURL = tempDir.appendingPathComponent(fileName)

      do {
        try jpegData.write(to: outURL)
        promise.resolve(outURL.absoluteString)
      } catch {
        promise.reject("ERR_PDF_WRITE", "Cannot write temp file: \(error.localizedDescription)")
      }
    }

    // Convenience: render all pages, return array of file:// URIs
    AsyncFunction("renderAllPages") { (fileUri: String, scale: Double, promise: Promise) in
      guard let url = Self.localURL(from: fileUri),
            let doc = PDFDocument(url: url) else {
        promise.reject("ERR_PDF_OPEN", "Cannot open PDF at \(fileUri)")
        return
      }

      var results: [String] = []
      for i in 0..<doc.pageCount {
        guard let page = doc.page(at: i) else { continue }
        let pageRect = page.bounds(for: .mediaBox)
        let renderScale = CGFloat(max(0.5, min(scale, 4.0)))
        let renderSize = CGSize(
          width: pageRect.width * renderScale,
          height: pageRect.height * renderScale
        )

        let renderer = UIGraphicsImageRenderer(size: renderSize)
        let image = renderer.image { ctx in
          UIColor.white.set()
          ctx.fill(CGRect(origin: .zero, size: renderSize))
          ctx.cgContext.saveGState()
          ctx.cgContext.scaleBy(x: renderScale, y: renderScale)
          ctx.cgContext.translateBy(x: 0, y: pageRect.height)
          ctx.cgContext.scaleBy(x: 1, y: -1)
          page.draw(with: .mediaBox, to: ctx.cgContext)
          ctx.cgContext.restoreGState()
        }

        if let jpegData = image.jpegData(compressionQuality: 0.88) {
          let tempDir = FileManager.default.temporaryDirectory
          let fileName = "pdf_page_\(Int(Date().timeIntervalSince1970 * 1000))_\(i).jpg"
          let outURL = tempDir.appendingPathComponent(fileName)
          try? jpegData.write(to: outURL)
          results.append(outURL.absoluteString)
        }
      }
      promise.resolve(results)
    }
  }

  // Converts file:// or bare path to a URL the system can open
  private static func localURL(from fileUri: String) -> URL? {
    if fileUri.hasPrefix("file://") {
      return URL(string: fileUri)
    }
    return URL(fileURLWithPath: fileUri)
  }
}
