export type OutputTokenThroughput = {
  first_token_ms: number | null;
  output_duration_ms: number | null;
  output_tokens_per_second: number | null;
};

type OutputTokenThroughputInput = {
  outputTokens: number;
  startedAtMs: number | null | undefined;
  firstOutputAtMs: number | null | undefined;
  completedAtMs: number;
};

function finitePositiveNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function roundTokensPerSecond(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildOutputTokenThroughput(
  input: OutputTokenThroughputInput,
): OutputTokenThroughput {
  const startedAtMs = finitePositiveNumber(input.startedAtMs);
  const completedAtMs = finitePositiveNumber(input.completedAtMs);
  const firstOutputAtMs = finitePositiveNumber(input.firstOutputAtMs);
  const outputTokens = finitePositiveNumber(input.outputTokens);

  const firstTokenMs = startedAtMs && firstOutputAtMs && firstOutputAtMs >= startedAtMs
    ? firstOutputAtMs - startedAtMs
    : null;

  const durationStartMs = firstOutputAtMs && (!startedAtMs || firstOutputAtMs >= startedAtMs)
    ? firstOutputAtMs
    : startedAtMs;
  const outputDurationMs = completedAtMs && durationStartMs && completedAtMs > durationStartMs
    ? completedAtMs - durationStartMs
    : null;
  const outputTokensPerSecond = outputTokens && outputDurationMs
    ? roundTokensPerSecond(outputTokens / (outputDurationMs / 1000))
    : null;

  return {
    first_token_ms: firstTokenMs,
    output_duration_ms: outputDurationMs,
    output_tokens_per_second: outputTokensPerSecond,
  };
}
