export function formatChipAmount(value: number) {
  return value.toLocaleString();
}

export function formatSignedChipAmount(value: number) {
  if (Object.is(value, -0) || value === 0) {
    return "0";
  }
  return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
}
