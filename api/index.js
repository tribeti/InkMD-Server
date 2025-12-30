const fs = require("fs").promises;
const path = require("path");

/**
 * Sanitize icon name to prevent path traversal attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function sanitizeIconName(name) {
  const cleanName = name.trim();

  // SECURITY: Only allow safe characters (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
    throw new Error(
      `Invalid icon name: "${name}". Only alphanumeric, hyphens, and underscores are allowed.`,
    );
  }

  // SECURITY: Extra check for path traversal patterns
  if (
    cleanName.includes("..") ||
    cleanName.includes("/") ||
    cleanName.includes("\\")
  ) {
    throw new Error(`Invalid icon name: "${name}". Path traversal detected.`);
  }

  // SECURITY: Prevent overly long names (DoS prevention)
  if (cleanName.length > 100) {
    throw new Error(
      `Invalid icon name: "${name}". Name too long (max 100 chars).`,
    );
  }

  return cleanName;
}

/**
 * Parse and validate query parameters
 */
function parseQueryParams(query) {
  const rawNames = query.i ? query.i.split(",") : [];

  // SECURITY: Validate and sanitize all icon names
  const iconNames = rawNames.map((name) => sanitizeIconName(name));

  const params = {
    iconNames,
    size: parseInt(query.size) || 48,
    gap: parseInt(query.gap) || 12,
    padding: parseInt(query.padding) || 0,
    radius: parseInt(query.radius) || 0,
    layout: query.layout || "h", // h=horizontal, v=vertical, g=grid
    columns: parseInt(query.columns) || 4,
    theme: query.theme || null, // light, dark
    bg: query.bg || null, // hex color without #
    border: query.border || null, // hex color without #
    borderWidth: parseInt(query.borderWidth) || 0,
    shadow: parseInt(query.shadow) || 0, // 0-3
    glow: query.glow === "true",
  };

  // Validation
  if (params.iconNames.length === 0) {
    throw new Error("Missing parameter ?i= (icon names)");
  }

  // SECURITY: Limit number of icons to prevent DoS
  if (params.iconNames.length > 50) {
    throw new Error("Too many icons requested (max 50)");
  }

  if (params.size < 16 || params.size > 256) {
    throw new Error("Size must be between 16 and 256");
  }
  if (params.gap < 0 || params.gap > 100) {
    throw new Error("Gap must be between 0 and 100");
  }
  if (!["h", "v", "g"].includes(params.layout)) {
    throw new Error("Layout must be h, v, or g");
  }

  return params;
}

/**
 * Get background color based on theme or custom color
 */
function getBackgroundColor(theme, bg) {
  if (bg) {
    // SECURITY: Validate hex color format
    if (!/^[0-9A-Fa-f]{6}$/.test(bg)) {
      return "transparent"; // Fallback if invalid
    }
    return `#${bg}`;
  }

  const themes = {
    light: "#ffffff",
    dark: "#1a1a1a",
  };

  return theme ? themes[theme] : "transparent";
}

/**
 * Generate shadow filter definition
 */
function getShadowFilter(intensity) {
  const shadows = {
    1: { blur: 4, opacity: 0.1, offset: 2 },
    2: { blur: 8, opacity: 0.15, offset: 4 },
    3: { blur: 16, opacity: 0.2, offset: 8 },
  };

  const config = shadows[intensity];
  if (!config) return "";

  return `
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${config.blur}"/>
      <feOffset dx="0" dy="${config.offset}" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="${config.opacity}"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `;
}

/**
 * Generate glow filter definition
 */
function getGlowFilter() {
  return `
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `;
}

/**
 * Calculate icon positions based on layout
 */
function calculateLayout(iconCount, params) {
  const positions = [];
  const { size, gap, layout, columns } = params;

  if (layout === "h") {
    // Horizontal layout
    for (let i = 0; i < iconCount; i++) {
      positions.push({ x: i * (size + gap), y: 0 });
    }
  } else if (layout === "v") {
    // Vertical layout
    for (let i = 0; i < iconCount; i++) {
      positions.push({ x: 0, y: i * (size + gap) });
    }
  } else if (layout === "g") {
    // Grid layout
    for (let i = 0; i < iconCount; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      positions.push({
        x: col * (size + gap),
        y: row * (size + gap),
      });
    }
  }

  return positions;
}

/**
 * Calculate total dimensions
 */
function calculateDimensions(positions, params) {
  const { size, padding } = params;

  if (positions.length === 0) {
    return { width: padding * 2, height: padding * 2 };
  }

  const maxX = Math.max(...positions.map((p) => p.x));
  const maxY = Math.max(...positions.map((p) => p.y));

  return {
    width: maxX + size + padding * 2,
    height: maxY + size + padding * 2,
  };
}

/**
 * Process single icon file (async)
 * PERFORMANCE: Uses async fs.promises instead of blocking fs.readFileSync
 */
async function processIconFile(filePath) {
  try {
    // SECURITY: Verify file exists and is within expected directory
    const content = await fs.readFile(filePath, "utf8");

    // Extract viewBox
    const viewBoxMatch = content.match(/viewBox=["']([^"']*)["']/i);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

    // Extract fill color from root svg element
    const fillMatch = content.match(/<svg[^>]*fill=["']([^"']*)["'][^>]*>/i);
    const fill = fillMatch ? fillMatch[1] : null;

    // Extract inner SVG content
    const bodyMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const innerSVG = bodyMatch ? bodyMatch[1] : content;

    return { viewBox, fill, innerSVG };
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Main handler function (async)
 * PERFORMANCE: Processes all icons concurrently using Promise.all
 */
module.exports = async function handler(req, res) {
  try {
    // Parse and validate parameters (includes security sanitization)
    const params = parseQueryParams(req.query);

    const iconsDir = path.join(process.cwd(), "assets", "Icons");

    // PERFORMANCE: Process all icons concurrently instead of sequentially
    const iconPromises = params.iconNames.map(async (name) => {
      // SECURITY: sanitizeIconName already called in parseQueryParams
      // Extra normalization for safety
      const filePath = path.normalize(path.join(iconsDir, `${name}.svg`));

      // SECURITY: Verify the resolved path is still within iconsDir
      if (!filePath.startsWith(path.normalize(iconsDir))) {
        console.warn(`Path traversal attempt blocked: ${name}`);
        return null;
      }

      return processIconFile(filePath);
    });

    // Wait for all icons to be processed concurrently
    const iconResults = await Promise.all(iconPromises);

    // Filter out nulls (failed/missing icons)
    const icons = iconResults.filter(Boolean);

    if (icons.length === 0) {
      return res.status(404).send("No valid icons found");
    }

    // Calculate layout
    const positions = calculateLayout(icons.length, params);
    const dims = calculateDimensions(positions, params);

    // Generate SVG content
    let svgContent = "";
    const filterAttr = params.glow ? 'filter="url(#glow)"' : "";

    icons.forEach((icon, index) => {
      const pos = positions[index];
      const fillAttr = icon.fill ? `fill="${icon.fill}"` : "";

      svgContent += `
        <g transform="translate(${pos.x + params.padding}, ${pos.y + params.padding})">
          <svg
            width="${params.size}"
            height="${params.size}"
            viewBox="${icon.viewBox}"
            ${fillAttr}
            ${filterAttr}
          >
            ${icon.innerSVG}
          </svg>
        </g>
      `;
    });

    // Generate filters
    let defs = "";
    if (params.shadow > 0 || params.glow) {
      defs = "<defs>";
      if (params.shadow > 0) defs += getShadowFilter(params.shadow);
      if (params.glow) defs += getGlowFilter();
      defs += "</defs>";
    }

    // Generate background rect
    const bgColor = getBackgroundColor(params.theme, params.bg);
    const borderStyle =
      params.border && params.borderWidth > 0
        ? `stroke="#${params.border}" stroke-width="${params.borderWidth}"`
        : "";

    const bgRect =
      bgColor !== "transparent" || borderStyle
        ? `<rect
          width="${dims.width}"
          height="${dims.height}"
          rx="${params.radius}"
          fill="${bgColor}"
          ${borderStyle}
          ${params.shadow > 0 ? 'filter="url(#shadow)"' : ""}
        />`
        : "";

    // Build final SVG
    const finalSvg = `
      <svg
        width="${dims.width}"
        height="${dims.height}"
        viewBox="0 0 ${dims.width} ${dims.height}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${defs}
        ${bgRect}
        ${svgContent}
      </svg>
    `;

    // Send response with caching
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=60",
    );
    res.status(200).send(finalSvg);
  } catch (error) {
    console.error("Icon API Error:", error);
    const statusCode =
      error.message.includes("Invalid") ||
      error.message.includes("parameter") ||
      error.message.includes("Too many")
        ? 400
        : 500;
    res.status(statusCode).send(error.message || "Server Error");
  }
};
