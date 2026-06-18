from datetime import datetime, timedelta
from functools import wraps
import jwt
from flask import request, jsonify, current_app


def create_token(professional_id):
    payload = {
        "professional_id": professional_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=8),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ")
        if not token:
            return jsonify({"error": "Token de autenticacion requerido"}), 401
        try:
            payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            request.current_professional_id = payload["professional_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado. Inicia sesion nuevamente."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token invalido."}), 401
        return f(*args, **kwargs)
    return decorated


def require_professional_match(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ")
        if not token:
            return jsonify({"error": "Token de autenticacion requerido"}), 401
        try:
            payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            request.current_professional_id = payload["professional_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado. Inicia sesion nuevamente."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token invalido."}), 401

        route_prof_id = kwargs.get("prof_id")
        if route_prof_id is not None and request.current_professional_id != route_prof_id:
            return jsonify({"error": "No tienes permiso para modificar este profesional."}), 403

        return f(*args, **kwargs)
    return decorated


def limit_content_length(max_bytes):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            content_length = request.content_length or 0
            if content_length > max_bytes:
                return jsonify({
                    "error": f"El cuerpo de la solicitud excede el limite de {max_bytes} bytes."
                }), 413
            return f(*args, **kwargs)
        return decorated
    return decorator
