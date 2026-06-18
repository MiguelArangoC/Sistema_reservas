"""
routes/admin.py — Admin API endpoints for Lumina Studio
Covers HU-15 to HU-20

Endpoints:
  POST  /api/admin/login                       — Admin authentication
  GET   /api/admin/appointments?filter=day|week|month  — HU-15
  GET   /api/admin/revenue?filter=day|week|month       — HU-16
  GET   /api/admin/professionals/busy?date=YYYY-MM-DD  — HU-17
  GET   /api/admin/professionals                        — HU-18 list
  DELETE /api/admin/professionals/<id>                  — HU-18 delete
  POST  /api/admin/professionals                        — HU-19 add
  POST  /api/admin/notifications/send                   — HU-20 WhatsApp
"""

import os
from datetime import datetime, date, timedelta
from flask import Blueprint, jsonify, request, abort
from models import db, Appointment, Professional, Service, WorkingHours

admin_bp = Blueprint("admin", __name__)

# ── Simple token-based admin auth ─────────────────────────────────────────────
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN    = os.getenv("ADMIN_TOKEN",    "lumina-admin-secret-2025")

WHATSAPP_API_URL    = os.getenv("WHATSAPP_API_URL", "")   # e.g. CallMeBot or Twilio
WHATSAPP_API_KEY    = os.getenv("WHATSAPP_API_KEY", "")


def _require_admin():
    """Check Authorization header for the admin token."""
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if token != ADMIN_TOKEN:
        abort(401, description="Acceso de administrador requerido.")


def _date_range(filter_str: str):
    """Return (start_dt, end_dt) based on 'day', 'week', or 'month'."""
    today = date.today()
    if filter_str == "week":
        start = today - timedelta(days=today.weekday())          # Monday
        end   = start + timedelta(days=6)
    elif filter_str == "month":
        start = today.replace(day=1)
        next_month = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
    else:  # day (default)
        start = end = today

    return (
        datetime.combine(start, datetime.min.time()),
        datetime.combine(end,   datetime.max.time()),
    )


# ── HU-15 & HU-16 helpers ─────────────────────────────────────────────────────
def _query_appointments(filter_str: str):
    start_dt, end_dt = _date_range(filter_str)
    return Appointment.query.filter(
        Appointment.appointment_datetime >= start_dt,
        Appointment.appointment_datetime <= end_dt,
    ).all()


# ══════════════════════════════════════════════════════════════════════════════
#  Auth
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({"token": ADMIN_TOKEN, "role": "admin"})

    abort(401, description="Credenciales de administrador incorrectas.")


# ══════════════════════════════════════════════════════════════════════════════
#  HU-15 — Citas Admin
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/appointments", methods=["GET"])
def admin_appointments():
    _require_admin()
    filter_str = request.args.get("filter", "day")

    appointments = _query_appointments(filter_str)

    # Group by status
    result = {
        "filter":    filter_str,
        "total":     len(appointments),
        "reserved":  [],
        "confirmed": [],
        "completed": [],
        "cancelled": [],
    }

    status_map = {
        "pending":   "reserved",
        "confirmed": "confirmed",
        "completed": "completed",
        "cancelled": "cancelled",
    }

    for appt in appointments:
        bucket = status_map.get(appt.status, "reserved")
        result[bucket].append(appt.to_dict())

    result["counts"] = {
        "reserved":  len(result["reserved"]),
        "confirmed": len(result["confirmed"]),
        "completed": len(result["completed"]),
        "cancelled": len(result["cancelled"]),
    }

    return jsonify(result)


# ══════════════════════════════════════════════════════════════════════════════
#  HU-16 — Ingresos Negocio
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/revenue", methods=["GET"])
def admin_revenue():
    _require_admin()
    filter_str = request.args.get("filter", "day")

    appointments = _query_appointments(filter_str)

    # Only completed/confirmed appointments count as revenue
    revenue_appts = [a for a in appointments if a.status in ("completed", "confirmed")]
    total = sum(float(a.service.price) for a in revenue_appts if a.service)

    # Breakdown by service category
    by_category = {}
    for appt in revenue_appts:
        if appt.service:
            cat   = appt.service.category or "Sin categoría"
            price = float(appt.service.price)
            by_category[cat] = by_category.get(cat, 0) + price

    # Daily breakdown for chart (only relevant for week/month)
    daily = {}
    for appt in revenue_appts:
        day_key = appt.appointment_datetime.strftime("%Y-%m-%d")
        if appt.service:
            daily[day_key] = daily.get(day_key, 0) + float(appt.service.price)

    return jsonify({
        "filter":       filter_str,
        "total":        round(total, 2),
        "appointments": len(revenue_appts),
        "by_category":  by_category,
        "daily":        daily,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  HU-17 — Profesionales Ocupados
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/professionals/busy", methods=["GET"])
def admin_busy_professionals():
    _require_admin()
    date_str = request.args.get("date", date.today().isoformat())

    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        abort(400, description="Formato de fecha inválido. Usa YYYY-MM-DD.")

    start_dt = datetime.combine(target, datetime.min.time())
    end_dt   = datetime.combine(target, datetime.max.time())

    appointments = Appointment.query.filter(
        Appointment.appointment_datetime >= start_dt,
        Appointment.appointment_datetime <= end_dt,
        Appointment.status.in_(["pending", "confirmed"]),
    ).all()

    # Count per professional
    prof_counts: dict[int, dict] = {}
    for appt in appointments:
        pid = appt.professional_id
        if pid not in prof_counts:
            prof_counts[pid] = {
                "professional": appt.professional.to_dict() if appt.professional else {},
                "appointments": 0,
                "appointment_list": [],
            }
        prof_counts[pid]["appointments"] += 1
        prof_counts[pid]["appointment_list"].append({
            "id":       appt.id,
            "time":     appt.appointment_datetime.strftime("%H:%M"),
            "service":  appt.service.name if appt.service else "",
            "client":   appt.client_name,
            "status":   appt.status,
        })

    sorted_result = sorted(
        prof_counts.values(),
        key=lambda x: x["appointments"],
        reverse=True,
    )

    return jsonify({
        "date":          date_str,
        "professionals": sorted_result,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  HU-18 — Listar y Eliminar Profesionales
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/professionals", methods=["GET"])
def admin_list_professionals():
    _require_admin()
    profs = Professional.query.order_by(Professional.name).all()
    result = []
    for p in profs:
        d = p.to_dict()
        d["username"]   = p.username
        d["is_active"]  = p.is_active
        d["created_at"] = p.created_at.isoformat() if p.created_at else None
        result.append(d)
    return jsonify(result)


@admin_bp.route("/api/admin/professionals/<int:prof_id>", methods=["DELETE"])
def admin_delete_professional(prof_id: int):
    _require_admin()
    prof = Professional.query.get_or_404(prof_id)

    # Soft-delete: mark inactive instead of hard delete to preserve appointment history
    prof.is_active = False
    db.session.commit()
    return jsonify({"message": f"Profesional '{prof.name}' eliminado correctamente."})


# ══════════════════════════════════════════════════════════════════════════════
#  HU-19 — Añadir Profesionales
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/professionals", methods=["POST"])
def admin_add_professional():
    _require_admin()
    data = request.get_json(force=True)

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    name     = (data.get("name")     or username).strip()

    if not username or not password:
        abort(400, description="Usuario y contraseña son obligatorios.")

    if Professional.query.filter_by(username=username).first():
        abort(409, description=f"El usuario '{username}' ya existe.")

    prof = Professional(
        name      = name or username,
        username  = username,
        title     = data.get("title", "Profesional"),
        bio       = data.get("bio", ""),
        photo_url = data.get("photo_url", ""),
        is_active = True,
    )
    prof.set_password(password)
    db.session.add(prof)
    db.session.commit()

    return jsonify(prof.to_dict()), 201


# ══════════════════════════════════════════════════════════════════════════════
#  HU-20 — Notificaciones WhatsApp
# ══════════════════════════════════════════════════════════════════════════════
@admin_bp.route("/api/admin/notifications/send", methods=["POST"])
def send_whatsapp_notifications():
    """
    Send WhatsApp reminders for today's appointments.
    Uses CallMeBot API (free, no extra SDK needed).
    Configure WHATSAPP_API_URL and WHATSAPP_API_KEY in .env.

    POST body: { "date": "YYYY-MM-DD" }  (optional, defaults to today)
    """
    _require_admin()
    import urllib.request
    import urllib.parse

    data = request.get_json(force=True) or {}
    date_str = data.get("date", date.today().isoformat())

    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        abort(400, description="Formato de fecha inválido.")

    start_dt = datetime.combine(target, datetime.min.time())
    end_dt   = datetime.combine(target, datetime.max.time())

    appointments = Appointment.query.filter(
        Appointment.appointment_datetime >= start_dt,
        Appointment.appointment_datetime <= end_dt,
        Appointment.status.in_(["pending", "confirmed"]),
    ).all()

    sent     = []
    errors   = []
    simulated = not bool(WHATSAPP_API_URL and WHATSAPP_API_KEY)

    def _send(phone: str, message: str, label: str):
        if simulated:
            sent.append({"to": label, "phone": phone, "message": message, "simulated": True})
            return

        # CallMeBot format: https://api.callmebot.com/whatsapp.php?phone=+34XXX&text=MSG&apikey=KEY
        clean_phone = "+" + phone.replace("+", "").replace(" ", "").replace("-", "")
        encoded_msg = urllib.parse.quote(message)
        url = f"{WHATSAPP_API_URL}?phone={clean_phone}&text={encoded_msg}&apikey={WHATSAPP_API_KEY}"
        try:
            with urllib.request.urlopen(url, timeout=8) as resp:
                sent.append({"to": label, "phone": phone, "status": resp.status})
        except Exception as e:
            errors.append({"to": label, "phone": phone, "error": str(e)})

    for appt in appointments:
        dt    = appt.appointment_datetime
        svc   = appt.service.name if appt.service else "tu servicio"
        prof  = appt.professional.name if appt.professional else "tu profesional"
        time_str = dt.strftime("%H:%M")
        date_fmt = dt.strftime("%d/%m/%Y")

        # ── Message to client ──────────────────────────────────────────────
        client_msg = (
            f"🌸 *Lumina Studio* — Recordatorio de cita\n\n"
            f"Hola {appt.client_name}, te recordamos que tienes una cita:\n"
            f"📋 Servicio: *{svc}*\n"
            f"👩‍💼 Profesional: {prof}\n"
            f"📅 Fecha: {date_fmt} a las {time_str}\n\n"
            f"¡Te esperamos! Si necesitas cancelar, contáctanos con anticipación."
        )
        if appt.client_phone:
            _send(appt.client_phone, client_msg, f"cliente:{appt.client_name}")

        # ── Message to professional ────────────────────────────────────────
        if appt.professional and appt.professional.username:
            prof_msg = (
                f"📅 *Lumina Studio* — Agenda del día {date_fmt}\n\n"
                f"Hola {prof}, tienes una cita:\n"
                f"👤 Cliente: *{appt.client_name}*\n"
                f"💆 Servicio: {svc}\n"
                f"🕐 Hora: {time_str}\n\n"
                f"¡Prepárate para dar lo mejor! 💫"
            )
            # Professional phone not stored in current model;
            # log as pending for manual send or future model extension
            sent.append({
                "to":      f"profesional:{prof}",
                "message": prof_msg,
                "note":    "El modelo actual no almacena teléfono del profesional. "
                           "Añade el campo 'phone' al modelo Professional para enviar automáticamente.",
                "simulated": True,
            })

    return jsonify({
        "date":      date_str,
        "processed": len(appointments),
        "sent":      sent,
        "errors":    errors,
        "simulated": simulated,
        "note": (
            "Modo simulado activo. Configura WHATSAPP_API_URL y WHATSAPP_API_KEY en .env "
            "para enviar mensajes reales vía CallMeBot."
        ) if simulated else "Mensajes enviados vía WhatsApp API.",
    })