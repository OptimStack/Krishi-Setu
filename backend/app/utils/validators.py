import re


def validate_required_fields(data, required_fields):
    """Return list of missing field names, or empty list if all present."""
    return [f for f in required_fields if not data.get(f)]


def validate_phone(phone):
    """Validate Indian phone number (10 digits, optionally prefixed with +91)."""
    pattern = r'^(\+91)?[6-9]\d{9}$'
    return bool(re.match(pattern, phone.strip()))


def validate_email(email):
    """Basic email format validation."""
    if not email:
        return True  # email is optional
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def validate_positive_number(value, field_name='value'):
    """Validate that a value is a positive number."""
    try:
        num = float(value)
        if num <= 0:
            return False, f"{field_name} must be positive"
        return True, num
    except (TypeError, ValueError):
        return False, f"{field_name} must be a valid number"


def validate_enum(value, allowed, field_name='value'):
    """Validate that a value is in the allowed set."""
    if value not in allowed:
        return False, f"{field_name} must be one of: {', '.join(allowed)}"
    return True, value
