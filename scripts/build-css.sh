#!/bin/bash

# ==========================================================================
# CSS Build Script
# Optimizes CSS for production deployment
# ==========================================================================

set -e

# Configuration
CSS_DIR="cjpayment/web/static/css"
BUILD_DIR="cjpayment/web/static/css/dist"
CRITICAL_CSS_FILE="$BUILD_DIR/critical.min.css"
MAIN_CSS_FILE="$BUILD_DIR/main.min.css"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CSS build process...${NC}"

# Create build directory
mkdir -p "$BUILD_DIR"

# Function to minify CSS (basic minification)
minify_css() {
    local input_file="$1"
    local output_file="$2"
    
    if [ ! -f "$input_file" ]; then
        echo -e "${RED}❌ Input file not found: $input_file${NC}"
        return 1
    fi
    
    # Basic CSS minification using sed
    sed -e 's/\/\*[^*]*\*\///g' \
        -e 's/^[[:space:]]*//g' \
        -e 's/[[:space:]]*$//g' \
        -e '/^$/d' \
        -e 's/[[:space:]]*{[[:space:]]*/{/g' \
        -e 's/[[:space:]]*}[[:space:]]*/}/g' \
        -e 's/[[:space:]]*:[[:space:]]*/:/g' \
        -e 's/[[:space:]]*;[[:space:]]*/;/g' \
        -e 's/[[:space:]]*,[[:space:]]*/,/g' \
        "$input_file" > "$output_file"
    
    echo -e "${GREEN}✅ Minified: $(basename "$input_file") -> $(basename "$output_file")${NC}"
}

# Function to combine CSS files
combine_css() {
    local output_file="$1"
    shift
    local input_files=("$@")
    
    echo "/* Combined CSS - Generated $(date) */" > "$output_file"
    
    for file in "${input_files[@]}"; do
        if [ -f "$file" ]; then
            echo "" >> "$output_file"
            echo "/* === $(basename "$file") === */" >> "$output_file"
            cat "$file" >> "$output_file"
        else
            echo -e "${YELLOW}⚠️  File not found: $file${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Combined ${#input_files[@]} files into $(basename "$output_file")${NC}"
}

# Step 1: Build critical CSS
echo -e "${BLUE}📦 Building critical CSS...${NC}"
if [ -f "$CSS_DIR/critical.css" ]; then
    minify_css "$CSS_DIR/critical.css" "$CRITICAL_CSS_FILE"
else
    echo -e "${YELLOW}⚠️  Critical CSS file not found, skipping...${NC}"
fi

# Step 2: Combine and minify main CSS
echo -e "${BLUE}📦 Building main CSS bundle...${NC}"

# Define CSS files in load order
CSS_FILES=(
    "$CSS_DIR/tokens/colors.css"
    "$CSS_DIR/tokens/spacing.css"
    "$CSS_DIR/tokens/typography.css"
    "$CSS_DIR/tokens/layout.css"
    "$CSS_DIR/foundation/reset.css"
    "$CSS_DIR/foundation/layout.css"
    "$CSS_DIR/components/button.css"
    "$CSS_DIR/components/card.css"
    "$CSS_DIR/utilities/utilities.css"
)

# Combine CSS files
TEMP_COMBINED="$BUILD_DIR/main.combined.css"
combine_css "$TEMP_COMBINED" "${CSS_FILES[@]}"

# Minify combined CSS
minify_css "$TEMP_COMBINED" "$MAIN_CSS_FILE"

# Clean up temporary file
rm -f "$TEMP_COMBINED"

# Step 3: Build component-specific CSS files
echo -e "${BLUE}📦 Building component CSS files...${NC}"

COMPONENT_FILES=(
    "auth.css"
    "financial_audit.css"
    "private_recharge.css"
    "public_recharge.css"
    "recharge_management.css"
    "report_dashboard.css"
    "system_management.css"
)

for component in "${COMPONENT_FILES[@]}"; do
    if [ -f "$CSS_DIR/$component" ]; then
        output_file="$BUILD_DIR/$(basename "$component" .css).min.css"
        minify_css "$CSS_DIR/$component" "$output_file"
    fi
done

# Step 4: Generate CSS manifest
echo -e "${BLUE}📦 Generating CSS manifest...${NC}"
MANIFEST_FILE="$BUILD_DIR/manifest.json"

cat > "$MANIFEST_FILE" << EOF
{
  "version": "$(date +%s)",
  "files": {
    "critical": "critical.min.css",
    "main": "main.min.css",
    "components": {
EOF

first=true
for component in "${COMPONENT_FILES[@]}"; do
    if [ -f "$CSS_DIR/$component" ]; then
        component_name=$(basename "$component" .css)
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$MANIFEST_FILE"
        fi
        echo -n "      \"$component_name\": \"$component_name.min.css\"" >> "$MANIFEST_FILE"
    fi
done

cat >> "$MANIFEST_FILE" << EOF

    }
  },
  "integrity": {
EOF

# Generate integrity hashes (basic implementation)
first=true
for file in "$CRITICAL_CSS_FILE" "$MAIN_CSS_FILE"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        hash=$(shasum -a 256 "$file" | cut -d' ' -f1)
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$MANIFEST_FILE"
        fi
        echo -n "    \"$filename\": \"sha256-$hash\"" >> "$MANIFEST_FILE"
    fi
done

cat >> "$MANIFEST_FILE" << EOF

  }
}
EOF

echo -e "${GREEN}✅ Generated CSS manifest${NC}"

# Step 5: Generate file size report
echo -e "${BLUE}📊 Generating size report...${NC}"

REPORT_FILE="$BUILD_DIR/size-report.txt"
echo "CSS Build Size Report - $(date)" > "$REPORT_FILE"
echo "======================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

total_size=0
for file in "$BUILD_DIR"/*.min.css; do
    if [ -f "$file" ]; then
        size=$(wc -c < "$file")
        size_kb=$((size / 1024))
        filename=$(basename "$file")
        printf "%-25s %6d bytes (%d KB)\n" "$filename" "$size" "$size_kb" >> "$REPORT_FILE"
        total_size=$((total_size + size))
    fi
done

echo "" >> "$REPORT_FILE"
echo "======================================" >> "$REPORT_FILE"
total_kb=$((total_size / 1024))
printf "%-25s %6d bytes (%d KB)\n" "TOTAL" "$total_size" "$total_kb" >> "$REPORT_FILE"

echo -e "${GREEN}✅ Generated size report${NC}"

# Display summary
echo ""
echo -e "${GREEN}🎉 CSS build completed successfully!${NC}"
echo -e "${BLUE}📁 Output directory: $BUILD_DIR${NC}"
echo -e "${BLUE}📊 Total size: ${total_kb} KB${NC}"
echo ""
echo -e "${YELLOW}📋 Generated files:${NC}"
ls -la "$BUILD_DIR"/*.min.css 2>/dev/null || echo "No minified CSS files found"

# Step 6: Validate CSS (basic validation)
echo -e "${BLUE}🔍 Validating CSS files...${NC}"

validation_errors=0
for file in "$BUILD_DIR"/*.min.css; do
    if [ -f "$file" ]; then
        # Basic CSS validation - check for unmatched braces
        open_braces=$(grep -o '{' "$file" | wc -l)
        close_braces=$(grep -o '}' "$file" | wc -l)
        
        if [ "$open_braces" -ne "$close_braces" ]; then
            echo -e "${RED}❌ Validation error in $(basename "$file"): Unmatched braces${NC}"
            validation_errors=$((validation_errors + 1))
        else
            echo -e "${GREEN}✅ $(basename "$file") - OK${NC}"
        fi
    fi
done

if [ "$validation_errors" -eq 0 ]; then
    echo -e "${GREEN}🎉 All CSS files passed validation!${NC}"
    exit 0
else
    echo -e "${RED}❌ $validation_errors CSS files failed validation${NC}"
    exit 1
fi