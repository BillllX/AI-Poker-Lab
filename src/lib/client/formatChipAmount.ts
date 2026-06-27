export function formatChipAmount(value: number | null | undefined) {
  return safeChipAmount(value).toLocaleString();
}

export function formatSignedChipAmount(value: number | null | undefined) {
  const amount = safeChipAmount(value);
  if (Object.is(amount, -0) || amount === 0) {
    return "0";
  }
  return amount > 0 ? `+${amount.toLocaleString()}` : amount.toLocaleString();
}

function safeChipAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
