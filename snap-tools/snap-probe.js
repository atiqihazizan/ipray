// CDP screenshot + DOM dump dari kiosk. Usage: node snap-probe.js [frames] [interval] [outdir] [prefix]
const WS = require("/home/ipray/kiosk/node_modules/ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const FRAMES = parseInt(process.argv[2] || "3", 10);
const INTERVAL = parseInt(process.argv[3] || "8", 10);
const OUTDIR = process.argv[4] || path.join(process.env.HOME, "snapshots");
const PREFIX = process.argv[5] || "f";
const get = (u) => new Promise((res, rej) => { http.get(u, r => { let d=""; r.on("data",c=>d+=c); r.on("end",()=>res(d)); }).on("error",rej); });
(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const list = JSON.parse(await get("http://127.0.0.1:9222/json/list"));
  const page = list.find(t => t.type === "page" && t.url.includes("localhost:3000")) || list.find(t => t.type === "page");
  if (!page) throw new Error("no-app-page");
  const ws = new WS(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0;
  const send = (method, params) => new Promise((res) => {
    const mid = ++id;
    const onMsg = (raw) => { const m = JSON.parse(raw); if (m.id===mid){ ws.off("message", onMsg); res(m); } };
    ws.on("message", onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expr) => {
    const { result } = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    return result && result.result ? result.result.value : "EVAL_ERR";
  };
  const shot = async (i) => {
    const { result } = await send("Page.captureScreenshot", { format: "png" });
    const fp = path.join(OUTDIR, PREFIX + i + ".png");
    fs.writeFileSync(fp, Buffer.from(result.data, "base64"));
    return result.data.length;
  };
  const dumpExpr = `(() => {
    const title = (document.body ? document.body.innerText.slice(0,90) : "").replace(/\\n/g," | ");
    const caps = document.querySelectorAll("[u=caption]").length;
    return "captions=" + caps + " text=[" + title + "]";
  })()`;
  ws.on("open", async () => {
    await send("Page.enable");
    await send("Runtime.enable");
    await new Promise(r => setTimeout(r, 3000));
    for (let i = 0; i < FRAMES; i++) {
      const d = await evalJs(dumpExpr);
      const sz = await shot(i);
      console.log("FRAME", i, "size=" + sz, "|", d);
      if (i < FRAMES - 1) await new Promise(r => setTimeout(r, INTERVAL * 1000));
    }
    process.exit(0);
  });
  ws.on("error", e => { console.error("WSE", e.message); process.exit(1); });
  setTimeout(() => process.exit(1), (FRAMES * INTERVAL + 60) * 1000);
})().catch(e => { console.error(e); process.exit(1); });
