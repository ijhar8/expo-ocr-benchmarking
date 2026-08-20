Pod::Spec.new do |s|
  s.name           = 'ExpoOcrPdfRasterizer'
  s.version        = '1.0.0'
  s.summary        = 'PDF rasterizer for OCR'
  s.description    = 'PDF rasterizer for OCR'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.source_files   = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.swift_version  = '5.0'
end
