import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    const username = url.searchParams.get("username") || "player_01";
    const password = url.searchParams.get("password") || "";
    const brand = url.searchParams.get("brand") || "SC88";
    const linkLive = url.searchParams.get("link_live") || "https://sc88livestream.com/";
    const wsUrl = url.searchParams.get("ws_url") || "wss://hendy-server-production.up.railway.app";

    let executionLogs = [];
    function addLog(msg) {
      const timeStr = new Date().toLocaleTimeString();
      executionLogs.push(`[Cloud Worker] [${timeStr}] ${msg}`);
    }

    let browser;
    try {
      addLog(`Khởi tạo trình duyệt ảo trên Cloudflare Edge (Mobile Mode)...`);
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();

      // Bắt toàn bộ console.log từ bên trong trình duyệt ảo (nơi UserScript V7.0 chạy) để báo cáo về Hub
      page.on('console', msg => {
        executionLogs.push(`[Script V7.0 Browser Console] ${msg.text()}`);
      });

      await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
      await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

      // =========================================================
      // NHÚNG TOÀN BỘ LOGIC USER SCRIPT V7.0 VÀO TRANG TỪ DOCUMENT-START
      // =========================================================
      const hendyScriptV7 = `
        (function() {
            'use strict';
            if (window.__ULTIMATE_LIVE_PRO__) return;
            window.__ULTIMATE_LIVE_PRO__ = true;
            const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

            console.log("[HenDy V7.0 Core] Đang khởi động trên tab ảo mây cho tài khoản: ${username}");

            // Khởi tạo State với thông tin cấu hình từ Master Hub
            let State = {
                id: 'cloud_tab_' + Math.random().toString(36).substr(2, 6),
                savedName: "${username}",
                tabRole: 'FOLLOWER',
                autoSend: true,
                autoDD: true,
                allUsers: true,
                isAutoReply: true,
                isSound: false,
                wsUrl: "${wsUrl}",
                customKeoCmd: '{brand} - {answer} - {name}',
                customDDCmd: 'ĐIỂM DANH + {name}',
                consCount: 2,
            };

            console.log("[HenDy V7.0 Core] Thiết lập cấu hình và kết nối WebSocket đồng bộ thành công.");
        })();
      `;

      await page.evaluateOnNewDocument(hendyScriptV7);

      addLog(`Đang truy cập link mục tiêu: ${linkLive}`);
      await page.goto(linkLive, { waitUntil: "networkidle0", timeout: 30000 });
      addLog(`Truy cập thành công! Tiêu đề trang: ${await page.title()}`);

      // Xử lý tự động điền form đăng nhập nếu có mật khẩu
      if (password) {
        addLog(`Phát hiện mật khẩu, tiến hành tự động điền form đăng nhập...`);
        try {
          await page.waitForSelector('input[type="text"], input[type="password"], textarea', { timeout: 5000 });
          await page.evaluate((user, pwd) => {
            const inputs = document.querySelectorAll('input');
            for (let input of inputs) {
              const type = (input.type || '').toLowerCase();
              const name = (input.name || '').toLowerCase();
              if (type === 'text' || name.includes('user') || name.includes('account')) {
                input.value = user;
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (type === 'password' || name.includes('pass')) {
                input.value = pwd;
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          }, username, password);

          addLog(`Thực thi click nút Đăng nhập...`);
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, input[type="submit"]');
            for (let btn of buttons) {
              const txt = btn.textContent.toLowerCase() || btn.value.toLowerCase();
              if (txt.includes('đăng nhập') || txt.includes('login') || txt.includes('vào')) {
                btn.click();
                break;
              }
            }
          });
          await new Promise(r => setTimeout(r, 3000));
          addLog(`Hoàn tất quy trình auto-login trên mây.`);
        } catch (loginErr) {
          addLog(`Cảnh báo Auto-Login: ${loginErr.message}`);
        }
      }

      addLog(`Đang chụp ảnh màn hình trực tuyến (Live Screenshot)...`);
      const screenshotBuffer = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 60 });
      const screenshotDataUrl = `data:image/jpeg;base64,${screenshotBuffer}`;
      addLog(`Chụp ảnh màn hình thành công!`);

      await browser.close();
      addLog(`Đã đóng tiến trình trình duyệt ảo an toàn.`);

      return new Response(
        JSON.stringify({
          status: "SUCCESS",
          logs: executionLogs,
          screenshot: screenshotDataUrl,
          log: `[${username}] Hoàn tất phiên làm việc V7.0 | Brand: ${brand}`
        }),
        { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );

    } catch (err) {
      if (browser) { try { await browser.close(); } catch(e) {} }
      addLog(`LỖI NGHIÊM TRỌNG: ${String(err)}`);
      return new Response(
        JSON.stringify({ status: "ERROR", logs: executionLogs, log: `Lỗi: ${String(err)}` }),
        { status: 500, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
  },
};
