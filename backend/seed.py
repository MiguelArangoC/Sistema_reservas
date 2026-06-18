"""
seed.py — Populate the database with demo data for Lumina Studio.
Run:  python seed.py
"""

from datetime import date, datetime, time, timedelta
from app import create_app
from models import db, Appointment, Professional, Service, WorkingHours

# ── Unsplash image URLs (no API key needed, always available) ─────────────────
IMAGES = {
    "manicura":    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80",
    "hidratacion": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
    "corte":       "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
    "masaje":      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80",
    "facial":      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80",
    "piedras":     "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80",
    "maquillaje":  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
    "lifting":     "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&q=80",
    "elena":       "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80",
    "julian":      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
    "sofia":       "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
    "valentina":   "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
}


def _current_week_date(day_of_week: int) -> date:
    today = date.today()
    return today - timedelta(days=today.weekday()) + timedelta(days=day_of_week)


def _current_month_date(day: int) -> date:
    today = date.today()
    last_day = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return today.replace(day=min(day, last_day.day))


def _dt(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute))


def seed():
    app = create_app()
    with app.app_context():
        db.session.execute(db.text("DROP TABLE IF EXISTS blocked_slots CASCADE"))
        db.session.commit()
        db.drop_all()
        db.create_all()

        # Clear existing data (order matters due to FK constraints)
        db.session.execute(db.text("DELETE FROM appointments"))
        db.session.execute(db.text("DELETE FROM unavailable_slots"))
        db.session.execute(db.text("DELETE FROM working_hours"))
        db.session.execute(db.text("DELETE FROM professional_services"))
        db.session.execute(db.text("DELETE FROM professionals"))
        db.session.execute(db.text("DELETE FROM services"))
        db.session.commit()

        # ── Services ─────────────────────────────────────────────────────────
        services_data = [
            dict(name="Manicura Rusa",              category="Manicura & Pedicura",    price=45,  duration_minutes=60,  image_url=IMAGES["manicura"],    description="Técnica especializada de limpieza profunda de cutícula para un acabado impecable y duradero. Incluye esmaltado semipermanente."),
            dict(name="Hidratación Profunda",        category="Tratamientos Faciales",  price=65,  duration_minutes=45,  image_url=IMAGES["hidratacion"], description="Tratamiento revitalizante con ácido hialurónico y vitaminas para restaurar el brillo natural de tu piel."),
            dict(name="Corte & Estilo",              category="Peluquería",             price=80,  duration_minutes=90,  image_url=IMAGES["corte"],       description="Asesoría de imagen personalizada seguida de un corte de tendencia y peinado profesional para cualquier ocasión."),
            dict(name="Masaje Relajante",            category="Masajes & Spa",          price=70,  duration_minutes=60,  image_url=IMAGES["masaje"],      description="Liberación de tensión muscular profunda utilizando aceites esenciales orgánicos en un ambiente de total tranquilidad."),
            dict(name="Tratamiento Facial Premium",  category="Tratamientos Faciales",  price=95,  duration_minutes=75,  image_url=IMAGES["facial"],      description="Protocolo avanzado de rejuvenecimiento con radiofrecuencia, vitamina C y colágeno marino para una piel radiante."),
            dict(name="Masaje de Piedras Volcánicas",category="Masajes & Spa",          price=85,  duration_minutes=90,  image_url=IMAGES["piedras"],     description="Terapia de calor profundo con piedras volcánicas basálticas que fusiona relajación total y alivio muscular."),
            dict(name="Maquillaje de Novia",         category="Maquillaje",             price=120, duration_minutes=120, image_url=IMAGES["maquillaje"],  description="Look nupcial personalizado de larga duración. Incluye prueba previa y maquillaje resistente al agua."),
            dict(name="Lifting de Pestañas",         category="Tratamientos Faciales",  price=55,  duration_minutes=60,  image_url=IMAGES["lifting"],     description="Curvado y tinte permanente de pestañas naturales para una mirada abierta e intensa durante 6-8 semanas.", is_home_service=False),
        ]

        services = []
        for s in services_data:
            svc = Service(**s)
            db.session.add(svc)
            services.append(svc)
        db.session.flush()  # get IDs

        # ── Professionals ─────────────────────────────────────────────────────
        elena = Professional(
            name="Elena Martínez",
            photo_url=IMAGES["elena"],
            title="Especialista en Skincare",
            username="elena",
            bio="Experta en tratamientos faciales con más de 8 años de experiencia. Especializada en tecnología avanzada y manejo de pieles sensibles.",
            rating=4.9,
            reviews=120,
        )
        julian = Professional(
            name="Julian Rivera",
            photo_url=IMAGES["julian"],
            title="Maestro de Masajes",
            username="julian",
            bio="Terapeuta certificado en masajes terapéuticos y relajantes. Su técnica combina métodos orientales y occidentales para el máximo bienestar.",
            rating=4.8,
            reviews=85,
        )
        sofia = Professional(
            name="Sofia Cavero",
            photo_url=IMAGES["sofia"],
            title="Makeup Artist & Hair Stylist",
            username="sofia",
            bio="Artista del maquillaje y estilismo capilar premiada internacionalmente. Su pasión es resaltar la belleza única de cada cliente.",
            rating=4.9,
            reviews=97,
        )
        valentina = Professional(
            name="Valentina Cruz",
            photo_url=IMAGES["valentina"],
            title="Nail Artist",
            username="valentina",
            bio="Profesional temporal desactivada para demostrar el estado inactivo en el panel de administración.",
            rating=4.6,
            reviews=32,
            is_active=False,
        )

        for prof, password in [
            (elena, "elena123"),
            (julian, "julian123"),
            (sofia, "sofia123"),
            (valentina, "valentina123"),
        ]:
            prof.set_password(password)
            db.session.add(prof)
        db.session.flush()

        # ── Professional ↔ Service assignments ──────────────────────────────
        # Map by index: services[0]=Manicura, [1]=Hidratacion, [2]=Corte, [3]=Masaje,
        #               [4]=FacialPremium, [5]=Piedras, [6]=Maquillaje, [7]=Lifting
        elena.services  = [services[1], services[4], services[7]]          # Facials, Lifting
        julian.services = [services[3], services[5]]                        # Masajes
        sofia.services  = [services[0], services[2], services[6]]           # Manicura, Corte, Maquillaje
        valentina.services = [services[0]]

        # All professionals can do any service as backup
        for s in services:
            if elena not in s.professionals:
                pass  # strict assignment above

        db.session.flush()

        # ── Working hours ─────────────────────────────────────────────────────
        # Mon-Fri 09:00-20:00, Sat 10:00-18:00 for Elena & Sofia
        # Mon-Sat 10:00-19:00 for Julian
        for prof in [elena, sofia]:
            for day in range(5):  # Mon-Fri
                db.session.add(WorkingHours(professional_id=prof.id, day_of_week=day, start_time=time(9, 0),  end_time=time(20, 0)))
            db.session.add(WorkingHours(professional_id=prof.id, day_of_week=5, start_time=time(10, 0), end_time=time(18, 0)))  # Sat

        for day in range(6):  # Mon-Sat
            db.session.add(WorkingHours(professional_id=julian.id, day_of_week=day, start_time=time(10, 0), end_time=time(19, 0)))

        # ── Admin dashboard appointments ─────────────────────────────────────
        # Relative dates keep HU-15/HU-16/HU-17/HU-20 useful whenever the seed runs.
        today = date.today()
        week_days = [_current_week_date(i) for i in range(6)]
        month_days = [_current_month_date(day) for day in (3, 9, 16, 23)]

        appointments_data = [
            # Today: every status bucket for the appointment admin view.
            dict(professional=elena, service=services[4], client_name="Laura Gómez", client_phone="+573001112233", appointment_datetime=_dt(today, 9, 0), status="pending", notes="Primera valoración de piel sensible."),
            dict(professional=julian, service=services[3], client_name="Andrés Pardo", client_phone="+573004445566", appointment_datetime=_dt(today, 10, 30), status="confirmed", notes="Prefiere masaje con presión media."),
            dict(professional=sofia, service=services[0], client_name="Camila Reyes", client_phone="+573007778899", appointment_datetime=_dt(today, 12, 0), status="completed", notes="Diseño francés minimalista."),
            dict(professional=elena, service=services[7], client_name="Natalia Rojas", client_phone="+573009991122", appointment_datetime=_dt(today, 15, 30), status="cancelled", notes="Canceló por viaje."),
            dict(professional=sofia, service=services[6], client_name="Mariana Silva", client_phone="+573002223344", appointment_datetime=_dt(today, 17, 0), status="confirmed", notes="Prueba de maquillaje para boda."),

            # Current week: feeds week filters, revenue and busy-professional ranking.
            dict(professional=elena, service=services[1], client_name="Paula Torres", client_phone="+573003334455", appointment_datetime=_dt(week_days[0], 11, 0), status="completed"),
            dict(professional=julian, service=services[5], client_name="Ricardo Mejía", client_phone="+573005556677", appointment_datetime=_dt(week_days[1], 16, 0), status="confirmed"),
            dict(professional=sofia, service=services[2], client_name="Daniela León", client_phone="+573006667788", appointment_datetime=_dt(week_days[3], 14, 0), status="pending"),
            dict(professional=elena, service=services[4], client_name="Verónica Castro", client_phone="+573008889900", appointment_datetime=_dt(week_days[4], 9, 30), status="completed"),
            dict(professional=julian, service=services[3], client_name="Mateo Vargas", client_phone="+573001234567", appointment_datetime=_dt(week_days[5], 13, 0), status="cancelled"),

            # Current month: gives the monthly revenue chart multiple bars.
            dict(professional=sofia, service=services[6], client_name="Isabella Mora", client_phone="+573009876543", appointment_datetime=_dt(month_days[0], 10, 0), status="completed"),
            dict(professional=elena, service=services[4], client_name="Luisa Fernanda", client_phone="+573004321098", appointment_datetime=_dt(month_days[1], 11, 30), status="confirmed"),
            dict(professional=julian, service=services[5], client_name="Santiago Ríos", client_phone="+573002468135", appointment_datetime=_dt(month_days[2], 15, 0), status="completed"),
            dict(professional=sofia, service=services[0], client_name="Alejandra Nieto", client_phone="+573001357924", appointment_datetime=_dt(month_days[3], 16, 30), status="pending"),
        ]

        for item in appointments_data:
            db.session.add(Appointment(
                professional_id=item["professional"].id,
                service_id=item["service"].id,
                client_name=item["client_name"],
                client_phone=item["client_phone"],
                notes=item.get("notes"),
                appointment_datetime=item["appointment_datetime"],
                status=item["status"],
            ))

        db.session.commit()
        print("Database seeded successfully!")
        print(f"   - {len(services)} services")
        print("   - 4 professionals (3 active, 1 inactive)")
        print("   - Working hours configured")
        print(f"   - {len(appointments_data)} admin demo appointments")


if __name__ == "__main__":
    seed()
