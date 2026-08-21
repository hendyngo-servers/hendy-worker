import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const username = url.searchParams.get("username") || "player_01";
    const linkLive = url.searchParams.get("link_live") || "https://example.com";

    let browser;
    try {
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();
      await page.goto(linkLive, { waitUntil: "networkidle0" });
      const pageTitle = await page.title();
      await browser.close();

      return new Response(JSON.stringify({
        status: "SUCCESS",
        log: `[${username}] Thành công! Tiêu đề trang: ${pageTitle}`
      }), {
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      if (browser) { try { await browser.close(); } catch(e) {} }
      return new Response(JSON.stringify({ status: "ERROR", log: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  },
};
