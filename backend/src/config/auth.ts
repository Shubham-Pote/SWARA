export function getJwtSecret(): string | undefined {
  const secret = process.env.JWT_SECRET;
  const trimmedSecret = secret?.trim();
  return trimmedSecret && trimmedSecret !== 'your-secret-key' ? secret : undefined;
}
