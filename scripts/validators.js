export const descRegex = /^\S(?:.*\S)?$/;
export const amountRegex = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
export const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const categoryRegex = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
export const duplicateRegex = /\b(\w+)\s+\1\b/i;

function isValidISODate(value) {
  if (!dateRegex.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validate(field, value) {
  if (typeof value !== "string") return false;

  switch (field) {
    case "description":
      return descRegex.test(value);
    case "amount":
      return amountRegex.test(value);
    case "date":
      return isValidISODate(value);
    case "category":
      return categoryRegex.test(value);
    default:
      return false;
  }
}
