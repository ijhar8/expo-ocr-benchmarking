#!/bin/bash
set -e

export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
export EXPO_USE_COMMUNITY_AUTOLINKING=1

echo "⚙️  Building Android Standalone APK locally..."
cd "$(dirname "$0")/../android"

./gradlew assembleRelease --no-daemon --no-build-cache

echo ""
echo "✅ Build Complete!"
echo "📍 APK Location:"
find "$(pwd)/app/build/outputs/apk" -name "*.apk" 2>/dev/null || find "$(pwd)/app/build" -name "*.apk" 2>/dev/null
