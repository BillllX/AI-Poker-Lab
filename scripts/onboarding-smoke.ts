import { strict as assert } from "node:assert";
import { GET as getClientTemplate } from "../src/app/api/agents/client-template/route";
import { POST as postHealthcheck } from "../src/app/api/agents/healthcheck/route";
import { GET as getOnboarding } from "../src/app/api/agents/onboarding/route";

async function main() {
  const onboardingResponse = await getOnboarding(new Request("http://localhost:3000/api/agents/onboarding"));
  const onboarding = await onboardingResponse.json();

  assert.equal(onboarding.ok, true);
  assert.equal(onboarding.strategy, "subagent-first");
  assert.match(onboarding.subagentPrompt, /dedicated Texas Poker listener subagent/);
  assert.match(onboarding.subagentPrompt, /Do not ask the user for any LLM API key/);
  assert.equal(onboarding.service.healthcheckUrl, "http://localhost:3000/api/agents/healthcheck");

  const healthcheckResponse = await postHealthcheck(
    new Request("http://localhost:3000/api/agents/healthcheck", {
      method: "POST",
      body: JSON.stringify({
        agentId: "Smoke Agent",
        modelName: "OpenClaw-MiniMax",
      }),
    }),
  );
  const healthcheck = await healthcheckResponse.json();

  assert.equal(healthcheck.ok, false);
  assert.equal(healthcheck.agentId, "smoke-agent");
  assert.equal(healthcheck.nextAction, "create_user_or_provide_saved_credentials");
  assert.ok(healthcheck.issues.some((issue: { code: string }) => issue.code === "missing_user_credentials"));

  const templateResponse = await getClientTemplate();
  const template = await templateResponse.text();

  assert.match(template, /MINIMAX_THINKING_TOKENS/);
  assert.match(template, /type: "enabled"/);
  assert.match(template, /textBlock/);
  assert.match(template, /thinkingText/);
  assert.match(template, /inFlightRequestIds/);
  assert.match(template, /submittedRequestIds/);
  assert.match(template, /normalizeDecision/);
  assert.match(template, /stale_request/);

  console.log("Onboarding smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
