#!/bin/bash

# Redirect stderr to stdout so execute_command does not error out on stderr output
exec 2>&1

set -e

# Get the directory the script lives in (the .zscripts directory, i.e. workspace-agent/.zscripts)
# Use $0 to resolve the script path (compatible with both sh and bash)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Next.js project path
NEXTJS_PROJECT_DIR="/home/z/my-project"

# Check that the Next.js project directory exists
if [ ! -d "$NEXTJS_PROJECT_DIR" ]; then
    echo "❌ Error: Next.js project directory does not exist: $NEXTJS_PROJECT_DIR"
    exit 1
fi

echo "🚀 Building the Next.js app and mini-services..."
echo "📁 Next.js project path: $NEXTJS_PROJECT_DIR"

# Change into the Next.js project directory
cd "$NEXTJS_PROJECT_DIR" || exit 1

# Set environment variables
export NEXT_TELEMETRY_DISABLED=1

BUILD_DIR="/tmp/build_fullstack_$BUILD_ID"
echo "📁 Cleaning and creating the build directory: $BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the Next.js app
echo "🔨 Building the Next.js app..."
bun run build

# Verify that the standalone server entry point was generated (a deployment success-rate guard).
# Next.js only emits .next/standalone/server.js when next.config contains output:"standalone".
# If the user/AI rewrote or removed that setting while editing the project, bun run build still
# succeeds (static output is emitted as usual, exit code 0), but standalone is missing — the package
# then has no server.js, and after deploying to FC start.sh cannot find next-service-dist/server.js → Next never starts →
# Caddy:81 reverse-proxies an empty port 3000 → the 120s FC health check times out (the main cause of live warmup_412 / FunctionNotStarted).
# Self-heal here: only when it is genuinely missing, restore output:"standalone" in next.config and rebuild.
# Normal projects (server.js already generated) skip this entire block; no user files are read or written.
if [ ! -f ".next/standalone/server.js" ]; then
    echo "⚠️  The build did not produce .next/standalone/server.js; self-healing the output setting in next.config..."
    NEXT_CONFIG_FILE="$(ls next.config.ts next.config.js next.config.mjs next.config.cjs 2>/dev/null | head -1)"

    if [ -z "$NEXT_CONFIG_FILE" ]; then
        echo "❌ Build failed: no next.config.* found; cannot generate the standalone deployment artifacts."
        exit 1
    fi

    if grep -Eq "output\s*:\s*['\"]standalone['\"]" "$NEXT_CONFIG_FILE"; then
        # output:"standalone" is declared yet server.js was still not produced, so this is not a missing
        # config (a genuinely failed build, a custom distDir, etc.); do not second-guess the user's config — fail fast and surface the cause.
        echo "❌ Build failed: $NEXT_CONFIG_FILE already contains output:\"standalone\", but .next/standalone/server.js was still not generated."
        echo "   Check the build errors in the log above or the project's custom build configuration."
        exit 1
    fi

    if grep -Eq "output\s*:\s*['\"]" "$NEXT_CONFIG_FILE"; then
        # A different output is explicitly declared (e.g. "export" static export / a value other than "standalone").
        # "export" is mutually exclusive with this deployment model (standalone + custom server) — a second output
        # must not be injected to override the user's intent (duplicate JS object keys: the latter wins, so injection would not work anyway). Fail explicitly.
        echo "❌ Build failed: $NEXT_CONFIG_FILE declares a non-standalone output (e.g. \"export\" static export), which is incompatible with the current deployment model."
        echo "   This deployment requires output:\"standalone\". Switch to standalone, or confirm whether this project should use static hosting instead of the deployment sandbox."
        exit 1
    fi

    echo "🔧 Detected that $NEXT_CONFIG_FILE is missing output:\"standalone\"; injecting it automatically and rebuilding..."
    cp "$NEXT_CONFIG_FILE" "${NEXT_CONFIG_FILE}.zbak"
    # Insert output:"standalone" right after the opening { of the first config object literal,
    # covering common scaffold patterns: const nextConfig...= {  /  export default {  /  module.exports = {
    perl -0pi -e 's/((?:const\s+\w+[^=]*=|export\s+default|module\.exports\s*=)\s*\{)/$1\n  output: "standalone",/' "$NEXT_CONFIG_FILE"

    if ! grep -Eq "output\s*:\s*['\"]standalone['\"]" "$NEXT_CONFIG_FILE"; then
        echo "❌ Could not match an injectable config object; next.config uses an unconventional style and needs output:\"standalone\" added manually."
        echo "   Current $NEXT_CONFIG_FILE contents:"
        cat "$NEXT_CONFIG_FILE"
        mv "${NEXT_CONFIG_FILE}.zbak" "$NEXT_CONFIG_FILE"
        exit 1
    fi

    echo "🔨 Injected output:\"standalone\"; rebuilding..."
    bun run build

    if [ ! -f ".next/standalone/server.js" ]; then
        echo "❌ Even after injecting output:\"standalone\" and rebuilding, .next/standalone/server.js was still not generated."
        exit 1
    fi
    echo "✅ Self-heal succeeded: the standalone server entry point has been generated."
fi

# Build mini-services
# Check whether a mini-services directory exists under the Next.js project directory
if [ -d "$NEXTJS_PROJECT_DIR/mini-services" ]; then
    echo "🔨 Building mini-services..."
    # Use the mini-services scripts from the workspace-agent directory
    sh "$SCRIPT_DIR/mini-services-install.sh"
    sh "$SCRIPT_DIR/mini-services-build.sh"

    # Copy mini-services-start.sh into the mini-services-dist directory
    echo "  - Copying mini-services-start.sh to $BUILD_DIR"
    cp "$SCRIPT_DIR/mini-services-start.sh" "$BUILD_DIR/mini-services-start.sh"
    chmod +x "$BUILD_DIR/mini-services-start.sh"
else
    echo "ℹ️  mini-services directory does not exist, skipping"
fi

# Copy all build artifacts into the temporary build directory
echo "📦 Collecting build artifacts into $BUILD_DIR..."

# Copy the Next.js standalone build output
if [ -d ".next/standalone" ]; then
    echo "  - Copying .next/standalone"
    cp -r .next/standalone "$BUILD_DIR/next-service-dist/"
fi

# Copy the Next.js static files
if [ -d ".next/static" ]; then
    echo "  - Copying .next/static"
    mkdir -p "$BUILD_DIR/next-service-dist/.next"
    cp -r .next/static "$BUILD_DIR/next-service-dist/.next/"
fi

# Copy the public directory
if [ -d "public" ]; then
    echo "  - Copying public"
    cp -r public "$BUILD_DIR/next-service-dist/"
fi

# Python does not inherit workspace-agent's /home/z/.venv. If the project contains Python sources or
# a dependency manifest, freeze the production dependencies into the artifacts at build time and keep the Python sources at their project-relative paths.
PROJECT_DIR="$NEXTJS_PROJECT_DIR" BUILD_DIR="$BUILD_DIR" \
    bash "$SCRIPT_DIR/python-runtime-build.sh"

# When a Preview database exists, copy its existing data; otherwise initialize an empty database directly in the deployment artifacts.
# Template sources do not ship db/custom.db, so we cannot rely on dev.sh having run successfully before Deploy.
PROJECT_DIR="$NEXTJS_PROJECT_DIR" BUILD_DIR="$BUILD_DIR" \
    bash "$SCRIPT_DIR/database-runtime-build.sh"

# Copy the Caddyfile (if it exists)
if [ -f "Caddyfile" ]; then
    echo "  - Copying Caddyfile"
    cp Caddyfile "$BUILD_DIR/"
else
    echo "ℹ️  Caddyfile does not exist, skipping"
fi

# Copy the start.sh script
echo "  - Copying start.sh to $BUILD_DIR"
cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"

# Package into $BUILD_DIR.tar.gz
PACKAGE_FILE="${BUILD_DIR}.tar.gz"
echo ""
echo "📦 Packaging the build artifacts into $PACKAGE_FILE..."
cd "$BUILD_DIR" || exit 1
tar -czf "$PACKAGE_FILE" .
cd - > /dev/null || exit 1

# # Clean up the temporary directory
# rm -rf "$BUILD_DIR"

echo ""
echo "✅ Build complete! All artifacts have been packaged into $PACKAGE_FILE"
echo "📊 Packaged file size:"
ls -lh "$PACKAGE_FILE"
