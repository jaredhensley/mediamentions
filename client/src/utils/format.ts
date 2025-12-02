export function formatDisplayDate(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const tense = diffMs >= 0 ? 'ago' : 'from now';
  const absMs = Math.abs(diffMs);

  const seconds = Math.round(absMs / 1000);
  if (seconds < 60) return `${seconds}s ${tense}`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ${tense}`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ${tense}`;

  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ${tense}`;

  const weeks = Math.round(days / 7);
  return `${weeks}w ${tense}`;
}
