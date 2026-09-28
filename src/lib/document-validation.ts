/** Validação de CPF/CNPJ pelos dígitos verificadores. */

export const onlyDigits = (value: string | null | undefined): string => (value || "").replace(/\D/g, "");

export const isValidCPF = (cpf: string): boolean => {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10]);
};

export const isValidCNPJ = (cnpj: string): boolean => {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let remainder = sum % 11;
  if (parseInt(digits[12]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  remainder = sum % 11;
  return parseInt(digits[13]) === (remainder < 2 ? 0 : 11 - remainder);
};

export function isValidCpfCnpj(value: string | null | undefined, type?: "CPF" | "CNPJ"): boolean {
  const d = onlyDigits(value);
  if (type === "CPF") return isValidCPF(d);
  if (type === "CNPJ") return isValidCNPJ(d);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

/** Mensagem de erro para CPF/CNPJ inválido, ou null se válido. */
export function cpfCnpjError(value: string | null | undefined, type?: "CPF" | "CNPJ" | string | null): string | null {
  const d = onlyDigits(value);
  const t = type === "CPF" || type === "CNPJ" ? type : d.length === 14 ? "CNPJ" : "CPF";
  return isValidCpfCnpj(d, t) ? null : `${t} inválido: confira os dígitos`;
}
