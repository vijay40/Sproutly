const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function relativeTime(then: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - then.getTime();
  const sec = Math.floor(diffMs / 1000);

  if (sec < 60) return 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;

  const week = Math.floor(day / 7);
  if (week <= 4) return `${week} week${week === 1 ? '' : 's'} ago`;

  return `${MONTHS[then.getUTCMonth()]} ${then.getUTCDate()}, ${then.getUTCFullYear()}`;
}
