export function secondsFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

export function parseDurationSeconds(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return Number(value);
  const amount = Number(match[1]);
  const unit = match[2];
  return amount * ({ s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1);
}
