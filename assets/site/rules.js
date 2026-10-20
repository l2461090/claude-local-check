// Copyright (c) 2026 l2461090. MIT License.
// Compatibility rules expressed separately from browser access.
export const fontFamilies = {
  simplified: 'Microsoft YaHei|Microsoft YaHei UI|SimSun|NSimSun|SimHei|KaiTi|FangSong|DengXian|PingFang SC|Hiragino Sans GB|STHeiti|STSong|Songti SC|Source Han Sans CN|Source Han Sans SC|Noto Sans CJK SC|Noto Serif CJK SC|WenQuanYi Micro Hei|WenQuanYi Zen Hei'.split('|'),
  traditional: 'Microsoft JhengHei|PMingLiU|MingLiU|DFKai-SB|PingFang TC|PingFang HK|Source Han Sans TW|Noto Sans CJK TC'.split('|'),
  vendor: 'MiSans|MIUI|HarmonyOS Sans SC|HarmonyOS Sans|HONOR Sans|OPPO Sans|vivo Sans|Alibaba PuHuiTi|Alibaba Sans|DingTalk JinBuTi|Douyin Sans|HYQiHei|FZShuSong-Z01S|FZKai-Z03S|FZHei-B01S|FZFangSong-Z02S'.split('|'),
};
export function timezoneScore(zone) {
  if (['Shanghai','Urumqi','Chongqing','Chungking','Harbin','Kashgar'].some(city=>zone===`Asia/${city}`)) return 1;
  return zone === 'Asia/Hong_Kong' || zone === 'Asia/Macau' ? 0.6 : 0;
}
export function languageScore(languages) {
  const tags = languages.map(tag=>(tag || '').toLowerCase()).filter(Boolean);
  const taiwan = tag=>tag.startsWith('zh-tw') || (tag.includes('hant') && tag.includes('tw'));
  const hkmo = tag=>tag.startsWith('zh-hk') || tag.startsWith('zh-mo');
  const traditionalIndex = tags.findIndex(tag=>taiwan(tag) || hkmo(tag) || tag.includes('hant'));
  const eligible = [];
  tags.forEach((tag,index)=>{
    if (taiwan(tag) || (tag === 'zh' && traditionalIndex >= 0 && index > traditionalIndex)) return;
    const simplified = tag.startsWith('zh-cn') || tag.includes('hans') || (tag === 'zh' && (traditionalIndex < 0 || index < traditionalIndex));
    eligible.push({tag,simplified});
  });
  if (!eligible.length) return 0;
  if (eligible[0].simplified) return 1;
  if (hkmo(eligible[0].tag) || eligible[0].tag.includes('hant')) return 0.5;
  if (eligible.some(item=>item.simplified)) return 0.7;
  return eligible.some(item=>item.tag.startsWith('zh')) ? 0.4 : 0;
}
export function regionScore(locale) {
  const value = locale.toLowerCase();
  if (value === 'zh' || value.startsWith('zh-cn') || value.includes('hans')) return 1;
  return value.startsWith('zh') && !value.startsWith('zh-tw') ? 0.5 : 0;
}
// Ordered token rules: precedence matters when several identifiers occur together.
const browserRules = [
  ['WeChat', /micromessenger|wxwork/i], ['QQ Browser', /mqqbrowser|qqbrowser|\bqq\//i],
  ['Quark', /quark/i], ['UC Browser', /ucbrowser|ucweb/i], ['Baidu', /baiduboxapp|bidubrowser|baidubrowser/i],
  ['Mi Browser', /miuibrowser|xiaomi\/|mibrowser/i], ['Huawei Browser', /huaweibrowser/i],
  ['HeyTap (OPPO)', /heytapbrowser|oppobrowser/i], ['vivo Browser', /vivobrowser/i],
  ['Sogou', /sogoumobilebrowser|\bmetasr\b|\bse 2\.x\b/i], ['Maxthon', /maxthon/i],
  ['360 Browser', /360se|360ee|qihoobrowser|\bqhbrowser\b/i], ['2345', /2345explorer|2345browser/i],
  ['Liebao', /lbbrowser/i], ['TheWorld', /theworld/i], ['Douyin / Toutiao', /aweme|bytedancewebview|newsarticle|toutiaomicroapp/i],
  ['Alipay', /alipayclient/i], ['DingTalk', /dingtalk/i], ['Weibo', /weibo/i],
  ['Xiaohongshu', /xiaohongshu|xhsminiapp/i], ['Bilibili', /\bbilibili\b/i],
];
const deviceRules = [
  ['HarmonyOS',1,/harmonyos|openharmony/i], ['Huawei / Honor',0.8,/huawei|\bhonor\b/i],
  ['Meizu',0.8,/meizu/i], ['ZTE / nubia',0.7,/nubia|\bzte\b/i],
  ['Xiaomi',0.6,/xiaomi|redmi|\bpoco\b|\bm2\d{3}[a-z0-9]+\b/i],
  ['OPPO',0.6,/oppo|\bpd[a-z]m\d{2}\b/i], ['vivo',0.6,/vivo|\bv2\d{3}[a-z]{1,2}\b/i],
  ['realme',0.6,/realme|\brmx\d{4}\b/i], ['OnePlus',0.6,/oneplus/i], ['Lenovo',0.5,/\blenovo\b|\bzuk\b/i],
];
export function browserScore(probe) {
  const match = browserRules.find(rule=>rule[1].test(probe));
  return {name:match?.[0] ?? null, score:match ? 1 : 0};
}
export function deviceScore(probe) {
  const match = deviceRules.find(rule=>rule[2].test(probe));
  return {name:match?.[0] ?? null, score:match?.[1] ?? 0};
}
export function emojiScore(probe) {
  const options = [
    ['Apple',0.25,/iphone|ipad|ipod|mac/i], ['Google',0.35,/android/i],
    ['Microsoft',0.4,/win/i], ['Google',0.35,/cros/i], ['Linux / Other',0.5,/linux/i],
  ];
  const match = options.find(rule=>rule[2].test(probe));
  return {vendor:match?.[0] ?? 'Unknown',score:match?.[1] ?? 0.4};
}
