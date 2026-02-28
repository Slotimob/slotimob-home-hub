/**
 * Template HTML para e-mail de recuperação de senha.
 * 
 * COMO USAR:
 * 1. Acesse o Supabase Dashboard → Authentication → Email Templates
 * 2. Selecione "Reset Password"
 * 3. Cole o conteúdo do template abaixo no campo "Body"
 * 4. No campo "Subject", use: "Redefinir sua senha - SlotiMob"
 * 
 * Variáveis disponíveis do Supabase:
 * - {{ .ConfirmationURL }} - Link de redefinição de senha
 * - {{ .Email }} - Email do usuário
 * - {{ .SiteURL }} - URL do site
 */

export const RECOVERY_EMAIL_SUBJECT = "Redefinir sua senha - SlotiMob";

export const RECOVERY_EMAIL_BODY = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redefinir Senha</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#170075,#2db88a);padding:32px 24px;text-align:center;">
<img src="https://slotimob.lovable.app/sloti-logo.png" alt="SlotiMob" width="160" style="display:block;margin:0 auto;" />
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 28px;background:#ffffff;color:#333;font-size:16px;line-height:1.7;">
<h1 style="color:#170075;font-size:24px;margin:0 0 16px;">Redefinir sua senha</h1>
<p>Olá! Recebemos uma solicitação para redefinir a senha da sua conta SlotiMob associada a <strong>{{ .Email }}</strong>.</p>
<p>Clique no botão abaixo para criar uma nova senha:</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
<tr><td style="background:#170075;border-radius:8px;padding:14px 32px;">
<a href="{{ .ConfirmationURL }}" target="_blank" style="color:#fff;text-decoration:none;font-weight:600;font-size:16px;display:block;">Redefinir Senha</a>
</td></tr></table>

<p style="color:#6b6e99;font-size:14px;">Este link expira em 1 hora. Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.</p>
<p style="color:#6b6e99;font-size:13px;margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">Se o botão não funcionar, copie e cole este link no seu navegador:<br>
<a href="{{ .ConfirmationURL }}" style="color:#2db88a;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 28px;background:#f4f4f9;text-align:center;font-size:12px;color:#6b6e99;">
<p style="margin:0;">© 2025 SlotiMob — O futuro da gestão imobiliária</p>
<p style="margin:4px 0 0;">Este e-mail foi enviado automaticamente. Não é necessário responder.</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>
`;

/**
 * Template para o Supabase Dashboard (copiar apenas o HTML entre as crases acima).
 * 
 * Subject: Redefinir sua senha - SlotiMob
 */
