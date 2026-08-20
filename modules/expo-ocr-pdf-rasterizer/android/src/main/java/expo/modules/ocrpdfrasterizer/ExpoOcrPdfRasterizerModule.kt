package expo.modules.ocrpdfrasterizer

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File
import java.io.FileOutputStream

class ExpoOcrPdfRasterizerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exception("React context is null")

  override fun definition() = ModuleDefinition {
    Name("ExpoOcrPdfRasterizer")

    AsyncFunction("getPageCount") { fileUri: String, promise: Promise ->
      try {
        val pfd = openFileDescriptor(fileUri)
        val renderer = PdfRenderer(pfd)
        val count = renderer.pageCount
        renderer.close()
        pfd.close()
        promise.resolve(count)
      } catch (e: Exception) {
        promise.reject("ERR_PDF_OPEN", e.message, e)
      }
    }

    AsyncFunction("renderPage") { fileUri: String, pageIndex: Int, scale: Double, promise: Promise ->
      try {
        val pfd = openFileDescriptor(fileUri)
        val renderer = PdfRenderer(pfd)
        if (pageIndex < 0 || pageIndex >= renderer.pageCount) {
          renderer.close()
          pfd.close()
          promise.reject("ERR_PDF_PAGE", "Page $pageIndex out of range", null)
          return@AsyncFunction
        }
        val page = renderer.openPage(pageIndex)
        val renderScale = scale.coerceIn(0.5, 4.0).toFloat()
        val width = (page.width * renderScale).toInt()
        val height = (page.height * renderScale).toInt()

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
        page.close()
        renderer.close()
        pfd.close()

        val outFile = File(context.cacheDir, "pdf_page_${System.currentTimeMillis()}_$pageIndex.jpg")
        val outStream = FileOutputStream(outFile)
        bitmap.compress(Bitmap.CompressFormat.JPEG, 88, outStream)
        outStream.flush()
        outStream.close()
        bitmap.recycle()

        promise.resolve(outFile.toURI().toString())
      } catch (e: Exception) {
        promise.reject("ERR_PDF_RENDER", e.message, e)
      }
    }

    AsyncFunction("renderAllPages") { fileUri: String, scale: Double, promise: Promise ->
      try {
        val pfd = openFileDescriptor(fileUri)
        val renderer = PdfRenderer(pfd)
        val renderScale = scale.coerceIn(0.5, 4.0).toFloat()
        val results = mutableListOf<String>()

        for (i in 0 until renderer.pageCount) {
          val page = renderer.openPage(i)
          val width = (page.width * renderScale).toInt()
          val height = (page.height * renderScale).toInt()

          val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
          val canvas = Canvas(bitmap)
          canvas.drawColor(Color.WHITE)

          page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
          page.close()

          val outFile = File(context.cacheDir, "pdf_page_${System.currentTimeMillis()}_$i.jpg")
          val outStream = FileOutputStream(outFile)
          bitmap.compress(Bitmap.CompressFormat.JPEG, 88, outStream)
          outStream.flush()
          outStream.close()
          bitmap.recycle()

          results.add(outFile.toURI().toString())
        }
        renderer.close()
        pfd.close()
        promise.resolve(results)
      } catch (e: Exception) {
        promise.reject("ERR_PDF_RENDER", e.message, e)
      }
    }
  }

  private fun openFileDescriptor(fileUri: String): ParcelFileDescriptor {
    val uri = Uri.parse(fileUri)
    return if (uri.scheme == "content") {
      context.contentResolver.openFileDescriptor(uri, "r")
        ?: throw Exception("Cannot open content URI: $fileUri")
    } else {
      val path = if (fileUri.startsWith("file://")) fileUri.substring(7) else fileUri
      ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
    }
  }
}
