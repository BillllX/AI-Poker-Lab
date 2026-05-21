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
  const [{ createCaptcha }, usersRoute, loginRoute, meRoute, logoutRoute] = await Promise.all([
    import("../src/lib/server/captcha"),
    import("../src/app/api/users/route"),
    import("../src/app/api/users/login/route"),
    import("../src/app/api/users/me/route"),
    import("../src/app/api/users/logout/route"),
  ]);

  const name = `Auth Smoke ${Date.now()}`;
  const password = "smoke-password-123";
  const captcha = createCaptcha();
  const registerResponse = await usersRoute.POST(
    new Request("http://localhost:3000/api/users", {
      method: "POST",
      body: JSON.stringify({
        name,
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
  assert.notEqual(loggedIn.userToken, registered.userToken);

  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  const meResponse = await meRoute.GET(new Request("http://localhost:3000/api/users/me", { headers: { cookie } }));
  assert.equal(meResponse.status, 200);
  const me = await meResponse.json();
  assert.equal(me.user.id, registered.user.id);

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
  return /ECONNREFUSED|Can't reach database|connect ECONNREFUSED/i.test(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
