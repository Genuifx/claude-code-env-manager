interface HistorySessionDisplayCandidate {
  display: string;
  projectName: string;
  id: string;
}

export function getHistorySessionDisplay(
  session: HistorySessionDisplayCandidate,
  fallbackLabel: string
): string {
  const trimmed = session.display.trim();
  if (trimmed) {
    return trimmed;
  }
  const projectName = session.projectName.trim();
  if (projectName) {
    return projectName;
  }
  const sessionId = session.id.trim();
  if (sessionId) {
    return sessionId;
  }
  return fallbackLabel;
}
