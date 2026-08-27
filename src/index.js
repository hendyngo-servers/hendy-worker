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
          wsUrl: url.searchParams.get("ws_url") || "wss://hendy-server-production.up.railway.app"
        };
      }

      const { usernames = ["player_01"], password = "", proxyUrl = "", brand = "SC88", link_live = "https://sc88livestream.com/", wsUrl = "wss://hendy-server-production.up.railway.app" } = requestData;
      let allExecutionLogs = [];
      let finalScreenshot = "";

      for (let username of usernames) {
        let browser;
        const log = (msg) => {
          const timeStr = new Date().toLocaleTimeString();
          allExecutionLogs.push(`[${username}] [${timeStr}] ${msg}`);
        };

        try {
          log(`Khởi tạo tab ảo ngầm (Chống phát hiện Bot & Mobile Emulation)...`);
          
          let launchOptions = env.MYBROWSER || { headless: true };
          let defaultArgs = [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-infobars',
            '--window-size=412,915',
            '--disable-blink-features=AutomationControlled' // FIX QUAN TRỌNG: Qua mặt hệ thống phát hiện bot của nhà cái
          ];

          if (proxyUrl) {
            launchOptions.args = [`--proxy-server=${proxyUrl}`, ...defaultArgs];
          } else {
            launchOptions.args = defaultArgs;
          }

          browser = await puppeteer.launch(launchOptions);
          const page = await browser.newPage();

          page.on('console', msg => log(`[V7.1.5 Console] ${msg.text()}`));

          // Cấu hình chuẩn Pixel 7 Pro Mobile Mode
          await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
          await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.62 });

          // Xóa vết tích webdriver trước khi trang tải
          await page.evaluateOnNewDocument(() => {
              Object.defineProperty(navigator, 'webdriver', { get: () => false });
              window.navigator.chrome = { runtime: {} };
              Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
          });

          await page.evaluateOnNewDocument((user, socketUrl) => {
              window.localStorage.setItem('hendy_name', user);
              window.localStorage.setItem('mc_ws_url', socketUrl);
              window.localStorage.setItem('hendy_tabRole', 'LEADER');
              window.localStorage.setItem('hendy_autoDD', 'true');
              window.localStorage.setItem('hendy_autoSend', 'true');

              (function() {
                  'use strict';
                  if (window.__ULTIMATE_LIVE_PRO__) return;
                  window.__ULTIMATE_LIVE_PRO__ = true;
                  console.log(`[HenDy-LIVE-PRO V7.1.5] Active for user: ${user}`);
                  try {
                      if (typeof HTMLMediaElement !== 'undefined' && !HTMLMediaElement.prototype.getStatisticsInfo) {
                          HTMLMediaElement.prototype.getStatisticsInfo = function() { return { speed: 0, decodedFrames: 0, droppedFrames: 0 }; };
                      }
                  } catch(e) {}
              })();
          }, username, wsUrl);

          log(`Đang truy cập Web Live: ${link_live}`);
          await page.goto(link_live, { waitUntil: "networkidle0", timeout: 35000 });

          if (password) {
            log(`Thực hiện Auto-Login...`);
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
            log(`Hoàn tất Submit Đăng nhập.`);
          }

          log(`Chụp Live Preview tình trạng Tab ẩn...`);
          const screenshotBuffer = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 70 });
          finalScreenshot = `data:image/jpeg;base64,${screenshotBuffer}`;

          await browser.close();
          log(`Đã đóng Tab ảo an toàn.`);

        } catch (accountErr) {
          if (browser) { try { await browser.close(); } catch(e) {} }
          log(`LỖI XỬ LÝ: ${String(accountErr)}`);
        }
      }

      return new Response(
        JSON.stringify({ status: "SUCCESS", logs: allExecutionLogs, screenshot: finalScreenshot, log: "Chạy Batch Tab Ảo V7.1.5 hoàn tất." }),
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
