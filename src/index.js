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
    const brand = url.searchParams.get("brand") || "SC88";
    const linkLive = url.searchParams.get("link_live") || "https://sc88livestream.com/";

    let browser;
    try {
      // 1. Khởi tạo trình duyệt ảo qua Cloudflare Browser Rendering
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();

      // 2. Thiết lập giao diện Mobile và User-Agent chuẩn thiết bị thật
      await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
      await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

      // 3. TIÊM TRỰC TIẾP TOÀN BỘ SCRIPT HEN-DY VÀO TAB ẢO TỪNG DOCUMENT-START
      const hendyScript = `
        (function() {
            'use strict';
            if (window.__ULTIMATE_LIVE_PRO__) return;
            window.__ULTIMATE_LIVE_PRO__ = true;
            const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

            // --- MOBILE MODE & WEBGL BYPASS ---
            const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
            function defineNavigator(name, getter) {
                try { Object.defineProperty(w.Navigator.prototype, name, { configurable: true, get: getter }); } catch (e) {}
            }
            defineNavigator('userAgent', () => MOBILE_UA);
            defineNavigator('platform', () => 'Android');
            defineNavigator('maxTouchPoints', () => 5);

            // --- STATE & WEBSOCKET SYNC CONFIG ---
            let State = {
                id: 'cloud_tab_' + Math.random().toString(36).substr(2, 6),
                savedName: "${username}",
                tabRole: 'FOLLOWER',
                autoSend: true,
                autoDD: true,
                allUsers: true,
                isAutoReply: true,
                isSound: false, // Chạy trên mây tắt âm thanh để tiết kiệm tài nguyên
                wsUrl: 'wss://hendy-railway-server-production.up.railway.app', // Link WebSocket Railway của bạn
                customKeoCmd: '{brand} - {answer} - {name}',
                customDDCmd: 'ĐIỂM DANH + {name}',
                consCount: 2,
                vips: 'admin,idol',
                prioVips: 'master'
            };

            console.log("[HenDy Cloud Core] Script V7.0 đã được nhúng thành công vào Tab ảo trên mây cho tài khoản: " + State.savedName);
        })();
      `;

      // Đảm bảo script chạy trước khi trang web load nội dung
      await page.evaluateOnNewDocument(hendyScript);

      // 4. Truy cập vào Link Live mục tiêu
      await page.goto(linkLive, { waitUntil: "networkidle0", timeout: 30000 });

      // Chờ tab ảo duy trì kết nối và chạy ngầm ổn định trong vài giây
      await new Promise(r => setTimeout(r, 6000));
      const pageTitle = await page.title();

      await browser.close();

      return new Response(
        JSON.stringify({
          status: "SUCCESS",
          client_id: "HenDy-Cloud-Worker",
          log: `[${username}] Tab ảo trên mây đã khởi chạy & nhúng Script thành công | Brand: ${brand} | Title: ${pageTitle}`
        }),
        { 
          headers: { 
            "content-type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          } 
        }
      );

    } catch (err) {
      if (browser) { try { await browser.close(); } catch(e) {} }
      return new Response(
        JSON.stringify({ 
          status: "ERROR", 
          log: `Lỗi thực thi tab ảo trên mây: ${String(err)}` 
        }),
        { 
          status: 500, 
          headers: { 
            "content-type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          } 
        }
      );
    }
  },
};
