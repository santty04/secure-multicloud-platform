from app.services.email_templates import render_password_setup_email


def test_password_setup_email_escapes_user_input():
    html = render_password_setup_email(
        app_name="SMP",
        full_name='<script>alert("x")</script>',
        link="https://app.example.com/set-password?token=abc&x=1",
        hours=48,
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert 'href="https://app.example.com/set-password?token=abc&amp;x=1"' in html
    assert "48 horas" in html
