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
    const captchaCode = url.searchParams.get("captcha_code") || "";
    const brand = url.searchParams.get("brand") || "SC88";
    const linkLive = url.searchParams.get("link_live") || "https://sc88livestream.com/";

    let executionLogs = [];
    function addLog(msg) {
      const timeStr = new Date().toLocaleTimeString();
      executionLogs.push(`[Cloud Browser] [${timeStr}] ${msg}`);
    }

    let browser;
    try {
      addLog(`Khởi tạo trình duyệt ảo trên Cloudflare Edge (Mobile Mode)...`);
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
      await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

      addLog(`Tiêm mã nguồn Script V7.0 vào tab ảo thành công.`);
      await page.evaluateOnNewDocument(`
        (function() {
            window.__ULTIMATE_LIVE_PRO__ = true;
            console.log("[HenDy Cloud Core] Script V7.0 active.");
        })();
      `);

      addLog(`Đang truy cập mục tiêu: ${linkLive}`);
      await page.goto(linkLive, { waitUntil: "networkidle0", timeout: 30000 });
      addLog(`Truy cập trang thành công! Tiêu đề trang: ${await page.title()}`);

      if (password) {
        addLog(`Tiến hành tự động điền tài khoản và mật khẩu cho user: ${username}...`);
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
      }

      // KIỂM TRA MÃ CAPTCHA
      const captchaImgSelector = 'img[alt*="captcha" i], img[src*="captcha" i], .captcha-img, #captcha_img';
      const captchaElement = await page.$(captchaImgSelector);

      if (captchaElement && !captchaCode) {
        addLog(`⚠️ Phát hiện mã CAPTCHA trên trang! Đang chụp và gửi về Trung tâm điều khiển...`);
        const captchaBuffer = await captchaElement.screenshot({ encoding: "base64", type: "png" });
        const captchaDataUrl = `data:image/png;base64,${captchaBuffer}`;

        await browser.close();
        addLog(`Tạm dừng phiên làm việc, chờ nhập mã xác thực từ Hub.`);

        return new Response(
          JSON.stringify({
            status: "NEED_CAPTCHA",
            logs: executionLogs,
            captcha_image: captchaDataUrl,
            log: `Cần nhập mã CAPTCHA để tiếp tục đăng nhập cho [${username}]`
          }),
          { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      // NẾU ĐÃ CÓ MÃ CAPTCHA DO USER NHẬP TỪ MASTER HUB GỬI LÊN
      if (captchaCode) {
        addLog(`Nhận mã CAPTCHA từ Master Hub: [${captchaCode}]. Đang điền vào form...`);
        await page.evaluate((code) => {
          const inputs = document.querySelectorAll('input');
          for (let input of inputs) {
            const placeholder = (input.placeholder || '').toLowerCase();
            const name = (input.name || '').toLowerCase();
            if (name.includes('captcha') || placeholder.includes('captcha') || placeholder.includes('mã')) {
              input.value = code;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              break;
            }
          }
        }, captchaCode);
        addLog(`Đã điền xong mã CAPTCHA.`);
      }

      addLog(`Thực thi click nút Đăng nhập trên trình duyệt ảo...`);
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
      await new Promise(r => setTimeout(r, 4000));

      addLog(`Chụp ảnh màn hình trực tuyến kết quả sau khi đăng nhập...`);
      const screenshotBuffer = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 60 });
      const screenshotDataUrl = `data:image/jpeg;base64,${screenshotBuffer}`;

      await browser.close();
      addLog(`Hoàn tất tiến trình thành công.`);

      return new Response(
        JSON.stringify({
          status: "SUCCESS",
          logs: executionLogs,
          screenshot: screenshotDataUrl,
          log: `[${username}] Hoàn tất phiên làm việc cho Brand: ${brand}`
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
