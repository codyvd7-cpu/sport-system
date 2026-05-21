// Cryptographically secure UUID generation.

export function safeUUID(): string {
  // Use crypto.randomUUID when available (modern browsers + Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback to crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex: string[] = [];
    bytes.forEach(b => hex.push(b.toString(16).padStart(2, '0')));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  }
  throw new Error('No secure random source available');
}

// Cryptographically secure player code generator.
// Format: SBC + 5 uppercase alphanumeric chars
// Uses crypto for unpredictability — no Math.random.
export function generatePlayerCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous chars (I,O,0,1)
  let code = 'SBC';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 5; i++) {
      code += alphabet[bytes[i] % alphabet.length];
    }
    return code;
  }
  throw new Error('No secure random source available');
}

// Secure password generator for new coach accounts.
// 16 chars, mixed case + digits + symbols, crypto-grade.
export function generateSecurePassword(): string {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('No secure random source available');
  }
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let pw = '';
  // Guarantee at least one of each
  pw += upper[bytes[0] % upper.length];
  pw += lower[bytes[1] % lower.length];
  pw += digits[bytes[2] % digits.length];
  pw += symbols[bytes[3] % symbols.length];
  for (let i = 4; i < 16; i++) {
    pw += all[bytes[i] % all.length];
  }
  // Shuffle so the guaranteed chars aren't always at the start
  return pw.split('').sort(() => {
    const r = new Uint8Array(1);
    crypto.getRandomValues(r);
    return r[0] - 128;
  }).join('');
}
