const fs = require('fs');
const path = require('path');

const WATCH_DIR = path.join(__dirname, 'quan_ly_file');
const ROOT_DIR = __dirname;

// Hàm đọc cấu hình và khởi tạo/cập nhật mã nguồn
function syncTier(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(`\n[+] Bắt đầu đồng bộ: Tầng ${data.tier} - ${data.name}`);

        // 1. Quản lý việc tự động tạo thư mục
        if (data.directories && Array.isArray(data.directories)) {
            data.directories.forEach(dir => {
                const fullPath = path.join(ROOT_DIR, dir);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                    console.log(`  -> [Tạo mới thư mục] ${dir}`);
                }
            });
        }

        // 2. Quản lý việc tự động cập nhật/thay thế file
        if (data.auto_generate_files) {
            for (const [fileRelPath, content] of Object.entries(data.auto_generate_files)) {
                const fullFilePath = path.join(ROOT_DIR, fileRelPath);
                
                // Đảm bảo thư mục cha chứa file này đã tồn tại
                fs.mkdirSync(path.dirname(fullFilePath), { recursive: true });
                
                // Ghi đè hoặc tạo mới file
                fs.writeFileSync(fullFilePath, content);
                console.log(`  -> [Cập nhật mã nguồn] ${fileRelPath}`);
            }
        }
        
        console.log(`[v] Hoàn tất đồng bộ Tầng ${data.tier}!`);
    } catch (error) {
        console.error(`[!] Lỗi khi xử lý file ${filePath}:`, error.message);
    }
}

// Khởi động Watcher
console.log(`=============================================`);
console.log(`🚀 HENDY STUDIO PRO - AUTO SYNC MANAGER KHỞI CHẠY`);
console.log(`📂 Đang theo dõi thay đổi tại: ${WATCH_DIR}`);
console.log(`=============================================`);

fs.watch(WATCH_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.json')) {
        const filePath = path.join(WATCH_DIR, filename);
        // Kiểm tra xem file có thực sự tồn tại không (tránh lỗi khi xóa file)
        if (fs.existsSync(filePath)) {
            // Dùng setTimeout nhỏ để tránh lỗi double-fire (lưu file 2 lần liên tiếp của OS)
            setTimeout(() => {
                syncTier(filePath);
            }, 100);
        }
    }
});
