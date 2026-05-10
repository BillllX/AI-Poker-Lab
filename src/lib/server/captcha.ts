import { randomUUID } from "node:crypto";

type CaptchaEntry = {
  answer: string;
  expiresAt: number;
};

const ttlMs = 10 * 60_000;

const globalForCaptcha = globalThis as typeof globalThis & {
  __texasPokerCaptchas?: Map<string, CaptchaEntry>;
};

const captchas = (globalForCaptcha.__texasPokerCaptchas ??= new Map<string, CaptchaEntry>());

export function createCaptcha() {
  cleanupExpiredCaptchas();

  const left = randomInt(2, 12);
  const right = randomInt(2, 12);
  const captchaId = `captcha_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const answer = String(left + right);

  captchas.set(captchaId, {
    answer,
    expiresAt: Date.now() + ttlMs,
  });

  return {
    captchaId,
    challenge: `${left} + ${right} = ?`,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
}

export function consumeCaptcha(captchaId: unknown, answer: unknown) {
  cleanupExpiredCaptchas();

  if (typeof captchaId !== "string" || !captchaId.trim()) {
    throw new Error("captchaId is required.");
  }

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("captchaAnswer is required.");
  }

  const entry = captchas.get(captchaId);
  if (!entry) {
    throw new Error("Captcha is invalid or expired.");
  }

  captchas.delete(captchaId);

  if (entry.answer !== answer.trim()) {
    throw new Error("Captcha answer is incorrect.");
  }
}

function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [captchaId, entry] of captchas) {
    if (entry.expiresAt <= now) {
      captchas.delete(captchaId);
    }
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
