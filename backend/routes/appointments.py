import os
from datetime import datetime
from flask import Blueprint, jsonify, request, abort, current_app
from werkzeug.utils import secure_filename
from models import db, Appointment, Professional, Service

appointments_bp = Blueprint("appointments", __name__)


def _allowed_file(filename: str) -> bool:
    allowed = current_app.config.get("ALLOWED_EXTENSIONS", {"jpg", "jpeg", "png", "webp"})
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed


@appointments_bp.route("/api/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json(force=True)

    required = ["professional_id", "service_id", "client_name", "client_phone", "appointment_datetime"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        abort(400, description=f"Missing fields: {', '.join(missing)}")

    if data["professional_id"] == 0:
        prof = Professional.query.filter_by(is_active=True).first()
        if not prof:
            abort(404, description="No professionals available.")
    else:
        prof = Professional.query.get(data["professional_id"])
        if not prof:
            abort(404, description="Professional not found.")

    # Validate service
    service = Service.query.get(data["service_id"])
    if not service:
        abort(404, description="Service not found.")

    # Parse datetime
    try:
        appt_dt = datetime.fromisoformat(data["appointment_datetime"])
    except ValueError:
        abort(400, description="Invalid appointment_datetime. Use ISO format.")

    # Check slot not already booked
    conflict = Appointment.query.filter_by(
        professional_id=prof.id,
        appointment_datetime=appt_dt,
    ).filter(Appointment.status.in_(["pending", "confirmed"])).first()
    if conflict:
        abort(409, description="This time slot is already booked.")

    appointment = Appointment(
        professional_id      = prof.id,
        service_id           = service.id,
        client_name          = data["client_name"],
        client_phone         = data["client_phone"],
        client_address       = data.get("client_address"),
        notes                = data.get("notes"),
        design_image_url     = data.get("design_image_url"),
        appointment_datetime = appt_dt,
        status               = "pending",
    )
    db.session.add(appointment)
    db.session.commit()

    return jsonify(appointment.to_dict()), 201


@appointments_bp.route("/api/appointments", methods=["GET"])
def list_appointments():
    professional_id = request.args.get("professional_id", type=int)
    include_done = request.args.get("include_done", "false").lower() == "true"

    query = Appointment.query
    if professional_id:
        query = query.filter_by(professional_id=professional_id)
    if not include_done:
        query = query.filter(Appointment.status.in_(["pending", "confirmed"]))

    appointments = query.order_by(Appointment.appointment_datetime.asc()).all()
    return jsonify([appt.to_dict() for appt in appointments])


@appointments_bp.route("/api/appointments/<int:appointment_id>", methods=["GET"])
def get_appointment(appointment_id: int):
    appt = Appointment.query.get_or_404(appointment_id)
    return jsonify(appt.to_dict())


@appointments_bp.route("/api/appointments/<int:appointment_id>/cancel", methods=["PATCH"])
def cancel_appointment(appointment_id: int):
    appt = Appointment.query.get_or_404(appointment_id)
    appt.status = "cancelled"
    db.session.commit()
    return jsonify(appt.to_dict())


@appointments_bp.route("/api/appointments/<int:appointment_id>/confirm", methods=["PATCH"])
def confirm_appointment(appointment_id: int):
    appt = Appointment.query.get_or_404(appointment_id)
    appt.status = "confirmed"
    db.session.commit()
    return jsonify(appt.to_dict())


@appointments_bp.route("/api/appointments/<int:appointment_id>/complete", methods=["PATCH"])
def complete_appointment(appointment_id: int):
    appt = Appointment.query.get_or_404(appointment_id)
    appt.status = "completed"
    db.session.commit()
    return jsonify(appt.to_dict())


@appointments_bp.route("/api/appointments/<int:appointment_id>", methods=["DELETE"])
def delete_appointment(appointment_id: int):
    appt = Appointment.query.get_or_404(appointment_id)
    db.session.delete(appt)
    db.session.commit()
    return jsonify({"message": "Appointment deleted."})


@appointments_bp.route("/api/upload", methods=["POST"])
def upload_image():
    if "file" not in request.files:
        abort(400, description="No file part in request.")
    file = request.files["file"]
    if file.filename == "":
        abort(400, description="No file selected.")
    if not _allowed_file(file.filename):
        abort(400, description="File type not allowed. Use JPG, PNG, or WEBP.")

    filename   = secure_filename(file.filename)
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)

    # Avoid overwriting — prefix with timestamp
    timestamp  = datetime.utcnow().strftime("%Y%m%d_%H%M%S_")
    saved_name = timestamp + filename
    file.save(os.path.join(upload_dir, saved_name))

    return jsonify({"url": f"/uploads/{saved_name}"}), 201
