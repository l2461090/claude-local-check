import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspect,networkProbe} from '../assets/site/checks.js';
const fixtures=JSON.parse(readFileSync(new URL('./browser-fixtures.json',import.meta.url),'utf8'));
test('all ten browser checks match compatibility fixtures',async()=>{
const NativeDate=Date, nativeIntl=Intl, realTimeout=setTimeout;
const savedNavigator=Object.getOwnPropertyDescriptor(globalThis,"navigator");
const savedWindow=globalThis.window, savedRTC=globalThis.RTCPeerConnection, savedDocument=globalThis.document;
const ids=['timezone','language','fonts','vendorFonts','webrtc','browser','device','locale','offset','platform'];
let config;
globalThis.setTimeout=(fn,ms)=>{assert.equal(ms,1000);return realTimeout(fn,2);};
globalThis.Date=class extends NativeDate{getTimezoneOffset(){return config.offset ?? -480;}};
globalThis.Intl={...nativeIntl,DateTimeFormat:function(){if(config.intlFails)throw Error();return{resolvedOptions:()=>({timeZone:config.zone ?? 'Asia/Taipei',locale:config.locale ?? 'zh-TW'})};}};
Object.defineProperty(globalThis,'navigator',{configurable:true,get:()=>({
 userAgent:config.ua ?? 'Macintosh',platform:config.platform ?? 'MacIntel',language:config.language ?? 'zh-TW',languages:config.languages ?? ['zh-TW','zh','en-US'],
 userAgentData:config.noHints?undefined:{brands:(config.brands||[]).map(brand=>({brand})),getHighEntropyValues:async keys=>{assert.deepEqual(keys,['model','platform','platformVersion']);if(config.hintsFail)throw Error();return{model:config.model||'',platform:config.hintPlatform||''};}}
})});
globalThis.document={createElement:()=>({getContext:()=>config.noCanvas?null:{font:'',measureText(){const family=this.font.match(/"([^"]+)"/);return{width:100+(family && (config.fonts||[]).includes(family[1]) ? config.widthDelta ?? 1 : 0)};}}})};
class RTC {
 constructor(options){assert.deepEqual(options,{iceServers:[{urls:'stun:stun.l.google.com:19302'}]});if(config.rtcThrows)throw Error();}
 createDataChannel(label){assert.equal(label,'');}
 createOffer(){return config.offerFails?Promise.reject(Error()):Promise.resolve({type:'offer'});}
 setLocalDescription(){if(config.timeout)return Promise.resolve();queueMicrotask(()=>{for(const candidate of config.candidates||[])this.onicecandidate?.({candidate:{candidate}});this.onicecandidate?.({candidate:null});});return Promise.resolve();}
 close(){}
}

try {
 for(const {input,scores} of fixtures) {
  config=input;globalThis.window={RTCPeerConnection:input.rtcMissing?undefined:RTC};globalThis.RTCPeerConnection=RTC;
  for(let i=0;i<ids.length;i++) assert.equal((await inspect(ids[i],'zh',true)).strength,scores[i],JSON.stringify({input,id:ids[i]}));
 }
 let constructed=false;
 globalThis.window={RTCPeerConnection:class {constructor(){constructed=true;}}};
 assert.equal((await networkProbe('zh',false)).strength,null);
 assert.equal(constructed,false);
} finally {
 globalThis.Date=NativeDate;globalThis.Intl=nativeIntl;globalThis.setTimeout=realTimeout;
 if(savedNavigator) Object.defineProperty(globalThis,'navigator',savedNavigator);else delete globalThis.navigator;
 globalThis.window=savedWindow;globalThis.RTCPeerConnection=savedRTC;globalThis.document=savedDocument;
}
});
