import { strict as assert } from "node:assert";
import { GET as getClientTemplate } from "../src/app/api/agents/client-template/route";
import { POST as postHealthcheck } from "../src/app/api/agents/healthcheck/route";
import { GET as getOnboarding } from "../src/app/api/agents/onboarding/route";
import { GET as getQualificationTasks } from "../src/app/api/agents/qualification/tasks/route";
import { POST as postQualificationSubmit } from "../src/app/api/agents/qualification/submit/route";
import { createQualificationSession, createQualificationWsTask, markQualificationWsPassed, submitQualification } from "../src/lib/server/qualification";

async function main() {
  const onboardingResponse = await getOnboarding(new Request("http://localhost:3000/api/agents/onboarding"));
  const onboarding = await onboardingResponse.json();

  assert.equal(onboarding.ok, true);
  assert.equal(onboarding.strategy, "subagent-first");
  assert.match(onboarding.subagentPrompt, /dedicated Texas Poker listener subagent/);
  assert.match(onboarding.subagentPrompt, /Do not ask the user for any LLM API key/);
  assert.match(onboarding.subagentPrompt, /Do not inspect OpenClaw\/Cursor config files/);
  assert.match(onboarding.subagentPrompt, /Never search local config, environment variables, credential stores/);
  assert.match(onboarding.subagentPrompt, /If healthcheck returns open_websocket or already_connected, do not fetch qualification tasks/);
  assert.match(onboarding.subagentPrompt, /If healthcheck returns register_agent with issuedQualificationToken, do not run qualification again/);
  assert.match(onboarding.subagentPrompt, /Profile HTML/);
  assert.match(onboarding.subagentPrompt, /fully inline/);
  assert.match(onboarding.subagentPrompt, /qualificationId as 30-minute, in-memory, and single-use/);
  assert.match(onboarding.subagentPrompt, /fetch fresh qualification tasks/);
  assert.match(onboarding.subagentPrompt, /Do not retry the same submit payload/);
  assert.match(onboarding.subagentPrompt, /mapping every returned qualification\.tasks item/);
  assert.match(onboarding.subagentPrompt, /Do not skip llm-decision-case/);
  assert.match(onboarding.subagentPrompt, /missingCaseIds\/expectedCaseIds\/exampleResponseShape/);
  assert.match(onboarding.subagentPrompt, /Qualification WebSocket sandbox/);
  assert.match(onboarding.subagentPrompt, /only three core HTTP cases/);
  assert.match(onboarding.subagentPrompt, /30-minute/);
  assert.match(onboarding.subagentPrompt, /model may choose only action and reasoning/);
  assert.match(onboarding.subagentPrompt, /requestId copied exactly from task\.request\.requestId/);
  assert.match(onboarding.subagentPrompt, /playerId copied exactly from task\.request\.playerId/);
  assert.match(onboarding.subagentPrompt, /toCall is greater than stack/);
  assert.match(onboarding.subagentPrompt, /mark it all-in/);
  assert.match(onboarding.subagentPrompt, /Rebuild the envelope from the current task/);
  assert.ok(
    onboarding.subagentResponsibilities.some((item: string) =>
      item.includes("copy requestId/playerId/tableId from the current task"),
    ),
  );
  assert.ok(
    onboarding.subagentResponsibilities.some((item: string) =>
      item.includes("Discard stale qualificationId values"),
    ),
  );
  assert.ok(
    onboarding.subagentResponsibilities.some((item: string) =>
      item.includes("WebSocket sandbox qualification"),
    ),
  );
  assert.ok(
    onboarding.subagentResponsibilities.some((item: string) =>
      item.includes("Always run healthcheck first"),
    ),
  );
  assert.match(onboarding.service.qualificationWebSocketUrl, /\/api\/agents\/qualification\/ws/);
  assert.equal(onboarding.skill.name, "texas-poker-agent-skill");
  assert.equal(onboarding.skill.repositoryUrl, "https://github.com/BillllX/texas-poker-agent-skill");
  assert.equal(onboarding.skill.updateCommand, "npm run update");
  assert.equal(onboarding.skill.recommendedRef, "main");
  assert.match(onboarding.skill.recommendedCommit, /^[0-9a-f]{40}$/);
  assert.equal(onboarding.skill.capabilityVersion, "2026-05-17-profile-html-v1");
  assert.ok(onboarding.skill.minimumFeatureSet.includes("agent-profile-custom-html"));
  assert.ok(
    onboarding.doNotAskUserFor.some((item: string) =>
      item.includes("OpenClaw config files or local credential paths"),
    ),
  );
  assert.equal(onboarding.service.healthcheckUrl, "http://localhost:3000/api/agents/healthcheck");

  const healthcheckResponse = await postHealthcheck(
    new Request("http://localhost:3000/api/agents/healthcheck", {
      method: "POST",
      body: JSON.stringify({
        agentId: "Smoke Agent",
        modelName: "OpenClaw host model",
      }),
    }),
  );
  const healthcheck = await healthcheckResponse.json();

  assert.equal(healthcheck.ok, false);
  assert.equal(healthcheck.agentId, "smoke-agent");
  assert.equal(healthcheck.nextAction, "create_user_or_provide_saved_credentials");
  assert.ok(healthcheck.issues.some((issue: { code: string }) => issue.code === "missing_user_credentials"));
  assert.equal(healthcheck.skill.capabilityVersion, onboarding.skill.capabilityVersion);
  assert.equal(healthcheck.skillUpdate.updateCommand, "npm run update");

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
  assert.match(template, /runQualificationSandbox/);
  assert.match(template, /runHealthcheck/);
  assert.match(template, /persisted qualification found; reusing issued token/);
  assert.match(template, /\/api\/agents\/qualification\/ws/);
  assert.match(template, /duplicate request ignored/);

  assertWebSocketQualificationRequired();
  await assertQualificationTaskContractAndStructuredErrors();

  console.log("Onboarding smoke tests passed.");
}

async function assertQualificationTaskContractAndStructuredErrors() {
  const tasksResponse = await getQualificationTasks(new Request("http://localhost:3000/api/agents/qualification/tasks?agentId=Contract Agent"));
  const qualification = await tasksResponse.json();
  const caseIds = qualification.tasks.map((task: { qualificationCase: { caseId: string } }) => task.qualificationCase.caseId);

  assert.deepEqual(caseIds, ["llm-decision-case", "call-format-case", "raise-format-case"]);
  assert.equal(qualification.submissionContract.expectedResponses.length, qualification.tasks.length);
  assert.ok(qualification.submissionContract.expectedResponses.some((item: { caseId: string }) => item.caseId === "llm-decision-case"));
  assert.ok(new Date(qualification.expiresAt).getTime() - new Date(qualification.createdAt).getTime() >= 29 * 60_000);
  markQualificationWsPassed(qualification.agentId, qualification.qualificationId);

  const partialResponses = qualification.tasks
    .filter((task: { qualificationCase: { caseId: string } }) => task.qualificationCase.caseId !== "llm-decision-case")
    .map((task: { qualificationCase: { caseId: string; requiredAction?: unknown }; requestId: string; playerId: string }) => ({
      caseId: task.qualificationCase.caseId,
      response: {
        type: "action_response",
        requestId: task.requestId,
        playerId: task.playerId,
        action: task.qualificationCase.requiredAction,
        reasoning: "格式测试：按要求提交动作。",
      },
    }));

  const submitResponse = await postQualificationSubmit(
    new Request("http://localhost:3000/api/agents/qualification/submit", {
      method: "POST",
      body: JSON.stringify({
        agentId: qualification.agentId,
        qualificationId: qualification.qualificationId,
        responses: partialResponses,
      }),
    }),
  );
  const error = await submitResponse.json();

  assert.equal(error.ok, false);
  assert.equal(error.code, "missing_qualification_response");
  assert.deepEqual(error.missingCaseIds, ["llm-decision-case"]);
  assert.ok(error.expectedCaseIds.includes("llm-decision-case"));
  assert.equal(error.exampleResponseShape.caseId, "llm-decision-case");
}

function assertWebSocketQualificationRequired() {
  const qualification = createQualificationSession("Smoke Agent Ws");
  const responses = qualification.tasks.map((task) => ({
    caseId: task.qualificationCase.caseId,
    response: {
      type: "action_response",
      requestId: task.requestId,
      playerId: task.playerId,
      action: task.qualificationCase.requiredAction ?? { type: "fold" },
      reasoning: "准入测试：使用合法动作完成格式校验。",
    },
  }));

  assert.throws(
    () =>
      submitQualification({
        agentId: qualification.agentId,
        qualificationId: qualification.qualificationId,
        responses,
      }),
    /WebSocket qualification is required/,
  );

  const wsTask = createQualificationWsTask(qualification.agentId, qualification.qualificationId);
  assert.equal(wsTask.qualificationCase.caseId, "ws-decision-case");
  markQualificationWsPassed(qualification.agentId, qualification.qualificationId);
  const result = submitQualification({
    agentId: qualification.agentId,
    qualificationId: qualification.qualificationId,
    responses,
  });
  assert.equal(result.agentId, qualification.agentId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
