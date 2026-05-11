import { ApiError } from '@sproutly/api-contract';

export function assertValidIanaTimeZone(value: string): void {
  try {
    // eslint-disable-next-line no-new -- Intl throws on invalid zone
    new Intl.DateTimeFormat(undefined, { timeZone: value });
  } catch {
    throw new ApiError('VALIDATION', 'Invalid timezone', { timezone: 'unknown or invalid IANA zone' });
  }
}
