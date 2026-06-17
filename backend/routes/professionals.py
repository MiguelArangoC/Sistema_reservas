from datetime import datetime
from flask import Blueprint, jsonify, request, abort
from models import db, Professional, UnavailableSlot

professionals_bp = Blueprint("professionals", __name__)


@professionals_bp.route("/api/professionals", methods=["GET"])
def get_professionals():
    professionals = Professional.query.filter_by(is_active=True).order_by(Professional.name).all()
    return jsonify([p.to_dict() for p in professionals])


@professionals_bp.route("/api/professionals/<int:prof_id>", methods=["GET"])
def get_professional(prof_id):
    prof = Professional.query.get_or_404(prof_id)
    return jsonify(prof.to_dict())


@professionals_bp.route("/api/professionals/by-service/<int:service_id>", methods=["GET"])
def get_professionals_by_service(service_id):
    """Return all active professionals who can perform a given service."""
    professionals = (
        Professional.query
        .filter_by(is_active=True)
        .filter(Professional.services.any(id=service_id))
        .order_by(Professional.name)
        .all()
    )
    return jsonify([p.to_dict() for p in professionals])


@professionals_bp.route("/api/professionals/login", methods=["POST"])
def professional_login():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        abort(400, description="Usuario y contrasena son obligatorios.")

    professional = Professional.query.filter_by(username=username, is_active=True).first()
    if not professional or not professional.check_password(password):
        abort(401, description="Credenciales incorrectas.")

    return jsonify({
        "role": "professional",
        "professional": professional.to_dict(),
    })


@professionals_bp.route("/api/professionals/<int:prof_id>/unavailable", methods=["GET"])
def list_unavailable_slots(prof_id):
    Professional.query.get_or_404(prof_id)
    slots = (
        UnavailableSlot.query
        .filter_by(professional_id=prof_id)
        .order_by(UnavailableSlot.start_datetime.asc())
        .all()
    )
    return jsonify([slot.to_dict() for slot in slots])


@professionals_bp.route("/api/professionals/<int:prof_id>/unavailable", methods=["POST"])
def create_unavailable_slot(prof_id):
    Professional.query.get_or_404(prof_id)
    data = request.get_json(force=True)

    try:
        start_dt = datetime.fromisoformat(data.get("start_datetime"))
        end_dt = datetime.fromisoformat(data.get("end_datetime"))
    except (TypeError, ValueError):
        abort(400, description="Fechas invalidas. Usa formato ISO.")

    if end_dt <= start_dt:
        abort(400, description="La hora final debe ser posterior a la inicial.")

    slot = UnavailableSlot(
        professional_id=prof_id,
        start_datetime=start_dt,
        end_datetime=end_dt,
        reason=data.get("reason"),
    )
    db.session.add(slot)
    db.session.commit()
    return jsonify(slot.to_dict()), 201


@professionals_bp.route("/api/professionals/<int:prof_id>/unavailable/<int:slot_id>", methods=["DELETE"])
def delete_unavailable_slot(prof_id, slot_id):
    slot = UnavailableSlot.query.filter_by(id=slot_id, professional_id=prof_id).first_or_404()
    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Unavailable slot deleted."})
