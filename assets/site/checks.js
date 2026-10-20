// Copyright (c) 2026 l2461090. MIT License.
import {fontFamilies,timezoneScore,languageScore,regionScore,browserScore,deviceScore,emojiScore} from './rules.js';
const result = (strength,value,failed=false)=>({strength,value,failed});

function measureFonts(names,ctx) {
  return names.filter(name=>['monospace','sans-serif','serif'].some(base=>{
    ctx.font = `72px ${base}`;
    const baseline = ctx.measureText('中文字体检测ABCabc012').width;
    ctx.font = `72px "${name}", ${base}`;
    return Math.abs(ctx.measureText('中文字体检测ABCabc012').width-baseline) > 0.5;
  }));
}
function fontCheck(vendor) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return result(0,'canvas unavailable',true);
  if (vendor) {
    const found = measureFonts(fontFamilies.vendor,ctx);
    return result(found.length > 1 ? 1 : found.length ? 0.8 : 0, abbreviate(found,3));
  }
  const sc = measureFonts(fontFamilies.simplified,ctx);
  const tc = measureFonts(fontFamilies.traditional,ctx);
  return result(sc.length ? Math.min(1,0.75+sc.length*0.08) : tc.length ? 0.2 : 0,abbreviate(sc.concat(tc),4));
}
const abbreviate = (items,count)=>items.length ? items.slice(0,count).join(', ')+(items.length>count?'…':'') : 'none detected';

export function networkProbe(lang,enabled=true) {
  if (!enabled) return Promise.resolve(result(null,lang==='zh'?'未检测 · 已手动关闭':'Not tested · manually disabled'));
  const Connection = typeof window==='undefined' ? null : window.RTCPeerConnection;
  if (!Connection) return Promise.resolve(result(0,lang==='zh'?'WebRTC 不可用，按兼容规则计 0 分':'WebRTC unavailable; compatibility score 0',true));
  return new Promise(resolve=>{
    let connection, timer, settled=false;
    const addresses = new Set();
    const finish = ()=>{
      if (settled) return;
      settled=true;
      clearTimeout(timer);
      try {connection?.close();} catch {}
      resolve(result(addresses.size ? 0.5 : 0, addresses.size
        ? (lang==='zh'?'发现候选 IP（地址已隐藏）':'IP candidate found (address hidden)')
        : (lang==='zh'?'1 秒内未发现候选 IP，按规则计 0 分':'No IP candidate within 1 second; score 0')));
    };
    timer=setTimeout(finish,1000);
    try {
      connection=new Connection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
      connection.onicecandidate = event=>{
        const candidate = event.candidate?.candidate;
        if (!candidate) {finish();return;}
        const match=candidate.match(/(?:\d{1,3}\.){3}\d{1,3}|[a-f\d]{1,4}(?::[a-f\d]{1,4}){7}/i);
        if (match) addresses.add(match[0]);
      };
      connection.createDataChannel('');
      connection.createOffer().then(offer=>connection?.setLocalDescription(offer)).catch(finish);
    } catch {finish();}
  });
}

export async function inspect(id,lang,allowNetwork=true) {
  try {
    switch (id) {
      case 'timezone': {
        const value=Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        return result(timezoneScore(value),value || 'unknown');
      }
      case 'language': {
        const languages=(navigator.languages?.length ? navigator.languages : [navigator.language]).map(tag=>(tag || '').toLowerCase());
        return result(languageScore(languages),languages.join(', ') || 'unknown');
      }
      case 'fonts':return fontCheck(false);
      case 'vendorFonts':return fontCheck(true);
      case 'webrtc':return await networkProbe(lang,allowNetwork);
      case 'browser': {
        const brands=(navigator.userAgentData?.brands || []).map(item=>item.brand).join(' ');
        const match=browserScore(`${navigator.userAgent} ${brands}`);
        return result(match.score,match.name || 'none detected');
      }
      case 'device': {
        let hints='';
        try {
          const info=await navigator.userAgentData?.getHighEntropyValues?.(['model','platform','platformVersion']);
          if (info) hints=` ${String(info.model ?? '')} ${String(info.platform ?? '')}`;
        } catch {}
        const match=deviceScore(`${navigator.userAgent}${hints}`);
        return result(match.score,match.name || 'none detected');
      }
      case 'locale': {
        const value=Intl.DateTimeFormat().resolvedOptions().locale || '';
        return result(regionScore(value),value || 'unknown');
      }
      case 'offset': {
        const minutes=new Date().getTimezoneOffset();
        const hours=-minutes/60;
        return result(minutes===-480 ? 0.7 : 0,`UTC${hours>=0?'+':'-'}${Math.abs(hours)}`);
      }
      case 'platform': {
        const match=emojiScore(`${(navigator.platform || '').toLowerCase()} ${(navigator.userAgent || '').toLowerCase()}`);
        return result(match.score,`${match.vendor} style`);
      }
      default:throw new Error('Unknown check');
    }
  } catch {
    return result(0,lang==='zh'?'检测失败，按兼容规则计 0 分':'Check failed; compatibility score 0',true);
  }
}
