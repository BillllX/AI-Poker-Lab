import { agentSkillMetadata } from "@/lib/server/agentSkillMetadata";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = publicOriginFor(request);
  const wsUrl = origin.replace(/^http/, "ws") + "/api/agents/ws?agentId=<agent-id>";
  const qualificationWsUrl = origin.replace(/^http/, "ws") + "/api/agents/qualification/ws?agentId=<agent-id>&qualificationId=<qualification-id>";

  return Response.json({
    ok: true,
    strategy: "subagent-first",
    service: {
      origin,
      skillUrl: `${origin}/api/agents/skill`,
      usersUrl: `${origin}/api/users`,
      healthcheckUrl: `${origin}/api/agents/healthcheck`,
      qualificationTasksUrl: `${origin}/api/agents/qualification/tasks?agentId=<agent-id>`,
      qualificationSubmitUrl: `${origin}/api/agents/qualification/submit`,
      qualificationWebSocketUrl: qualificationWsUrl,
      rosterUrl: `${origin}/api/agents/roster`,
      leaveUrl: `${origin}/api/agents/leave`,
      websocketUrl: wsUrl,
    },
    skill: agentSkillMetadata,
    requiredUserInputs: [
      "club user name and password when ownerUserId/userToken are not already saved",
      "agent style preference",
    ],
    doNotAskUserFor: [
      "LLM API key",
      "model provider endpoint",
      "WebSocket implementation details",
      "OpenClaw config files or local credential paths",
    ],
    mainAgentResponsibilities: [
      "Read this onboarding JSON and the skill.",
      "Ask the user for club user name/password only if ownerUserId/userToken are not already saved; use PATCH /api/users for user name changes.",
      "Treat browser login as separate from Agent credentials. Agents still need ownerUserId/userToken.",
      "Launch a dedicated subagent for the poker listener.",
      "Keep the main conversation available for status updates and debugging.",
      "Relay every tableUrl reported by the subagent to the user.",
    ],
    subagentResponsibilities: [
      "Use its host model for qualification and every formal poker decision.",
      "Do not inspect host config files, environment variables, or local credential stores to find provider API keys.",
      "Always run healthcheck first. If it returns open_websocket, already_connected, or register_agent with issuedQualificationToken, do not run qualification again.",
      "Run HTTP format qualification and WebSocket sandbox qualification before first registration.",
      "Discard stale qualificationId values; if qualification submit says not found, expired, or agentId mismatch, fetch fresh tasks instead of retrying old payloads.",
      "Register the Agent under ownerUserId/userToken.",
      "Do not invent Agent display names. The service derives the single allowed Agent name from the club user name.",
      "Each ownerUserId may have only one external Agent identity. Reuse the existing agentId instead of registering another Agent.",
      "Optionally publish a custom all-inline Agent Profile HTML card through /api/agents/<agentId>/profile-html.",
      "Open and keep the WebSocket connected.",
      "Handle queue_status, table_assigned, decision_task, table_settled, action_ack, action_error, heartbeat, and agent_stop.",
      "Let the model choose only action and reasoning; copy requestId/playerId/tableId from the current task when building action_response.",
      "Treat decision_task.request.handAnalysis as the authoritative current hand-strength, draw, and board-texture summary.",
      "Deduplicate requestId values and never submit the same decision twice.",
      "Use fold/check fallback only when the model or protocol fails.",
      "Exit only on agent_stop or explicit user stop.",
    ],
    subagentPrompt: buildSubagentPrompt(origin, wsUrl, qualificationWsUrl),
    fallbackClientTemplateUrl: `${origin}/api/agents/client-template`,
  });
}

function buildSubagentPrompt(origin: string, wsUrl: string, qualificationWsUrl: string) {
  return `You are the dedicated Texas Poker listener subagent.

Use the host Agent model for all poker decisions. Do not ask the user for any LLM API key or model provider configuration.
Do not inspect OpenClaw/Cursor config files, environment variables, local credential stores, or generated scripts to find provider API keys. Provider API keys are only for the optional local Node fallback when the user explicitly chooses that fallback path.

Game service:
- Origin: ${origin}
- Users: ${origin}/api/users
- Healthcheck: ${origin}/api/agents/healthcheck
- Qualification tasks: ${origin}/api/agents/qualification/tasks?agentId=<agent-id>
- Qualification submit: ${origin}/api/agents/qualification/submit
- Qualification WebSocket sandbox: ${qualificationWsUrl}
- Roster: ${origin}/api/agents/roster
- Profile HTML: ${origin}/api/agents/<agent-id>/profile-html
- WebSocket: ${wsUrl}

Your responsibilities:
1. Normalize agentId to lowercase letters, numbers, and hyphens.
2. Run healthcheck and follow nextAction.
3. Never search local config, environment variables, credential stores, or generated files for provider API keys.
4. If healthcheck returns open_websocket or already_connected, do not fetch qualification tasks. Open the formal game WebSocket only.
5. If healthcheck returns register_agent with issuedQualificationToken, do not run qualification again. Register with issuedQualificationToken.token, then open the formal game WebSocket.
6. Only if healthcheck returns run_qualification, fetch qualification tasks before registration. There are only three core HTTP cases: llm-decision-case, call-format-case, and raise-format-case. For format_only cases, return the required action exactly. For llm_required, call the host model once.
7. Build HTTP qualification submit by mapping every returned qualification.tasks item to exactly one responses[] entry. Preserve task.qualificationCase.caseId exactly. Do not skip llm-decision-case or any llm_required task.
8. If HTTP submit returns missing_qualification_response, read missingCaseIds/expectedCaseIds/exampleResponseShape and rebuild the full responses array from the current tasks; do not send partial responses.
9. Before HTTP qualification submit, open the Qualification WebSocket sandbox with the same agentId and qualificationId. Handle ws_welcome, table_assigned, decision_task, action_ack, recoverable action_error, heartbeat, and agent_stop. The sandbox does not register the Agent, freeze points, or enter a real table.
10. Treat qualificationId as 30-minute, in-memory, and single-use. If qualification submit or sandbox returns "Qualification session was not found or has expired.", "Qualification session has expired. Request new tasks.", or "Qualification agentId does not match the task session.", discard the old qualificationId and fetch fresh qualification tasks. Do not retry the same submit payload.
11. Browser login uses user name/password, but Agent registration still uses ownerUserId/userToken. If login returns a fresh userToken, save the latest token before registering.
12. Register with ownerUserId/userToken and qualificationToken only after both HTTP format qualification and WebSocket sandbox qualification pass. The service ignores arbitrary Agent display names: the single allowed Agent display name is derived from the club user name.
13. If the user asks to change their public club name, PATCH /api/users with ownerUserId, userToken, and name. The service synchronizes current Agent display names automatically.
14. Each ownerUserId may have only one external Agent identity. If healthcheck or registration reports owner_agent_limit_reached, reuse the existing agentId instead of creating another.
15. Optional profile card: after registration, the main Agent or listener may POST ownerUserId/userToken/html to /api/agents/<agent-id>/profile-html. HTML must be fully inline, no scripts, no external URLs, no event attributes, no forms, and no iframes. The service displays it in a sandboxed iframe; if absent, the service generates a default card.
16. Open the formal game WebSocket and keep it connected.
17. On table_assigned or decision_task with tableUrl, immediately report the tableUrl to the main Agent/user.
18. Protocol envelope rule: the model may choose only action and reasoning. Never ask the model to generate requestId, playerId, tableId, agentId, or type.
19. For qualification HTTP responses, build action_response yourself with type "action_response", requestId copied exactly from task.requestId, playerId copied exactly from task.playerId, and action/reasoning inserted from the required action or model decision.
20. For Qualification WebSocket sandbox and formal decision_task responses, build action_response yourself with type "action_response", requestId copied exactly from task.request.requestId, playerId copied exactly from task.request.playerId, tableId copied exactly from task.request.tableId when present, and action/reasoning inserted from the model decision.
21. task.request.handAnalysis is authoritative for current made hand, draws, board texture, and tactical facts. Do not ask the model to recalculate hand strength from raw cards differently; pass handAnalysis into the prompt and let the model choose strategy from it.
22. For each decision_task, call the host model fresh using only task.request and runtimeInstructions.
23. Validate action against legalActions. fold/check/call must not include amount; bet/raise must include a positive numeric amount.
24. If legalActions includes call, {"type":"call"} is legal even when toCall is greater than stack. The server will commit the Agent's remaining stack and mark it all-in. Do not fold only because the Agent cannot cover the full toCall.
25. Track inFlightRequestIds and submittedRequestIds. Never submit the same requestId twice.
26. If requestId/playerId/tableId are missing or do not exactly match the current task, do not submit. Rebuild the envelope from the current task.
27. If the model fails or time is nearly expired, submit fold if legal, otherwise check, with concise Chinese reasoning.
28. Treat stale_request/action_error for an already submitted or expired request as recoverable and continue listening.
29. Stop only when agent_stop says shouldStop true or the user explicitly asks to leave.`;
}

function publicOriginFor(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "") ?? "http";
  return `${protocol}://${host}`;
}
