#!/bin/bash

# Build script for macOS ARM64 without rebuilding native modules
# This assumes the webpack build has already been done

echo "Building MarkText for macOS ARM64..."

# Check if dist/electron exists
if [ ! -d "dist/electron" ]; then
    echo "Error: dist/electron directory not found. Please run 'yarn run build:dev' first."
    exit 1
fi

# Create a temporary electron-builder config that skips native module rebuild
cat > electron-builder-temp.yml << EOF
productName: "MarkText"
appId: "com.github.marktext.marktext"
asar: true
asarUnpack:
- "**/*.node"
directories:
  output: "build"
buildDependenciesFromSource: false
npmRebuild: false
nodeGypRebuild: false
files:
- "dist/electron/**/*"
- "!**/node_modules/**/{CHANGELOG.md,README.md,README,readme.md,readme}"
- "!node_modules/**/*.js.map"
- "!node_modules/**/*.cjs.map"
- "!node_modules/**/*.mjs.map"
- "!node_modules/**/*.ts.map"
extraFiles:
- "LICENSE"
mac:
  artifactName: "marktext-arm64-mac.\${ext}"
  icon: "resources/icons/icon.icns"
  darkModeSupport: true
  target:
    - target: dmg
      arch: [arm64]
dmg:
  artifactName: "marktext-arm64.\${ext}"
  contents:
  - x: 410
    y: 240
    type: "link"
    path: "/Applications"
  - x: 130
    y: 240
    type: "file"
EOF

# Run electron-builder with the temporary config (skip code signing)
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --config electron-builder-temp.yml --mac --arm64

# Clean up
rm -f electron-builder-temp.yml

echo "Build complete! Check the build/ directory for the output."