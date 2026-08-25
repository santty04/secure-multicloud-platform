import jwt
import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_does_not_store_plain_text():
    password = "PruebaSegura123!"

    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$argon2")


def test_verify_password_accepts_correct_password():
    password = "PruebaSegura123!"
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True


def test_verify_password_rejects_incorrect_password():
    hashed = hash_password("PruebaSegura123!")

    assert verify_password("ContraseñaIncorrecta123!", hashed) is False


def test_access_token_contains_subject():
    token = create_access_token("user-123")

    assert decode_access_token(token) == "user-123"


def test_invalid_access_token_is_rejected():
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token("token-invalido")
