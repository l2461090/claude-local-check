import test from "node:test";
import assert from "node:assert/strict";
import {checks,assess,verdict,localeStrength,matchedSignals} from "../assets/site/model.js";

test("weights and three-band boundaries",() => {
  assert.equal(checks.reduce((sum,c)=>sum+c.weight,0),100);
  for (const [score,tier,word] of [[0,"low","不是"],[30,"low","不是"],[31,"medium","可能是"],[40,"medium","可能是"],[60,"medium","可能是"],[61,"high","绝对是"],[80,"high","绝对是"],[100,"high","绝对是"]]) {
    const result = verdict(score);
    assert.equal(result.tier,tier);
    assert.ok(result.title.includes(word));
  }
});
test("missing checks cannot silently become a complete low-risk result",() => {
  assert.equal(assess({}).tier,"unknown");
  const results=Object.fromEntries(checks.map(c=>[c.id,{strength:0}]));
  delete results.webrtc;
  assert.equal(assess(results).missing,10);
  assert.equal(assess(results).upper,10);
  assert.ok(verdict(60,10).detail.includes("完整评级可能改变"));
});
test("known measurements contribute their weights and invalid values are untested",() => {
  const results=Object.fromEntries(checks.map(c=>[c.id,{strength:1}]));
  assert.equal(assess(results).score,100);
  assert.equal(assess(results).missing,0);
  results.timezone.strength=NaN;
  assert.equal(assess(results).score,76);
  assert.equal(assess(results).missing,24);
});
test("language matching is scoped to locale tags",() => {
  assert.equal(localeStrength("zh_CN"),1);
  assert.equal(localeStrength("zh-Hans-CN"),1);
  assert.equal(localeStrength("zh-TW"),0.4);
  assert.equal(localeStrength("en-US"),0);
  assert.equal(localeStrength("not-zh-CN"),0);
});
test("matched signals show every positive contribution, ordered by points",() => {
  const results = {
    fonts:{strength:1,value:"Example font"},
    offset:{strength:1},
    platform:{strength:0.25},
    language:{strength:0},
    webrtc:{strength:null},
    browser:{strength:NaN},
  };
  const hits = matchedSignals(results);
  assert.deepEqual(hits.map(h=>[h.id,h.points]),[["fonts",14],["offset",3],["platform",1]]);
  assert.equal(hits.reduce((sum,h)=>sum+h.points,0),assess(results).score);
  assert.equal(hits[0].value,"Example font");
  assert.deepEqual(matchedSignals({}),[]);
});
