export function translateAuthError(message: string): string {
  const m = message.toLowerCase();

  if (
    m.includes("password should contain at least one character of each") ||
    m.includes("known to be weak and easy to guess")
  ) {
    return "A senha precisa ter letra maiúscula, letra minúscula, número e símbolo (ex: !@#$%), e não pode ser uma senha comum/vazada. Escolha uma senha mais forte.";
  }

  if (m.includes("user already registered")) {
    return "Este e-mail já está cadastrado. Faça login ou use 'Esqueci minha senha'.";
  }

  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada e spam.";
  }

  if (m.includes("password should be at least")) {
    const match = message.match(/(\d+)/);
    if (match) {
      return `A senha precisa ter no mínimo ${match[1]} caracteres.`;
    }
  }

  if (m.includes("for security purposes, you can only request this after")) {
    return "Por segurança, aguarde alguns segundos antes de tentar novamente.";
  }

  if (m.includes("unable to validate email address")) {
    return "E-mail inválido. Verifique o endereço digitado.";
  }

  if (m.includes("signup is disabled") || m.includes("signups not allowed")) {
    return "Novos cadastros estão temporariamente desativados. Tente novamente mais tarde.";
  }

  return message;
}
