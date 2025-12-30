const fs = require("fs");
const path = require("path");

/**
 * Parse and validate query parameters
 */
function parseQueryParams(query) {
  const params = {
    iconNames: query.i ? query.i.split(",").map((n) => n.trim()) : [],
    size: parseInt(query.size) || 48,
    gap: query.gap !== undefined ? parseInt(query.gap) : 12,
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
  if (bg) return `#${bg}`;

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
 * Process single icon file
 */
function processIconFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf8");

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
}

/**
 * Main handler function
 */
module.exports = function handler(req, res) {
  try {
    // Parse and validate parameters
    const params = parseQueryParams(req.query);

    const iconsDir = path.join(process.cwd(), "assets", "Icons");
    const icons = [];

    // Process each icon
    params.iconNames.forEach((name) => {
      const filePath = path.join(iconsDir, `${name}.svg`);
      const iconData = processIconFile(filePath);

      if (iconData) {
        icons.push(iconData);
      }
    });

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
    res
      .status(error.message.includes("parameter") ? 400 : 500)
      .send(error.message || "Server Error");
  }
};
