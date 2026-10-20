// Copyright (c) 2026 l2461090. MIT License.
// A browser-only heuristic, not a model of an account provider's enforcement.
export const checks = [
  {id:"timezone", weight:24, zh:"系统时区", en:"System timezone"},
  {id:"language", weight:18, zh:"浏览器语言", en:"Browser languages"},
  {id:"fonts", weight:14, zh:"已安装中文字体", en:"Chinese fonts"},
  {id:"vendorFonts", weight:10, zh:"国产厂商字体", en:"Vendor fonts"},
  {id:"webrtc", weight:10, zh:"WebRTC IP 泄露", en:"WebRTC IP exposure"},
  {id:"browser", weight:8, zh:"浏览器标识", en:"Browser identifier"},
  {id:"device", weight:6, zh:"设备标识", en:"Device identifier"},
  {id:"locale", weight:4, zh:"区域格式", en:"Formatting locale"},
  {id:"offset", weight:3, zh:"时区偏移", en:"UTC offset"},
  {id:"platform", weight:3, zh:"Emoji 渲染风格", en:"Emoji rendering style"},
];

export function band(score) {
  return score <= 30 ? "low" : score <= 60 ? "medium" : "high";
}

export function matchedSignals(results) {
  return checks.flatMap(check => {
    const strength = results[check.id]?.strength;
    if (typeof strength !== "number" || !Number.isFinite(strength)) return [];
    const points = Math.round(Math.max(0, Math.min(1, strength)) * check.weight);
    return strength >= 0.25 ? [{...check, points, strength, value:results[check.id].value || ""}] : [];
  });
}

export function assess(results, lang="zh") {
  let score = 0, missing = 0;
  for (const check of checks) {
    const value = results[check.id]?.strength;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      missing += check.weight;
    } else {
      score += Math.round(Math.max(0, Math.min(1, value)) * check.weight);
    }
  }
  const summary = verdict(Math.min(100,score), missing, lang);
  const failures = checks.filter(check=>results[check.id]?.failed).length;
  if (failures) summary.detail += lang === "zh" ? ` ${failures} 项未能正常检测，已按兼容规则计 0 分。` : ` ${failures} checks could not complete and received compatibility score 0.`;
  return summary;
}

export function verdict(score, missing=0, lang="zh") {
  const zh = lang === "zh";
  const tier = band(score);
  const labels = zh ? ["低风险","中等风险","高风险"] : ["Low risk","Medium risk","High risk"];
  const sentences = zh
    ? ["🐶你不是「Claude 中国用户」🐶","🐶你可能是「Claude 中国用户」🐶","🐶你绝对是「Claude 中国用户」🐶"]
    : ["🐶You are not a “Claude China user”🐶","🐶You may be a “Claude China user”🐶","🐶You are a “Claude China user”🐶"];
  const index = ["low","medium","high"].indexOf(tier);
  const upper = Math.min(100, score + missing);
  return {
    score, missing, upper,
    tier: missing === 100 ? "unknown" : tier,
    title: missing === 100 ? (zh ? "未获取到有效检测结果" : "No usable results") : sentences[index],
    label: missing === 100 ? (zh ? "无法评级" : "Unavailable") : labels[index],
    detail: missing === 100
      ? (zh ? "浏览器未能完成检测，请重试。" : "The checks could not complete. Please retry.")
      : missing
        ? (zh ? `已测 ${score} 分，未检测项目占 ${missing} 分；完整分数可能为 ${score}–${upper}。结论按已测分数显示${band(upper)!==tier ? "，完整评级可能改变" : ""}。`
              : `Measured ${score}; untested weight ${missing}; possible total ${score}–${upper}. The verdict uses measured checks${band(upper)!==tier ? "; the full rating may change" : ""}.`)
        : (zh ? `检测结束，评分 ${score}/100。` : `Scan finished. Score ${score}/100.`)
  };
}
