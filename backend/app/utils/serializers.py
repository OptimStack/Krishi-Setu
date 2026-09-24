from bson import ObjectId
from datetime import datetime, date


def serialize_doc(doc):
    """Recursively convert MongoDB document objects (ObjectId, datetime) to JSON-serializable types."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id' and isinstance(value, ObjectId):
                result['_id'] = str(value)
                result['id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, (datetime, date)):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) for v in value]
            else:
                result[key] = value
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, (datetime, date)):
        return doc.isoformat()
    return doc


def serialize_docs(docs):
    """Serialize a list of MongoDB documents."""
    if not docs:
        return []
    return [serialize_doc(doc) for doc in docs]
