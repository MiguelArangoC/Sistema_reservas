from datetime import datetime, date, time, timedelta
from flask import Blueprint, jsonify, request, abort
from models import db, Professional, WorkingHours, Appointment, Service

availability_bp = Blueprint("availability", __name__)

SLOT_DURATION = 45  # minutes between slots


def _generate_slots(start: time, end: time, duration_minutes: int):
    """Return list of time strings (HH:MM) for every slot from start to end."""
    slots = []
    current = datetime.combine(date.today(), start)
    finish  = datetime.combine(date.today(), end)
    while current + timedelta(minutes=duration_minutes) <= finish:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=SLOT_DURATION)
    return slots


@availability_bp.route("/api/availability/<int:professional_id>/<string:date_str>", methods=["GET"])
def get_availability(professional_id: int, date_str: str):
    """
    Returns available time slots for a professional on a given date.
    date_str format: YYYY-MM-DD
    Optional query param: service_id (to use the service's duration)
    """
    # Parse date
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        abort(400, description="Invalid date format. Use YYYY-MM-DD.")

    if target_date < date.today():
        return jsonify([])

    # Get professional
    professional = Professional.query.get_or_404(professional_id)

    # Day of week: Monday=0 … Sunday=6
    day_of_week = target_date.weekday()

    # Working hours for that day
    wh = WorkingHours.query.filter_by(
        professional_id=professional_id,
        day_of_week=day_of_week
    ).first()

    if not wh:
        return jsonify([])  # Professional doesn't work that day

    # Slot duration from service (if provided)
    service_id = request.args.get("service_id", type=int)
    duration = SLOT_DURATION
    if service_id:
        service = Service.query.get(service_id)
        if service:
            duration = service.duration_minutes

    # All possible slots
    all_slots = _generate_slots(wh.start_time, wh.end_time, duration)

    # Booked slots for that day
    start_of_day = datetime.combine(target_date, time(0, 0))
    end_of_day   = datetime.combine(target_date, time(23, 59))
    booked = Appointment.query.filter(
        Appointment.professional_id == professional_id,
        Appointment.appointment_datetime >= start_of_day,
        Appointment.appointment_datetime <= end_of_day,
        Appointment.status != "cancelled",
    ).all()

    booked_times = {a.appointment_datetime.strftime("%H:%M") for a in booked}

    # Filter out booked slots and past slots (for today)
    now = datetime.now().time() if target_date == date.today() else None

    available = []
    for slot in all_slots:
        if slot in booked_times:
            continue
        if now:
            slot_time = datetime.strptime(slot, "%H:%M").time()
            if slot_time <= now:
                continue
        available.append(slot)

    return jsonify(available)
