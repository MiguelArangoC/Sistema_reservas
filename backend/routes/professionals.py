from flask import Blueprint, jsonify, request
from models import Professional

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
