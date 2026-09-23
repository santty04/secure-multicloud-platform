from html import escape

# Email clients ignore <style> blocks and CSS variables, so everything is
# inlined and laid out with tables. Colors mirror the frontend `smp-*` tokens.
_BG = "#eef2f8"
_HEADER = "#070d1a"
_ACCENT = "#2f7ff6"
_INK = "#0f1b2d"
_MUTED = "#5b6b85"
_LINE = "#e2e8f2"
_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def render_password_setup_email(
    *, app_name: str, full_name: str, link: str, hours: int
) -> str:
    app = escape(app_name)
    name = escape(full_name)
    href = escape(link, quote=True)

    return f"""\
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Activa tu cuenta</title>
</head>
<body style="margin:0;padding:0;background:{_BG};">
<div style="display:none;max-height:0;overflow:hidden;">Define tu contraseña para empezar a usar {app}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{_BG};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid {_LINE};">
        <tr>
          <td style="background:{_HEADER};padding:22px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="34" height="34" align="center" valign="middle" style="background:{_ACCENT};border-radius:9px;font-family:{_FONT};font-size:16px;font-weight:700;color:#061021;">&#9670;</td>
                <td style="padding-left:12px;font-family:{_FONT};">
                  <div style="font-size:15px;font-weight:700;color:#e8eefb;">{app}</div>
                  <div style="font-size:10.5px;letter-spacing:.06em;color:#6b7c9b;">ADMINISTRACIÓN SEGURA DE INFRAESTRUCTURA</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 8px;font-family:{_FONT};color:{_INK};">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;">Activa tu cuenta</h1>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hola {name},</p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:{_MUTED};">Un administrador creó una cuenta para ti en <strong style="color:{_INK};">{app}</strong>. Para empezar a usarla, define tu contraseña de acceso.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="{_ACCENT}" style="border-radius:10px;">
                  <a href="{href}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:{_FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Definir contraseña</a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;padding:14px 16px;background:#f5f8fc;border-radius:10px;font-size:13px;line-height:1.55;color:{_MUTED};">Este enlace vence en <strong style="color:{_INK};">{hours} horas</strong> y solo puede usarse una vez.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px;font-family:{_FONT};">
            <p style="margin:0 0 6px;font-size:12.5px;line-height:1.5;color:{_MUTED};">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="margin:0;font-size:12.5px;line-height:1.5;word-break:break-all;"><a href="{href}" target="_blank" style="color:{_ACCENT};text-decoration:underline;">{href}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;border-top:1px solid {_LINE};font-family:{_FONT};font-size:12px;line-height:1.5;color:#8a97ad;">Si no esperabas este correo, puedes ignorarlo: tu cuenta no se activará sin tu contraseña.</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""
