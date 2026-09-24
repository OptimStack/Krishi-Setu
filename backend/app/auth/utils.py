from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
from datetime import timedelta


def hash_password(password):
    """Hash a password using werkzeug's PBKDF2 (safe for production)."""
    return generate_password_hash(password)


def verify_password(plain_password, password_hash):
    """Verify a plaintext password against its hash."""
    return check_password_hash(password_hash, plain_password)


def generate_tokens(user_id, role):
    """Generate both access and refresh JWT tokens."""
    identity = str(user_id)
    additional_claims = {"role": role}
    access_token = create_access_token(
        identity=identity,
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=1),
    )
    refresh_token = create_refresh_token(
        identity=identity,
        additional_claims=additional_claims,
        expires_delta=timedelta(days=30),
    )
    return access_token, refresh_token
