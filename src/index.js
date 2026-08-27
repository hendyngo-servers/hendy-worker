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
          log(`Khởi tạo tab ảo ngầm cho tài khoản: ${username}`);
          let launchOptions = env.MYBROWSER || { headless: true };
          if (proxyUrl) {
            launchOptions.args = [`--proxy-server=${proxyUrl}`, '--no-sandbox', '--disable-setuid-sandbox'];
          }

          browser = await puppeteer.launch(launchOptions);
          const page = await browser.newPage();

          page.on('console', msg => log(`[Console] ${msg.text()}`));

          const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
          await page.setUserAgent(MOBILE_UA);
          await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });

          await page.evaluateOnNewDocument((user, socketUrl, ua) => {
              window.localStorage.setItem('hendy_name', user);
              window.localStorage.setItem('mc_ws_url', socketUrl);
              window.localStorage.setItem('hendy_tabRole', 'LEADER');
              window.localStorage.setItem('hendy_autoDD', 'true');
              window.localStorage.setItem('hendy_autoSend', 'true');

              const fakeNavigator = {
                  userAgent: ua,
                  platform: 'Android',
                  maxTouchPoints: 5,
                  vendor: 'Google Inc.',
                  language: 'vi-VN',
                  languages: ['vi-VN', 'vi', 'en-US', 'en'],
                  hardwareConcurrency: 8,
                  deviceMemory: 8,
                  onLine: true,
                  cookieEnabled: true,
                  webdriver: false,
                  userAgentData: {
                      brands: [{ brand: 'Chromium', version: '131' }, { brand: 'Google Chrome', version: '131' }],
                      mobile: true,
                      platform: 'Android'
                  }
              };

              try {
                  Object.keys(fakeNavigator).forEach(key => {
                      try { Object.defineProperty(Navigator.prototype, key, { get: () => fakeNavigator[key], configurable: true }); } catch (e) {}
                      try { if (window.navigator) Object.defineProperty(window.navigator, key, { get: () => fakeNavigator[key], configurable: true }); } catch (e) {}
                  });
              } catch (e) {}

              try { if (!('ontouchstart' in window)) Object.defineProperty(window, 'ontouchstart', { configurable: true, value: null }); } catch (e) {}
          }, username, wsUrl, MOBILE_UA);

          log(`Đang truy cập Web Live: ${link_live}`);
          await page.goto(link_live, { waitUntil: "networkidle0", timeout: 35000 });

          // Chờ popup hoặc form đăng nhập render ra
          await new Promise(r => setTimeout(r, 3000));

          if (password) {
            log(`Tiến hành tự động điền tài khoản: ${username} và mật khẩu...`);
            await page.evaluate((u, p) => {
              const inputs = document.querySelectorAll('input');
              for (let input of inputs) {
                const placeholder = (input.placeholder || '').toLowerCase();
                const name = (input.name || '').toLowerCase();
                const type = (input.type || '').toLowerCase();

                // Điền đúng tài khoản
                if (type === 'text' && (placeholder.includes('tài khoản') || placeholder.includes('user') || name.includes('user') || name.includes('account'))) {
                  input.value = u; 
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                // Điền đúng mật khẩu
                if (type === 'password' || placeholder.includes('mật khẩu') || name.includes('pass')) {
                  input.value = p; 
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }, username, password);
            await new Promise(r => setTimeout(r, 2000));
          }

          log(`Chụp ảnh màn hình Preview trạng thái Captcha...`);
          const screenshotBuffer = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 65 });
          finalScreenshot = `data:image/jpeg;base64,${screenshotBuffer}`;

          await browser.close();
          log(`Đã đóng Tab ảo an toàn.`);

        } catch (accountErr) {
          if (browser) { try { await browser.close(); } catch(e) {} }
          log(`LỖI XỬ LÝ: ${String(accountErr)}`);
        }
      }

      return new Response(
        JSON.stringify({ status: "SUCCESS", logs: allExecutionLogs, screenshot: finalScreenshot, log: "Chạy Batch Tab Ảo hoàn tất." }),
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
