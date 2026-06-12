/**
 * Generates a unique human-readable complaint number.
 * Format: SAH-YYYYMMDD-XXXXX (e.g., SAH-20250609-A7K3M)
 */
export function generateComplaintNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SAH-${dateStr}-${randomPart}`;
}
