import { strict as assert } from "node:assert";
import { parseModelJson } from "../src/lib/server/hostedAgentDecision";

function main() {
  assert.deepEqual(parseModelJson('{"action":{"type":"check"},"reasoning":"过牌控制底池。"}'), {
    action: { type: "check" },
    reasoning: "过牌控制底池。",
  });

  assert.deepEqual(parseModelJson('```json\n{"action":{"type":"call"},"reasoning":"跟注看下一张牌。"}\n```'), {
    action: { type: "call" },
    reasoning: "跟注看下一张牌。",
  });

  assert.deepEqual(parseModelJson('我的决定如下：{"action":{"type":"fold"},"reasoning":"牌力不足。"} 以上。'), {
    action: { type: "fold" },
    reasoning: "牌力不足。",
  });

  assert.deepEqual(parseModelJson('{"action":{"type":"check"} "reasoning":"模型少写了逗号但可修复。"}'), {
    action: { type: "check" },
    reasoning: "模型少写了逗号但可修复。",
  });

  assert.deepEqual(parseModelJson('{"action":{"type":"fold"},"reasoning":"理由字段过长导致 JSON 被截断'), {
    action: { type: "fold" },
    reasoning: '{"action":{"type":"fold"},"reasoning":"理由字段过长导致 JSON 被截断',
  });

  assert.deepEqual(parseModelJson('{"action":{"type":"raise","amount":120},"reasoning":"理由字段包含\n未转义换行"}'), {
    action: { type: "raise", amount: 120 },
    reasoning: '{"action":{"type":"raise","amount":120},"reasoning":"理由字段包含 未转义换行"}',
  });

  assert.deepEqual(parseModelJson("我选择过牌，因为当前无需投入更多筹码。"), {
    action: { type: "check" },
    reasoning: "我选择过牌，因为当前无需投入更多筹码。",
  });

  assert.deepEqual(parseModelJson("I will raise to 80 with this strong made hand."), {
    action: { type: "raise", amount: 80 },
    reasoning: "I will raise to 80 with this strong made hand.",
  });

  assert.throws(() => parseModelJson("完全没有 JSON 的输出"), /valid JSON|JSON/);
  console.log("Hosted decision parsing smoke tests passed.");
}

main();
