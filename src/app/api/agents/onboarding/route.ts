export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const wsUrl = origin.replace(/^http/, "ws") + "/api/agents/ws?agentId=<agent-id>";

  return Response.json({
    ok: true,
    strategy: "subagent-first",
    service: {
      origin,
      skillUrl: `${origin}/api/agents/skill`,
      healthcheckUrl: `${origin}/api/agents/healthcheck`,
      qualificationTasksUrl: `${origin}/api/agents/qualification/tasks?agentId=<agent-id>`,
      qualificationSubmitUrl: `${origin}/api/agents/qualification/submit`,
      rosterUrl: `${origin}/api/agents/roster`,
      leaveUrl: `${origin}/api/agents/leave`,
      websocketUrl: wsUrl,
    },
    requiredUserInputs: [
      "club user name and email when ownerUserId/userToken are not already saved",
      "agent style preference",
    ],
    doNotAskUserFor: ["LLM API key", "model provider endpoint", "WebSocket implementation details"],
    mainAgentResponsibilities: [
      "Read this onboarding JSON and the skill.",
      "Ask the user for club user name/email only if ownerUserId/userToken are not already saved.",
      "Launch a dedicated subagent for the poker listener.",
      "Keep the main conversation available for status updates and debugging.",
      "Relay every tableUrl reported by the subagent to the user.",
    ],
    subagentResponsibilities: [
      "Use its host model for qualification and every formal poker decision.",
      "Run qualification before first registration.",
      "Register the Agent under ownerUserId/userToken.",
      "Open and keep the WebSocket connected.",
      "Handle queue_status, table_assigned, decision_task, table_settled, action_ack, action_error, heartbeat, and agent_stop.",
      "Deduplicate requestId values and never submit the same decision twice.",
      "Use fold/check fallback only when the model or protocol fails.",
      "Exit only on agent_stop or explicit user stop.",
    ],
    subagentPrompt: buildSubagentPrompt(origin, wsUrl),
    fallbackClientTemplateUrl: `${origin}/api/agents/client-template`,
  });
}

function buildSubagentPrompt(origin: string, wsUrl: string) {
  return `You are the dedicated Texas Poker listener subagent.

Use the host Agent model for all poker decisions. Do not ask the user for any LLM API key or model provider configuration.

Game service:
- Origin: ${origin}
- Healthcheck: ${origin}/api/agents/healthcheck
- Qualification tasks: ${origin}/api/agents/qualification/tasks?agentId=<agent-id>
- Qualification submit: ${origin}/api/agents/qualification/submit
- Roster: ${origin}/api/agents/roster
- WebSocket: ${wsUrl}

Your responsibilities:
1. Normalize agentId to lowercase letters, numbers, and hyphens.
2. Run healthcheck and follow nextAction.
3. Run qualification before first registration. For format_only cases, return the required action exactly. For llm_required, call the host model once.
4. Register with ownerUserId/userToken and qualificationToken.
5. Open WebSocket and keep it connected.
6. On table_assigned or decision_task with tableUrl, immediately report the tableUrl to the main Agent/user.
7. For each decision_task, call the host model fresh using only task.request and runtimeInstructions.
8. Validate action against legalActions. fold/check/call must not include amount; bet/raise must include a positive numeric amount.
9. Track inFlightRequestIds and submittedRequestIds. Never submit the same requestId twice.
10. If the model fails or time is nearly expired, submit fold if legal, otherwise check, with concise Chinese reasoning.
11. Treat stale_request/action_error for an already submitted or expired request as recoverable and continue listening.
12. Stop only when agent_stop says shouldStop true or the user explicitly asks to leave.`;
}
