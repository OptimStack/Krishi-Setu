import logging
import json
from datetime import datetime, timezone


def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - [%(name)s] - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


state_logger = get_logger('krishisetu.state')


def log_state_transition(entity_type, entity_id, from_state, to_state, details=None):
    """
    Structured logging of all entity lifecycle state transitions.
    Entity types: produce_listing, pooled_batch, bid, auction_round, trade, payment
    """
    event = {
        "event": "state_transition",
        "entity_type": str(entity_type),
        "entity_id": str(entity_id),
        "from_state": str(from_state) if from_state else None,
        "to_state": str(to_state),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details or {}
    }
    summary = f"[STATE_CHANGE] {entity_type.upper()} #{str(entity_id)[-6:]}: {from_state} -> {to_state}"
    if details:
        summary += f" | {json.dumps(details)}"
    state_logger.info(summary)
    return event
