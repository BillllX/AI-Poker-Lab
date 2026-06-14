import { strict as assert } from "node:assert";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set; skipping user auth smoke tests.");
    return;
  }

  try {
    await runSmoke();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      console.log("Database is unavailable; skipping user auth smoke tests.");
      return;
    }
    throw error;
  }
}

async function runSmoke() {
  const [{ createCaptcha }, { prisma }, { verifyUserToken }, usersRoute, loginRoute, meRoute, meAgentRoute, hostedAgentRoute, tokenResetRoute, logoutRoute] = await Promise.all([
    import("../src/lib/server/captcha"),
    import("../src/lib/server/prisma"),
    import("../src/lib/server/userRegistry"),
    import("../src/app/api/users/route"),
    import("../src/app/api/users/login/route"),
    import("../src/app/api/users/me/route"),
    import("../src/app/api/users/me/agent/route"),
    import("../src/app/api/users/me/hosted-agent/route"),
    import("../src/app/api/users/me/token/reset/route"),
    import("../src/app/api/users/logout/route"),
  ]);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      console.log("Database is unavailable; skipping user auth smoke tests.");
      return;
    }
    throw error;
  }

  const name = `Auth Smoke ${Date.now()}`;
  const email = `auth-smoke-${Date.now()}@example.com`;
  const password = "smoke-password-123";
  const captcha = createCaptcha();
  const registerResponse = await usersRoute.POST(
    new Request("http://localhost:3000/api/users", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
        captchaId: captcha.captchaId,
        captchaAnswer: answerForCaptcha(captcha.challenge),
      }),
    }),
  );

  if (!registerResponse.ok) {
    const payload = await registerResponse.json();
    if (isDatabaseUnavailable(payload.error)) {
      console.log("Database is unavailable; skipping user auth smoke tests.");
      return;
    }
    throw new Error(payload.error ?? "User registration smoke request failed.");
  }

  assert.equal(registerResponse.status, 200);
  const registered = await registerResponse.json();
  assert.equal(registered.user.name, name);
  assert.match(registered.userToken, /^utok_/);
  assert.ok(registerResponse.headers.get("set-cookie")?.includes("texas_poker_user_session="));

  const duplicateEmailCaptcha = createCaptcha();
  const duplicateEmailResponse = await usersRoute.POST(
    new Request("http://localhost:3000/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: `${name} Duplicate Email`,
        email,
        password,
        captchaId: duplicateEmailCaptcha.captchaId,
        captchaAnswer: answerForCaptcha(duplicateEmailCaptcha.challenge),
      }),
    }),
  );
  assert.equal(duplicateEmailResponse.status, 400);

  const badLoginResponse = await loginRoute.POST(
    new Request("http://localhost:3000/api/users/login", {
      method: "POST",
      body: JSON.stringify({ name, password: "wrong-password" }),
    }),
  );
  assert.equal(badLoginResponse.status, 400);

  const loginResponse = await loginRoute.POST(
    new Request("http://localhost:3000/api/users/login", {
      method: "POST",
      body: JSON.stringify({ name, password }),
    }),
  );
  assert.equal(loginResponse.status, 200);
  const loggedIn = await loginResponse.json();
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.match(loggedIn.userToken, /^utok_/);
  assert.equal(loggedIn.userToken, registered.userToken);

  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  const meResponse = await meRoute.GET(new Request("http://localhost:3000/api/users/me", { headers: { cookie } }));
  assert.equal(meResponse.status, 200);
  const me = await meResponse.json();
  assert.equal(me.user.id, registered.user.id);

  const unauthenticatedAgentResponse = await meAgentRoute.GET(new Request("http://localhost:3000/api/users/me/agent"));
  assert.equal(unauthenticatedAgentResponse.status, 401);

  const emptyAgentResponse = await meAgentRoute.GET(new Request("http://localhost:3000/api/users/me/agent", { headers: { cookie } }));
  assert.equal(emptyAgentResponse.status, 200);
  const emptyAgent = await emptyAgentResponse.json();
  assert.equal(emptyAgent.user.id, registered.user.id);
  assert.equal(emptyAgent.agentProfile, null);
  assert.equal(emptyAgent.credentials.ownerUserId, registered.user.id);
  assert.equal(emptyAgent.credentials.userToken, registered.userToken);
  assert.equal(emptyAgent.privateSettings.agentPrompt, "");
  assert.equal(emptyAgent.hostedAgent.available, true);
  assert.equal(emptyAgent.hostedAgent.agent, null);
  assert.ok(emptyAgent.onboarding.skillUrl.endsWith("/api/agents/skill"));

  const promptResponse = await meAgentRoute.PATCH(
    new Request("http://localhost:3000/api/users/me/agent", {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ agentPrompt: "Play tight aggressive in early position." }),
    }),
  );
  assert.equal(promptResponse.status, 200);
  const promptPayload = await promptResponse.json();
  assert.equal(promptPayload.privateSettings.agentPrompt, "Play tight aggressive in early position.");

  const resetResponse = await tokenResetRoute.POST(new Request("http://localhost:3000/api/users/me/token/reset", { method: "POST", headers: { cookie } }));
  assert.equal(resetResponse.status, 200);
  const resetPayload = await resetResponse.json();
  assert.equal(resetPayload.credentials.ownerUserId, registered.user.id);
  assert.match(resetPayload.credentials.userToken, /^utok_/);
  assert.notEqual(resetPayload.credentials.userToken, registered.userToken);
  await assert.rejects(() => verifyUserToken(registered.user.id, registered.userToken), /invalid/);
  await assert.doesNotReject(() => verifyUserToken(registered.user.id, resetPayload.credentials.userToken));

  const hostedResponse = await hostedAgentRoute.POST(new Request("http://localhost:3000/api/users/me/hosted-agent", { method: "POST", headers: { cookie } }));
  assert.equal(hostedResponse.status, 200);
  const hostedPayload = await hostedResponse.json();
  assert.equal(hostedPayload.agent.kind, "hosted");
  assert.equal(hostedPayload.agent.ownerUserId, registered.user.id);
  assert.equal(hostedPayload.hostedAgent.available, true);
  assert.equal(hostedPayload.hostedAgent.agent.id, hostedPayload.agent.id);

  const duplicateHostedResponse = await hostedAgentRoute.POST(new Request("http://localhost:3000/api/users/me/hosted-agent", { method: "POST", headers: { cookie } }));
  assert.equal(duplicateHostedResponse.status, 200);
  const duplicateHosted = await duplicateHostedResponse.json();
  assert.equal(duplicateHosted.agent.id, hostedPayload.agent.id);

  const agentId = hostedPayload.agent.id;
  await prisma.agentResult.create({
    data: {
      id: `agent_result_auth_smoke_${Date.now()}`,
      agentId,
      buyIn: 1000,
      finalStack: 1250,
      gameSessionId: "auth-smoke-session",
      handsPlayed: 12,
      handsWon: 4,
      modelName: hostedPayload.agent.modelName,
      ownerUserId: registered.user.id,
      profit: 250,
      settledReason: "session-ended",
      tableId: "auth-smoke-table",
    },
  });

  const agentResponse = await meAgentRoute.GET(new Request("http://localhost:3000/api/users/me/agent", { headers: { cookie } }));
  assert.equal(agentResponse.status, 200);
  const agentPayload = await agentResponse.json();
  assert.equal(agentPayload.agentProfile.agent.id, agentId);
  assert.equal(agentPayload.hostedAgent.agent.id, agentId);
  assert.ok(agentPayload.agentProfile.historySummary.sessions >= 1);
  assert.ok(agentPayload.agentProfile.historySummary.profit >= 250);
  assert.ok(agentPayload.agentProfile.recentResults.length >= 1);

  const leaveHostedResponse = await hostedAgentRoute.DELETE(new Request("http://localhost:3000/api/users/me/hosted-agent", { method: "DELETE", headers: { cookie } }));
  assert.equal(leaveHostedResponse.status, 200);

  const renamedName = `${name} Renamed`;
  const renameResponse = await usersRoute.PATCH(
    new Request("http://localhost:3000/api/users", {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ name: renamedName }),
    }),
  );
  assert.equal(renameResponse.status, 200);
  const renamed = await renameResponse.json();
  assert.equal(renamed.user.name, renamedName);

  const logoutResponse = await logoutRoute.POST();
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get("set-cookie") ?? "", /Max-Age=0/);

  console.log("User auth smoke tests passed.");
}

function answerForCaptcha(challenge: string) {
  const match = challenge.match(/(\d+) \+ (\d+)/);
  assert.ok(match, `Unexpected captcha challenge: ${challenge}`);
  return String(Number(match[1]) + Number(match[2]));
}

function isDatabaseUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "ECONNREFUSED" || /ECONNREFUSED|Can't reach database|connect ECONNREFUSED/i.test(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
