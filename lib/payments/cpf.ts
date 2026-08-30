const CPF_BLACKLIST = new Set([
  "00000000000",
  "11111111111",
  "22222222222",
  "33333333333",
  "44444444444",
  "55555555555",
  "66666666666",
  "77777777777",
  "88888888888",
  "99999999999",
]);

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function cpfCheckDigit(digits: number[], factor: number): number {
  const total = digits.reduce((sum, digit, index) => sum + digit * (factor - index), 0);
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidPhone(value: string): boolean {
  const phone = digitsOnly(value);
  return phone.length === 10 || phone.length === 11;
}

export function isValidPostalCode(value: string): boolean {
  return digitsOnly(value).length === 8;
}

export function formatPostalCode(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidCpf(value: string): boolean {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || CPF_BLACKLIST.has(cpf)) {
    return false;
  }

  const numbers = cpf.split("").map((digit) => Number(digit));
  const firstCheck = cpfCheckDigit(numbers.slice(0, 9), 10);
  const secondCheck = cpfCheckDigit(numbers.slice(0, 10), 11);

  return firstCheck === numbers[9] && secondCheck === numbers[10];
}
