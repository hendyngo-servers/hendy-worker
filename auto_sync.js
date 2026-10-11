const fs = require('fs');
const path = require('path');

const WATCH_DIR = path.join(__dirname, 'quan_ly_file');
const ROOT_DIR = __dirname;

// Đảm bảo thư mục quản lý tồn tại
if (!fs.existsSync(WATCH_DIR)) {
    fs.mkdirSync(WATCH_DIR, { recursive: true });
}

// -------------------------------------------------------------------
// ENGINE 1: XỬ LÝ FILE SƠ ĐỒ (so_do_thu_muc.txt)
// -------------------------------------------------------------------
function parseTreeAndGenerate(filePath) {
    console.log(`\n[+] Đang đọc sơ đồ từ: ${path.basename(filePath)}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let pathStack = [ROOT_DIR]; 
    let indentStack = [-1]; 

    lines.forEach(line => {
        if (!line.trim() || line.startsWith('==') || line.startsWith('--')) return;

        // Tách phần ký tự cây (prefix), tên file/thư mục, và ghi chú (#)
        const match = line.match(/^([│├└─\s]*)([^#\n]+)(?:#\s*(.*))?$/);
        if (!match) return;

        const prefix = match[1];
        let name = match[2].trim();
        const comment = match[3] ? match[3].trim() : '';

        if (!name || name.toLowerCase().includes('thư mục gốc/')) return;

        const isDir = name.endsWith('/');
        if (isDir) name = name.slice(0, -1);

        // Xác định độ sâu dựa vào số lượng ký tự đầu dòng
        const indentLevel = prefix.length;

        // Điều chỉnh lại thư mục cha dựa vào độ thụt lề
        while (indentStack.length > 1 && indentLevel <= indentStack[indentStack.length - 1]) {
            indentStack.pop();
            pathStack.pop();
        }

        const parentDir = pathStack[pathStack.length - 1];
        const targetPath = path.join(parentDir, name);

        if (isDir) {
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
                console.log(` 📁 [Tạo thư mục]: ${targetPath.replace(ROOT_DIR, '')}`);
            }
            pathStack.push(targetPath);
            indentStack.push(indentLevel);
        } else {
            if (!fs.existsSync(targetPath)) {
                // Nếu có chú thích, đưa chú thích vào làm nội dung file
                const fileContent = comment ? `// ${comment}\n` : '';
                fs.writeFileSync(targetPath, fileContent);
                console.log(` 📄 [Tạo file]   : ${targetPath.replace(ROOT_DIR, '')}`);
            }
        }
    });
    console.log(`[v] Xây dựng cấu trúc từ sơ đồ hoàn tất!`);
}

// -------------------------------------------------------------------
// ENGINE 2: XỬ LÝ FILE CẤU HÌNH (JSON) - Giữ nguyên logic cũ
// -------------------------------------------------------------------
function syncTier(filePath) {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`\n[+] Đồng bộ JSON: Tầng ${data.tier || '?'} - ${data.name || ''}`);

        if (data.directories) {
            data.directories.forEach(dir => {
                const fullPath = path.join(ROOT_DIR, dir);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                    console.log(`  -> [Tạo thư mục] ${dir}`);
                }
            });
        }

        if (data.auto_generate_files) {
            for (const [fileRelPath, content] of Object.entries(data.auto_generate_files)) {
                const fullFilePath = path.join(ROOT_DIR, fileRelPath);
                fs.mkdirSync(path.dirname(fullFilePath), { recursive: true });
                fs.writeFileSync(fullFilePath, content);
                console.log(`  -> [Cập nhật file] ${fileRelPath}`);
            }
        }
    } catch (error) {
        // Bỏ qua lỗi parse JSON tạm thời khi file đang gõ dở
    }
}

// -------------------------------------------------------------------
// WATCHER TỔNG
// -------------------------------------------------------------------
console.log(`=============================================`);
console.log(`🚀 HENDY STUDIO PRO - AUTO SYNC KHỞI CHẠY`);
console.log(`📂 Đang theo dõi thay đổi tại: ${WATCH_DIR}`);
console.log(`=============================================`);

fs.watch(WATCH_DIR, (eventType, filename) => {
    if (!filename) return;
    const filePath = path.join(WATCH_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        setTimeout(() => {
            if (filename === 'so_do_thu_muc.txt') {
                parseTreeAndGenerate(filePath);
            } else if (filename.endsWith('.json')) {
                syncTier(filePath);
            }
        }, 150);
    }
});
