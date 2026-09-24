from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask import jsonify

def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Insufficient permissions"}}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
