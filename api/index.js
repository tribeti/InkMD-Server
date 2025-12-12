const fs = require("fs");
const path = require("path");

export default function handler(req, res) {
  try {
    const { i } = req.query;
    if (!i) return res.status(400).send("Thieu tham so ?i=");

    const iconNames = i.split(",");

    // CẤU HÌNH
    const ICON_SIZE = 48;
    const GAP = 12;

    let svgContent = "";
    let currentX = 0;

    // Đường dẫn folder chứa icon
    const iconsDir = path.join(process.cwd(), "assets", "Icons");

    iconNames.forEach((name) => {
      const cleanName = name.trim();
      const filePath = path.join(iconsDir, `${cleanName}.svg`);

      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, "utf8");

        // 1. Lấy viewBox gốc
        const viewBoxMatch = content.match(/viewBox=["']([^"']*)["']/i);
        const originalViewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

        // 2. --- [FIX MÀU] --- Lấy màu fill gốc (nếu có) từ thẻ <svg> cha
        // Nhiều icon để màu ở ngay đầu file: <svg fill="#FF0000" ...>
        const fillMatch = content.match(
          /<svg[^>]*fill=["']([^"']*)["'][^>]*>/i,
        );
        const originalFill = fillMatch ? fillMatch[1] : null;

        // Nếu tìm thấy fill gốc, tạo chuỗi thuộc tính fill="..."
        // Nếu không tìm thấy, để trống (để nó tự dùng màu bên trong path)
        const fillAttr = originalFill ? `fill="${originalFill}"` : "";

        // 3. Lấy nội dung bên trong
        const bodyMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        const innerSVG = bodyMatch ? bodyMatch[1] : content;

        // 4. Vẽ SVG lồng nhau
        // Thêm biến ${fillAttr} vào thẻ <svg> con để tái tạo lại màu
        svgContent += `
          <g transform="translate(${currentX}, 0)">
            <svg
              width="${ICON_SIZE}"
              height="${ICON_SIZE}"
              viewBox="${originalViewBox}"
              ${fillAttr}
            >
              ${innerSVG}
            </svg>
          </g>
        `;

        currentX += ICON_SIZE + GAP;
      }
    });

    const totalWidth = currentX > 0 ? currentX - GAP : 0;
    const totalHeight = ICON_SIZE;

    // 5. --- [FIX MÀU] --- XÓA fill="currentColor" ở thẻ bao ngoài
    // Việc xóa này giúp icon hiển thị đúng màu nguyên bản của nó.
    const finalSvg = `
      <svg
        width="${totalWidth}"
        height="${totalHeight}"
        viewBox="0 0 ${totalWidth} ${totalHeight}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${svgContent}
      </svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=60",
    );
    res.status(200).send(finalSvg);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
}
