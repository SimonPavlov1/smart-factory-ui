export const APP_TIME_ZONE = "Asia/Yekaterinburg";

export function parseBackendDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(hasTimeZone ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatYekaterinburgDateTime(value, options = {}) {
  const date = parseBackendDateTime(value);
  if (!date) return "—";
  return date.toLocaleString("ru-RU", {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}
