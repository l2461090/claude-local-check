// Copyright (c) 2026 l2461090. MIT License.
import {localeStrength} from "./model.js";

const known = (strength, value) => ({strength, value:String(value)});
const unavailable = value => ({strength:null, value});

function probeFonts(names) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const sample = "环境检测 AaMW 0123456789";
  const fallbacks = ["monospace","serif","sans-serif"];
  const widths = fallbacks.map(base => {
    ctx.font = `36px ${base}`;
    return ctx.measureText(sample).width;
  });
  return names.filter(name => fallbacks.some((base,index) => {
    ctx.font = `36px "${name}", ${base}`;
    return Math.abs(ctx.measureText(sample).width - widths[index]) > 0.1;
  }));
}

async function networkProbe(zh, allowed) {
  if (!allowed) return unavailable(zh ? "未检测 · 默认关闭" : "Not tested · disabled");
  if (!window.RTCPeerConnection) return unavailable(zh ? "浏览器不支持" : "Unsupported");
  return new Promise(resolve => {
    let pc, timer, finished = false;
    const addresses = new Set();
    const finish = (error=false) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (pc) {
        pc.onicecandidate = null;
        pc.onicegatheringstatechange = null;
        pc.close();
      }
      // Absence of a candidate cannot prove the network is safe.
      resolve(addresses.size
        ? known(1, zh ? "发现数字 IP 候选地址（未显示地址）" : "Numeric IP candidate found (address hidden)")
        : unavailable(zh ? (error ? "连接失败或超时" : "未发现数字 IP，无法确认网络状况")
                          : (error ? "Failed or timed out" : "No numeric IP; network status unknown")));
    };
    try {
      pc = new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
      timer = setTimeout(() => finish(true), 4500);
      pc.onicecandidate = event => {
        if (!event.candidate) return finish();
        const address = event.candidate.address || event.candidate.candidate.split(/\s+/)[4] || "";
        if (address && !address.endsWith(".local") && /^[0-9a-f:.]+$/i.test(address)) addresses.add(address);
      };
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") finish(); };
      pc.createDataChannel("environment-check");
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => finish(true));
    } catch { finish(true); }
  });
}

export async function inspect(id, lang, allowNetwork) {
  const zh = lang === "zh";
  const absent = zh ? "未发现匹配标识" : "No matching identifier";
  const ua = navigator.userAgent || "";
  switch (id) {
    case "timezone": {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!zone) throw new Error("No timezone");
      return known(["Asia/Shanghai","Asia/Urumqi","Asia/Chongqing","Asia/Harbin","PRC"].includes(zone) ? 1 : 0, zone);
    }
    case "language": {
      const languages = Array.from(navigator.languages || [navigator.language]).filter(Boolean);
      if (!languages.length) throw new Error("No language");
      return known(Math.max(...languages.map((v,i) => localeStrength(v) * (i ? 0.5 : 1))), languages.join(", "));
    }
    case "fonts":
    case "vendorFonts": {
      const names = id === "fonts"
        ? ["Microsoft YaHei","SimSun","SimHei","PingFang SC","Noto Sans CJK SC"]
        : ["MiSans","HarmonyOS Sans SC","OPPO Sans","HONOR Sans CN"];
      const found = probeFonts(names);
      return known(found.length ? 1 : 0, found.join(", ") || absent);
    }
    case "webrtc": return networkProbe(zh, allowNetwork);
    case "browser": {
      const match = ua.match(/MicroMessenger|QQBrowser|UCBrowser|Quark|BaiduBrowser|HuaweiBrowser|Sogou|360SE|360EE/i);
      return known(match ? 1 : 0, match ? match[0] : absent);
    }
    case "device": {
      // Only read already exposed values; do not request extra device permissions.
      const match = ua.match(/HarmonyOS|HUAWEI|HONOR|Xiaomi|Redmi|OPPO|vivo|OnePlus/i);
      return known(match ? 1 : 0, match ? match[0] : absent);
    }
    case "locale": {
      const locale = Intl.NumberFormat().resolvedOptions().locale;
      if (!locale) throw new Error("No locale");
      return known(localeStrength(locale), locale);
    }
    case "offset": {
      const minutes = -new Date().getTimezoneOffset();
      return known(minutes === 480 ? 1 : 0, `UTC${minutes >= 0 ? "+" : ""}${minutes/60}`);
    }
    case "platform": {
      const windows = /Windows/i.test(ua);
      const android = /Android/i.test(ua);
      const apple = /Macintosh|Mac OS|iPhone|iPad/i.test(ua);
      return known(windows || android ? 0.5 : apple ? 0.25 : 0,
                   windows ? "Windows" : android ? "Android" : apple ? "Apple" : (zh ? "其他系统" : "Other system"));
    }
    default: throw new Error("Unknown check");
  }
}
