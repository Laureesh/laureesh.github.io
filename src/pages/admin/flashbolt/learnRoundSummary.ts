export function learnRoundSummary(round: number, size: number, index: number, answered: boolean, retries: number, pending: number) {
  const completed = Math.min(size, Math.max(0, index + Number(answered)));
  return {
    completed,
    remaining: Math.max(0, size - completed) + retries,
    scheduledRounds: round + Math.ceil(pending / 7),
    percent: size ? Math.round(completed / size * 100) : 0,
  };
}
