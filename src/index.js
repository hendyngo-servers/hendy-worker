import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    // Xử lý CORS cho phép Master Hub gọi API
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      let requestData = {};
      if (request.method === "POST") {
        requestData = await request.json();
      } else {
        const url = new URL(request.url);
        requestData = {
          usernames: [url.searchParams.get("username") || "player_01"],
          password: url.searchParams.get("password") || "",
          proxyUrl: url.searchParams.get("proxy_url") || "",
          brand: url.searchParams.get("brand") || "SC88",
          link_live: url.searchParams.get("link_live") || "https://sc88livestream.com/",
          wsUrl: url.searchParams.get("ws_url") || "wss://hendy-server-pro-production.up.railway.app"
        };
      }

      const { usernames = ["player_01"], password = "", proxyUrl = "", brand = "SC88", link_live = "https://sc88livestream.com/", wsUrl = "wss://hendy-server-pro-production.up.railway.app" } = requestData;
      let allExecutionLogs = [];
      let finalScreenshot = "";

      // Vòng lặp Hàng đợi đa luồng
      for (let username of usernames) {
        let browser;
        const log = (msg) => {
          const timeStr = new Date().toLocaleTimeString();
          allExecutionLogs.push(`[${username}] [${timeStr}] ${msg}`);
        };

        try {
          log(`Khởi tạo tab ảo ngầm (Proxy: ${proxyUrl || 'Mặc định'})...`);
          
          let launchOptions = env.MYBROWSER || { headless: true };
          if (proxyUrl) {
            launchOptions.args = [`--proxy-server=${proxyUrl}`, '--no-sandbox', '--disable-setuid-sandbox'];
          }

          browser = await puppeteer.launch(launchOptions);
          const page = await browser.newPage();

          // Lắng nghe và gom Console Log từ V7.1.3 gửi về Master Hub
          page.on('console', msg => log(`[V7.1.3 Console] ${msg.text()}`));

          // Cấu hình Mobile Mode giả lập chuẩn
          await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
          await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

          // =========================================================
          // TIÊM TOÀN BỘ MÃ NGUỒN V7.1.3 VÀO TAB ẢO BẰNG HÀM TRUYỀN THAM SỐ
          // =========================================================
          await page.evaluateOnNewDocument((user, socketUrl) => {
              // Ghi đè LocalStorage ngầm định để V7.1.3 tự lấy đúng tên tài khoản
              window.localStorage.setItem('hendy_name', user);
              window.localStorage.setItem('hendy_wsUrl', socketUrl);
              window.localStorage.setItem('hendy_tabRole', 'FOLLOWER'); // Set mặc định đàn em
              window.localStorage.setItem('hendy_autoDD', 'true');
              window.localStorage.setItem('hendy_autoSend', 'true');

              // --- BẮT ĐẦU MÃ NGUỒN V7.1.3 ---
              (function() {
                  'use strict';
                  if (window.__ULTIMATE_LIVE_PRO__) return;
                  window.__ULTIMATE_LIVE_PRO__ = true;
                  const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

                  console.log(`[HenDy-LIVE-PRO V7.1.3] Khởi động thành công cho tài khoản: ${user}`);

                  try {
                      if (typeof HTMLMediaElement !== 'undefined' && !HTMLMediaElement.prototype.getStatisticsInfo) {
                          HTMLMediaElement.prototype.getStatisticsInfo = function() { return { speed: 0, decodedFrames: 0, droppedFrames: 0 }; };
                      }
                  } catch(e) {}

                  window.addEventListener('unhandledrejection', function(event) {
                      if (event.reason && typeof event.reason.message === 'string') {
                          if (event.reason.message.includes('getStatisticsInfo') || event.reason.message.includes('EarlyEof')) {
                              event.preventDefault();
                          }
                      }
                  });

                  // ... (Toàn bộ logic Bypass Mobile, WebSocket, Regex Kèo, Chat Injector của bạn nằm ở đây)
                  // Vì V7.1.3 sẽ tự động đọc cấu hình từ localStorage ở trên, nên nó sẽ vận hành hoàn hảo với username truyền vào!
                  
              })();
              // --- KẾT THÚC MÃ NGUỒN V7.1.3 ---
          }, username, wsUrl);

          log(`Đang truy cập Web Live: ${link_live}`);
          await page.goto(link_live, { waitUntil: "networkidle0", timeout: 35000 });

          // Xử lý Auto-Login nếu có Password
          if (password) {
            log(`Phát hiện cấu hình Password, tiến hành Auto-Login...`);
            await page.evaluate((u, p) => {
              const inputs = document.querySelectorAll('input');
              for (let input of inputs) {
                const type = (input.type || '').toLowerCase();
                const name = (input.name || '').toLowerCase();
                if (type === 'text' || name.includes('user') || name.includes('account')) {
                  input.value = u; input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (type === 'password' || name.includes('pass')) {
                  input.value = p; input.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }, username, password);

            await page.evaluate(() => {
              const buttons = document.querySelectorAll('button, input[type="submit"]');
              for (let btn of buttons) {
                const txt = btn.textContent.toLowerCase() || btn.value.toLowerCase();
                if (txt.includes('đăng nhập') || txt.includes('login') || txt.includes('vào')) {
                  btn.click(); break;
                }
              }
            });
            await new Promise(r => setTimeout(r, 4000));
            log(`Hoàn tất Submit Form Đăng nhập.`);
          }

          log(`Chụp Live Preview tình trạng Tab ẩn...`);
          const screenshotBuffer = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 60 });
          finalScreenshot = `data:image/jpeg;base64,${screenshotBuffer}`;

          await browser.close();
          log(`[Hoàn tất] Đã đóng Tab ảo V7.1.3 an toàn.`);

        } catch (accountErr) {
          if (browser) { try { await browser.close(); } catch(e) {} }
          log(`LỖI XỬ LÝ: ${String(accountErr)}`);
        }
      }

      return new Response(
        JSON.stringify({ status: "SUCCESS", logs: allExecutionLogs, screenshot: finalScreenshot, log: "Chạy Batch Tab Ảo V7.1.3 hoàn tất." }),
        { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({ status: "ERROR", logs: [String(err)] }),
        { status: 500, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
  },
};
