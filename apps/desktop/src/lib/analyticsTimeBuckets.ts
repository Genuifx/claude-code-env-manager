export function buildWeekBucketKey(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) {
    return dateStr;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const dateUtc = Date.UTC(year, monthIndex, day);
  const jan1Utc = Date.UTC(year, 0, 1);
  const daysSinceJan1 = Math.floor((dateUtc - jan1Utc) / 86_400_000);
  const jan1WeekdayFromMonday = (new Date(jan1Utc).getUTCDay() + 6) % 7;
  const weekNum = Math.floor((daysSinceJan1 + jan1WeekdayFromMonday + 7) / 7);

  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}
