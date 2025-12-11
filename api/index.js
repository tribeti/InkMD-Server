// api/index.js
const fs = require("fs");
const path = require("path");

export default function handler(req, res) {
  try {
    // 1. Lấy tham số từ URL (ví dụ: ?i=rust,cpp)
    const { i } = req.query;

    if (!i) {
      return res.status(400).send("Thieu tham so ?i=... (Vi du: ?i=rust,cpp)");
    }

    const iconNames = i.split(",");

    // CẤU HÌNH GIAO DIỆN
    const iconSize = 48; // Kích thước hiển thị
    const gap = 15; // Khoảng cách giữa các icon

    let svgContent = "";
    let currentX = 0;

    // 2. Đường dẫn tới folder Icons trong Submodule
    // Lưu ý: Folder submodule mình đặt tên là 'assets' ở bước 1
    const iconsDir = path.join(process.cwd(), "assets", "Icons");

    // 3. Duyệt qua từng icon được yêu cầu
    iconNames.forEach((name) => {
      const cleanName = name.trim();
      // Tìm file .svg (thử cả viết hoa viết thường nếu cần, ở đây mình giả định tên chuẩn)
      const filePath = path.join(iconsDir, `${cleanName}.svg`);

      if (fs.existsSync(filePath)) {
        // Đọc nội dung file
        let content = fs.readFileSync(filePath, "utf8");

        // Lấy nội dung bên trong thẻ <svg>...</svg> để tránh lỗi lồng nhau
        const svgBodyMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        let innerSVG = svgBodyMatch ? svgBodyMatch[1] : content;

        // Fix lỗi viewbox nếu icon gốc quá to (đưa về group <g>)
        svgContent += `
          <g transform="translate(${currentX}, 0)">
             <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256">
                ${innerSVG}
             </svg>
          </g>
        `;

        // Cộng dồn vị trí X cho icon tiếp theo
        currentX += iconSize + gap;
      }
    });

    const finalWidth = currentX - gap;
    const finalHeight = iconSize;

    const finalSvg = `
      <svg width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">
        ${svgContent}
      </svg>
    `;

    // 5. Trả về cho trình duyệt
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=60",
    );
    res.status(200).send(finalSvg);
  } catch (error) {
    console.error(error);
    res.status(500).send("Loi server: " + error.message);
  }
}
