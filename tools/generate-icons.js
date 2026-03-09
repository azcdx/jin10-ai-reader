/**
 * 图标生成脚本
 * 使用 Node.js Canvas 生成 PNG 图标
 *
 * 安装依赖：npm install canvas
 * 运行：node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// 使用简单的纯色占位图标（不需要 canvas 依赖）
function createPlaceholderIcon(size, filename) {
    // 创建一个简单的PNG文件头 + 图像数据
    // 这是一个最小化的PNG文件

    const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const width = size;
    const height = size;
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(8, 8);  // bit depth
    ihdr.writeUInt8(6, 9);  // color type (RGBA)
    ihdr.writeUInt8(0, 10); // compression
    ihdr.writeUInt8(0, 11); // filter
    ihdr.writeUInt8(0, 12); // interlace

    // 创建渐变色数据（简化版 - 使用纯色）
    const pixels = [];
    for (let y = 0; y < height; y++) {
        pixels.push(0);  // filter type
        for (let x = 0; x < width; x++) {
            // 渐变色：从 #667eea 到 #764ba2
            const ratio = (x + y) / (width + height);
            const r = Math.floor(102 + (118 - 102) * ratio);
            const g = Math.floor(126 + (75 - 126) * ratio);
            const b = Math.floor(234 + (162 - 234) * ratio);
            pixels.push(r, g, b, 255);
        }
    }

    // IDAT chunk (简化版，无压缩)
    const imageData = Buffer.from(pixels);
    const idat = Buffer.concat([Buffer.from([0x78, 0x01]), imageData, Buffer.from([0, 0, 0, 0])]);
    const adler = 1; // 简化的 Adler-32
    const idatFinal = Buffer.concat([Buffer.from([0x78, 0x01]), imageData, Buffer.from([adler >> 8, adler & 0xff])]);

    // 构建 PNG
    const chunks = [];

    // IHDR
    const ihdrLength = Buffer.alloc(4);
    ihdrLength.writeUInt32BE(13, 0);
    const ihdrCrc = Buffer.alloc(4);
    ihdrCrc.writeUInt32BE(0x5d60e05e, 0); // 预计算的 CRC
    chunks.push(ihdrLength, Buffer.from('IHDR'), ihdr, ihdrCrc);

    // IDAT
    const idatLength = Buffer.alloc(4);
    idatLength.writeUInt32BE(idatFinal.length, 0);
    const idatCrc = Buffer.alloc(4);
    idatCrc.writeUInt32BE(0x12345678, 0); // 占位 CRC
    chunks.push(idatLength, Buffer.from('IDAT'), idatFinal, idatCrc);

    // IEND
    const iendLength = Buffer.alloc(4);
    const iendCrc = Buffer.alloc(4);
    iendCrc.writeUInt32BE(0xae426082, 0);
    chunks.push(iendLength, Buffer.from('IEND'), Buffer.alloc(0), iendCrc);

    const png = Buffer.concat([PNG_SIGNATURE, ...chunks]);

    const iconsDir = path.join(__dirname, '..', 'icons');
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(iconsDir, filename), png);
    console.log(`✓ Generated ${filename} (${size}x${size})`);
}

// 生成图标
console.log('生成图标中...');
createPlaceholderIcon(16, 'icon16.png');
createPlaceholderIcon(48, 'icon48.png');
createPlaceholderIcon(128, 'icon128.png');
console.log('✓ 图标生成完成！');
