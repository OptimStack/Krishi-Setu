from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt
)
from .utils import hash_password, verify_password, generate_tokens
from app.models.user import User
from app.utils.validators import validate_required_fields

auth_bp = Blueprint('auth', __name__)


def _sanitize_user(user_doc):
    """Return a safe user dict (no password_hash) for the frontend."""
    if not user_doc:
        return None
    return {
        'id': str(user_doc['_id']),
        'name': user_doc.get('name', ''),
        'phone': user_doc.get('phone', ''),
        'email': user_doc.get('email'),
        'role': user_doc['role'],
        'language_pref': user_doc.get('language_pref', 'en'),
        'kyc_verified': user_doc.get('kyc_verified', False),
    }


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}

    # Validate required fields
    missing = validate_required_fields(data, ['name', 'phone', 'password', 'role'])
    if missing:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": f"Missing required fields: {', '.join(missing)}"}
        }), 400

    # Role must be farmer or buyer (admins are created manually)
    if data['role'] not in ('farmer', 'buyer'):
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": "Role must be 'farmer' or 'buyer'"}
        }), 400

    # Check for duplicate phone
    if User.find_by_phone(data['phone']):
        return jsonify({
            "data": None,
            "error": {"code": "DUPLICATE", "message": "Phone number already registered"}
        }), 409

    # Create user
    user_doc = User.create({
        'name': data['name'],
        'phone': data['phone'],
        'email': data.get('email'),
        'password_hash': hash_password(data['password']),
        'role': data['role'],
        'language_pref': data.get('language_pref', 'en'),
        'location': data.get('location', {}),
    })

    # Issue tokens
    access_token, refresh_token = generate_tokens(user_doc['_id'], user_doc['role'])

    return jsonify({
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": _sanitize_user(user_doc),
        },
        "error": None
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}

    # Accept phone or email as identifier
    identifier = data.get('phone') or data.get('email')
    password = data.get('password')

    if not identifier or not password:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": "Phone/email and password are required"}
        }), 400

    # Look up user by phone first, then email
    user = User.find_by_phone(identifier)
    if not user and '@' in identifier:
        user = User.find_by_email(identifier)

    if not user or not verify_password(password, user.get('password_hash', '')):
        return jsonify({
            "data": None,
            "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid phone/email or password"}
        }), 401

    # Issue tokens
    access_token, refresh_token = generate_tokens(user['_id'], user['role'])

    return jsonify({
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": _sanitize_user(user),
        },
        "error": None
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role', 'farmer')

    new_access_token, _ = generate_tokens(current_user_id, role)

    return jsonify({
        "data": {"access_token": new_access_token},
        "error": None
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Return the currently authenticated user's profile."""
    current_user_id = get_jwt_identity()
    user = User.find_by_id(current_user_id)

    if not user:
        return jsonify({
            "data": None,
            "error": {"code": "NOT_FOUND", "message": "User not found"}
        }), 404

    return jsonify({
        "data": {"user": _sanitize_user(user)},
        "error": None
    })
