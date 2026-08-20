Pod::Spec.new do |s|
  s.name           = 'ExpoContourDetector'
  s.version        = '1.0.0'
  s.summary        = 'C++ contour and bounding box detector for DBNet/FAST probability maps'
  s.description    = 'C++ contour and bounding box detector for DBNet/FAST probability maps'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.source_files   = 'ios/**/*.{h,m,mm,swift,cpp}'
  s.dependency 'ExpoModulesCore'
  s.swift_version  = '5.0'
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++'
  }
end
