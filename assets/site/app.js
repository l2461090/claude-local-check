// Copyright (c) 2026 l2461090. MIT License.
import {checks, assess} from "./model.js";
import {inspect} from "./checks.js";

const lang = location.pathname.startsWith("/zh") ? "zh" : "en";
const zh = lang === "zh";
const words = {
  eyebrow:["本地独立版 · 无广告 · 无统计","LOCAL EDITION · NO ADS · NO ANALYTICS"],
  heading:["看清你的浏览器环境","Understand your browser environment"],
  lead:["一键检查，直接查看评分、结论与每项检测依据。","One scan. A clear assessment and the evidence behind each check."],
  result:["环境检测结论","ENVIRONMENT ASSESSMENT"],
  disclaimer:["浏览器特征的启发式评分，仅供参考，不代表 Claude 官方判断。","A browser heuristic for reference, not an official Claude assessment."],
  start:["开始检测","Start scan"],save:["保存结果图片","Save result image"],
  local:["结果留在当前浏览器","Results stay in this browser"],
  checks:["检测明细","Check details"],count:["10 项信号 · 总权重 100","10 signals · 100 total weight"],
  privacy:["本地检测说明","About this local scan"],
  privacyDetail:["默认检测无需联网，结果不上传。检测反映当前浏览器可见的信息；未发现某个标识，不等于能够确定设备或用户所在地。","Default checks work offline without uploading results. They reflect what this browser exposes; a missing identifier does not establish a device or user's location."],
  webrtc:["启用 WebRTC 网络检测（会连接 Google 公共 STUN 服务器）","Enable WebRTC network check (contacts Google's public STUN server)"],
  partial:["未检测项目单独注明，结论按已测分数给出。WebRTC 仅检查地址是否暴露，不判断 IP 属于哪个国家。","Untested checks are marked separately; verdicts use measured scores. WebRTC checks address exposure, not the country of an IP address."],
  rules:["查看评级规则","View scoring rules"],
  ruleDetail:["0–30 分：低风险；31–60 分：中等风险；61–100 分：高风险。分数不是封号概率。语言、字体及 UTC+8 等特征也可能出现在其他地区。","0–30: low risk; 31–60: medium risk; 61–100: high risk. Scores are not ban probabilities. Languages, fonts and UTC+8 can also occur in other regions."],
};
const text = key => words[key][zh ? 0 : 1];
const $ = id => document.getElementById(id);
document.documentElement.lang = zh ? "zh-CN" : "en";
document.title = zh ? "Claude环境检测" : "Claude Environment Check";
document.querySelector(".brand span").textContent = document.title;
document.querySelector(".brand").href = zh ? "/zh/" : "/";
for (const node of document.querySelectorAll("[data-text]")) node.textContent = text(node.dataset.text);
for (const node of document.querySelectorAll("nav a")) {
  if (node.lang === lang) node.setAttribute("aria-current","page");
}
$("summary-title").textContent = zh ? "等待检测" : "Ready to scan";
$("summary-detail").textContent = zh ? "点击「开始检测」，查看当前浏览器的结果。" : "Start a scan to inspect this browser.";
$("rating").textContent = zh ? "待检测" : "Not scanned";

const rows = new Map();
for (const [index, check] of checks.entries()) {
  const li = document.createElement("li");
  li.className = "check";
  const top = document.createElement("div"); top.className = "check-top";
  const number = document.createElement("span"); number.className = "check-index";
  number.textContent = String(index + 1).padStart(2,"0");
  const name = document.createElement("strong"); name.textContent = check[lang];
  const weight = document.createElement("span"); weight.className = "weight";
  weight.textContent = `${zh ? "权重" : "Weight"} ${check.weight}`;
  top.append(number,name,weight);
  const bottom = document.createElement("div"); bottom.className = "check-value";
  const value = document.createElement("span"); value.textContent = zh ? "等待检测" : "Not scanned";
  const contribution = document.createElement("strong"); contribution.textContent = "—";
  bottom.append(value,contribution); li.append(top,bottom); $("check-list").append(li);
  rows.set(check.id,{li,value,contribution});
}

let completed = null;
let busy = false;

async function scan() {
  if (busy) return;
  busy = true;
  completed = null;
  $("retest").disabled = true;
  $("allow-webrtc").disabled = true;
  $("save").hidden = true;
  $("score").textContent = "—";
  $("score-unit").textContent = "/ 100";
  $("rating").textContent = zh ? "检测中" : "Scanning";
  document.querySelector(".report").dataset.tier = "ready";
  document.querySelector(".meter").style.setProperty("--sweep","0deg");
  $("summary-title").textContent = zh ? "正在检查浏览器环境" : "Inspecting your browser";
  $("summary-detail").textContent = zh ? "请稍候，结果即将显示。" : "Your results will appear shortly.";
  const results = {};
  try {
    for (const [i,check] of checks.entries()) {
      const row = rows.get(check.id);
      row.li.dataset.state = "running";
      row.value.textContent = zh ? "检测中…" : "Checking…";
      row.contribution.textContent = "—";
      $("progress").textContent = `${i + 1} / ${checks.length} · ${check[lang]}`;
      // Allow progress to paint before synchronous font probing.
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 30)));
      try {
        results[check.id] = await inspect(check.id,lang,$("allow-webrtc").checked);
      } catch {
        results[check.id] = {strength:null,value:zh ? "未检测 · 浏览器不支持或检查失败" : "Not tested · unsupported or failed"};
      }
      const found = results[check.id];
      row.value.textContent = found.value;
      const points = typeof found.strength === "number" ? Math.round(found.strength * check.weight) : null;
      row.contribution.textContent = points === null ? "—" : `+${points}`;
      row.li.dataset.state = points ? "hit" : "done";
    }
    const result = assess(results,lang);
    completed = {result,results};
    $("summary-title").textContent = result.title;
    $("summary-detail").textContent = result.detail;
    $("score").textContent = result.missing === 100 ? "—" : String(result.score);
    $("score-unit").textContent = result.missing ? (zh ? "/ 100 · 已测部分" : "/ 100 · partial") : "/ 100";
    $("rating").textContent = result.label;
    document.querySelector(".report").dataset.tier = result.tier;
    document.querySelector(".meter").style.setProperty("--sweep",`${result.score * 3.6}deg`);
    $("save").hidden = false;
    $("progress").textContent = zh ? "检测完成 · 结果未上传" : "Complete · nothing uploaded";
  } catch {
    $("summary-title").textContent = zh ? "检测未完成，请重试" : "Scan incomplete. Please retry.";
    $("summary-detail").textContent = "";
    $("progress").textContent = zh ? "检测失败" : "Scan failed";
  } finally {
    busy = false;
    $("retest").disabled = false;
    $("allow-webrtc").disabled = false;
    $("retest").textContent = zh ? "重新检测" : "Scan again";
  }
}

// Render a local, self-contained PNG using only text and geometric shapes.
function exportImage() {
  if (!completed) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1450;
  const c = canvas.getContext("2d");
  if (!c) return;
  const {result,results} = completed;
  c.fillStyle = "#f7f7f2"; c.fillRect(0,0,1080,1450);
  c.fillStyle = "#282a27"; c.font = "bold 34px sans-serif";
  c.fillText(document.title,70,85);
  c.fillStyle = "#74766d"; c.font = "20px sans-serif";
  c.fillText(zh ? "本地检测结果 · 无广告 · 无统计" : "LOCAL RESULT · NO ADS · NO ANALYTICS",70,125);
  c.fillStyle = "#fff"; c.fillRect(50,165,980,510);
  c.fillStyle = ({low:"#378259",medium:"#a77921",high:"#b4453e"})[result.tier] || "#74766d";
  c.font = "bold 110px sans-serif"; c.textAlign = "center";
  c.fillText(result.missing === 100 ? "—" : `${result.score}`,540,300);
  c.font = "24px sans-serif"; c.fillText(`${result.label} · ${result.missing ? (zh ? "已测部分" : "partial") : "/100"}`,540,350);
  c.fillStyle = "#282a27"; c.font = "bold 32px sans-serif";
  // Wrap by measured width, including languages without spaces.
  const lines = (value,width) => {
    const out = []; let current = "";
    for (const character of value) {
      if (current && c.measureText(current + character).width > width) {out.push(current);current="";}
      current += character;
    }
    if (current) out.push(current);
    return out;
  };
  lines(result.title,850).forEach((line,i) => c.fillText(line,540,415+i*42));
  c.font = "22px sans-serif"; c.fillStyle = "#74766d";
  lines(result.detail,850).forEach((line,i) => c.fillText(line,540,510+i*32));
  c.textAlign = "left";
  for (const [i,check] of checks.entries()) {
    const y = 735 + i*53;
    c.fillStyle = "#282a27"; c.font = "23px sans-serif";c.fillText(check[lang],70,y);
    c.fillStyle = "#74766d"; c.font = "17px sans-serif";
    const value = results[check.id].value;
    const shortened = Array.from(value).slice(0,41).join("");
    c.fillText(shortened + (value.length > 41 ? "…" : ""),350,y);
    c.textAlign = "right";
    const strength = results[check.id].strength;
    c.fillText(strength === null ? "—" : `+${Math.round(strength*check.weight)}`,1000,y);
    c.textAlign = "left";
  }
  c.font = "19px sans-serif";
  lines(text("disclaimer"),930).forEach((line,i) => c.fillText(line,70,1320+i*28));
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");a.href=url;a.download="claude-environment-result.png";
    document.body.append(a);a.click();a.remove();
    setTimeout(() => URL.revokeObjectURL(url),10000);
  },"image/png");
}
$("retest").addEventListener("click",scan);
$("save").addEventListener("click",exportImage);
