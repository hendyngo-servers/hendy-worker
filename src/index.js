import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    // 1. Xử lý yêu cầu OPTIONS (Preflight CORS) từ trình duyệt
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
    const linkLive = url.searchParams.get("link_live") || "https://example.com";

    let browser;
    try {
      // 2. Khởi tạo trình duyệt ảo qua Cloudflare Browser Rendering
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();

      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
      await page.goto(linkLive, { waitUntil: "networkidle0", timeout: 30000 });

      const pageTitle = await page.title();
      await browser.close();

      return new Response(
        JSON.stringify({
          status: "SUCCESS",
          client_id: "HenDy-Cloud-Worker",
          log: `[${username}] Kích hoạt thành công Brand: ${brand} | Tiêu đề trang: ${pageTitle}`
        }),
        { 
          headers: { 
            "content-type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          } 
        }
      );

    } catch (err) {
      if (browser) {
        try { await browser.close(); } catch(e) {}
      }
      return new Response(
        JSON.stringify({ 
          status: "ERROR", 
          log: `Lỗi thực thi trình duyệt ảo: ${String(err)}` 
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
