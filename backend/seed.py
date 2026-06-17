"""
seed.py — Populate the database with demo data for Lumina Studio.
Run:  python seed.py
"""

from datetime import time
from app import create_app
from models import db, Professional, Service, WorkingHours

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
}


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

        for prof, password in [(elena, "elena123"), (julian, "julian123"), (sofia, "sofia123")]:
            prof.set_password(password)
            db.session.add(prof)
        db.session.flush()

        # ── Professional ↔ Service assignments ──────────────────────────────
        # Map by index: services[0]=Manicura, [1]=Hidratacion, [2]=Corte, [3]=Masaje,
        #               [4]=FacialPremium, [5]=Piedras, [6]=Maquillaje, [7]=Lifting
        elena.services  = [services[1], services[4], services[7]]          # Facials, Lifting
        julian.services = [services[3], services[5]]                        # Masajes
        sofia.services  = [services[0], services[2], services[6]]           # Manicura, Corte, Maquillaje

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

        db.session.commit()
        print("Database seeded successfully!")
        print(f"   - {len(services)} services")
        print("   - 3 professionals (Elena, Julian, Sofia)")
        print("   - Working hours configured")


if __name__ == "__main__":
    seed()
