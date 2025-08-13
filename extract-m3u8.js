const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://bigbosslive.com/live/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Wait for .m3u8 to appear in the network (simplified)
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  let m3u8Url = null;

  client.on('Network.responseReceived', async (params) => {
    const { url } = params.response;
    if (url.includes(".m3u8") && !m3u8Url) {
      m3u8Url = url;
      console.log("Found stream:", url);
    }
  });

  await page.waitForTimeout(10000); // Wait for streams to load

  await browser.close();

  if (m3u8Url) {
    fs.writeFileSync("/stream.json", JSON.stringify({ url: m3u8Url }, null, 2));
    console.log("Saved stream URL to /stream.json");
  } else {
    console.error("No .m3u8 link found.");
    process.exit(1);
  }
})();