#!/bin/bash

echo "Fixing native modules for ARM64 macOS..."

# Install python-setuptools for distutils support
pip3 install setuptools 2>/dev/null || true

# Set environment variables for electron
export npm_config_target=18.0.4
export npm_config_arch=arm64
export npm_config_target_arch=arm64
export npm_config_disturl=https://electronjs.org/headers
export npm_config_runtime=electron
export npm_config_build_from_source=true

# Create a temporary Python wrapper to fix distutils issue
cat > /tmp/python3-wrapper.py << 'EOF'
#!/usr/bin/env python3
import sys
import subprocess

# Try to import distutils, if it fails, set it up
try:
    import distutils
except ImportError:
    import setuptools
    import distutils

# Run the original script
if __name__ == "__main__":
    sys.exit(subprocess.call([sys.executable] + sys.argv[1:]))
EOF

chmod +x /tmp/python3-wrapper.py

# Temporarily use Python wrapper
export PYTHON=/tmp/python3-wrapper.py

# Try to rebuild native modules for electron
echo "Rebuilding native modules..."
cd node_modules/keytar && npm rebuild && cd ../..
cd node_modules/native-keymap && npm rebuild && cd ../..
cd node_modules/fontmanager-redux && npm rebuild && cd ../..
cd node_modules/ced && npm rebuild && cd ../..

# Clean up
rm -f /tmp/python3-wrapper.py

echo "Native modules rebuild attempt complete."