from flask import Blueprint, jsonify
from models import Service

services_bp = Blueprint("services", __name__)


@services_bp.route("/api/services", methods=["GET"])
def get_services():
    services = Service.query.filter_by(is_active=True).order_by(Service.category, Service.name).all()
    return jsonify([s.to_dict() for s in services])


@services_bp.route("/api/services/<int:service_id>", methods=["GET"])
def get_service(service_id):
    service = Service.query.get_or_404(service_id)
    return jsonify(service.to_dict())


@services_bp.route("/api/services/categories", methods=["GET"])
def get_categories():
    categories = (
        Service.query
        .with_entities(Service.category)
        .filter_by(is_active=True)
        .distinct()
        .order_by(Service.category)
        .all()
    )
    return jsonify([c[0] for c in categories if c[0]])
