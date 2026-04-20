export const RECENT_NEWS_MONTHS = 3;

export function isNewsRecent(dateStr, recentMonths = RECENT_NEWS_MONTHS) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setMonth(now.getMonth() - recentMonths);

  const itemDate = new Date(dateStr.replace(/\./g, '-'));
  if (Number.isNaN(itemDate.getTime())) return false;

  return itemDate > thresholdDate;
}
