const fs = require("fs");
const path = require("path");

export default function handler(req, res) {
  try {
    const { i } = req.query;
    if (!i) {
      return res.status(400).send("Thieu tham so ?i=... (Vi du: ?i=winui,cpp)");
    }

    const iconNames = i.split(",");
    const ICON_SIZE = 48; // Mọi icon sẽ được ép về kích thước vuông này
    const GAP = 12; // Khoảng cách giữa các icon

    let svgContent = "";
    let currentX = 0;

    // Đường dẫn folder chứa icon (Sửa lại 'assets/Icons' nếu cấu trúc bạn khác)
    const iconsDir = path.join(process.cwd(), "assets", "Icons");

    // 2. Duyệt qua từng icon
    iconNames.forEach((name) => {
      const cleanName = name.trim();
      const filePath = path.join(iconsDir, `${cleanName}.svg`);

      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, "utf8");

        // --- BƯỚC QUAN TRỌNG 1: LẤY VIEWBOX GỐC ---
        // Regex này tìm thông số viewBox="0 0 ... ..." trong file gốc
        // Nếu file gốc to nhỏ khác nhau, cái này sẽ giúp nó hiển thị đúng tỉ lệ
        const viewBoxMatch = content.match(/viewBox=["']([^"']*)["']/i);
        const originalViewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24"; // Fallback nếu không tìm thấy

        // --- BƯỚC QUAN TRỌNG 2: LẤY NỘI DUNG ICON ---
        // Lấy hết path, circle, rect... bên trong thẻ <svg>
        const bodyMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        const innerSVG = bodyMatch ? bodyMatch[1] : content;

        // --- BƯỚC QUAN TRỌNG 3: VẼ SVG LỒNG (NESTED SVG) ---
        // Chúng ta tạo một thẻ <svg> con, đặt width/height cố định là ICON_SIZE (48)
        // Nhưng set viewBox bằng với viewBox gốc.
        // -> Trình duyệt sẽ tự co giãn hình gốc để vừa khít ô 48x48 này.
        svgContent += `
          <g transform="translate(${currentX}, 0)">
            <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="${originalViewBox}">
              ${innerSVG}
            </svg>
          </g>
        `;

        // Cộng vị trí cho icon tiếp theo
        currentX += ICON_SIZE + GAP;
      }
    });

    // Tính tổng chiều rộng của cả tấm hình
    const totalWidth = currentX > 0 ? currentX - GAP : 0;
    const totalHeight = ICON_SIZE;

    // 3. Tạo thẻ SVG bao bên ngoài
    // Lưu ý: Ta set width/height ở đây để khi dùng Markdown ![]() nó hiển thị đúng size 48px mặc định.
    // Tuy nhiên, khi dùng <img height="256">, trình duyệt vẫn sẽ override được nhờ viewBox.
    const finalSvg = `
      <svg
        width="${totalWidth}"
        height="${totalHeight}"
        viewBox="0 0 ${totalWidth} ${totalHeight}"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
      >
        ${svgContent}
      </svg>
    `;

    // 4. Trả về kết quả
    res.setHeader("Content-Type", "image/svg+xml");
    // Cache 1 ngày để load cho nhanh
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
