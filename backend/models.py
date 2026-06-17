from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# ── Association table: professionals ↔ services ──────────────────────────────
professional_services = db.Table(
    "professional_services",
    db.Column("professional_id", db.Integer, db.ForeignKey("professionals.id"), primary_key=True),
    db.Column("service_id",      db.Integer, db.ForeignKey("services.id"),      primary_key=True),
)


class Professional(db.Model):
    __tablename__ = "professionals"

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(120), nullable=False)
    photo_url   = db.Column(db.String(512))
    bio         = db.Column(db.Text)
    title       = db.Column(db.String(120))   # e.g. "Especialista en Skincare"
    username    = db.Column(db.String(80), unique=True)
    password_hash = db.Column(db.String(255))
    rating      = db.Column(db.Float, default=5.0)
    reviews     = db.Column(db.Integer, default=0)
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    services       = db.relationship("Service", secondary=professional_services, back_populates="professionals")
    working_hours  = db.relationship("WorkingHours", back_populates="professional", cascade="all, delete-orphan")
    unavailable_slots = db.relationship("UnavailableSlot", back_populates="professional", cascade="all, delete-orphan")
    appointments   = db.relationship("Appointment", back_populates="professional")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return bool(self.password_hash and check_password_hash(self.password_hash, password))

    def to_dict(self):
        return {
            "id":         self.id,
            "name":       self.name,
            "photo_url":  self.photo_url,
            "bio":        self.bio,
            "title":      self.title,
            "username":   self.username,
            "rating":     self.rating,
            "reviews":    self.reviews,
            "services":   [s.id for s in self.services],
        }


class Service(db.Model):
    __tablename__ = "services"

    id                = db.Column(db.Integer, primary_key=True)
    name              = db.Column(db.String(120), nullable=False)
    description       = db.Column(db.Text)
    price             = db.Column(db.Numeric(10, 2), nullable=False)
    duration_minutes  = db.Column(db.Integer, nullable=False, default=60)
    category          = db.Column(db.String(80))
    image_url         = db.Column(db.String(512))
    is_home_service   = db.Column(db.Boolean, default=False)
    is_active         = db.Column(db.Boolean, default=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)

    professionals = db.relationship("Professional", secondary=professional_services, back_populates="services")
    appointments  = db.relationship("Appointment", back_populates="service")

    def to_dict(self):
        return {
            "id":               self.id,
            "name":             self.name,
            "description":      self.description,
            "price":            float(self.price),
            "duration_minutes": self.duration_minutes,
            "category":         self.category,
            "image_url":        self.image_url,
            "is_home_service":  self.is_home_service,
        }


class WorkingHours(db.Model):
    __tablename__ = "working_hours"

    id               = db.Column(db.Integer, primary_key=True)
    professional_id  = db.Column(db.Integer, db.ForeignKey("professionals.id"), nullable=False)
    day_of_week      = db.Column(db.Integer, nullable=False)  # 0=Mon … 6=Sun
    start_time       = db.Column(db.Time, nullable=False)
    end_time         = db.Column(db.Time, nullable=False)

    professional = db.relationship("Professional", back_populates="working_hours")

    def to_dict(self):
        return {
            "day_of_week": self.day_of_week,
            "start_time":  self.start_time.strftime("%H:%M"),
            "end_time":    self.end_time.strftime("%H:%M"),
        }


class UnavailableSlot(db.Model):
    __tablename__ = "unavailable_slots"

    id = db.Column(db.Integer, primary_key=True)
    professional_id = db.Column(db.Integer, db.ForeignKey("professionals.id"), nullable=False)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    professional = db.relationship("Professional", back_populates="unavailable_slots")

    def to_dict(self):
        return {
            "id": self.id,
            "professional_id": self.professional_id,
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "reason": self.reason,
            "created_at": self.created_at.isoformat(),
        }


class Appointment(db.Model):
    __tablename__ = "appointments"

    id                    = db.Column(db.Integer, primary_key=True)
    professional_id       = db.Column(db.Integer, db.ForeignKey("professionals.id"), nullable=False)
    service_id            = db.Column(db.Integer, db.ForeignKey("services.id"),      nullable=False)
    client_name           = db.Column(db.String(120), nullable=False)
    client_phone          = db.Column(db.String(30),  nullable=False)
    client_address        = db.Column(db.String(255))          # nullable — home service only
    notes                 = db.Column(db.Text)                 # nullable
    design_image_url      = db.Column(db.String(512))          # nullable
    appointment_datetime  = db.Column(db.DateTime, nullable=False)
    status                = db.Column(db.String(20), default="pending")  # pending | confirmed | completed | cancelled
    created_at            = db.Column(db.DateTime, default=datetime.utcnow)

    professional = db.relationship("Professional", back_populates="appointments")
    service      = db.relationship("Service",      back_populates="appointments")

    def to_dict(self):
        return {
            "id":                   self.id,
            "professional":         self.professional.to_dict() if self.professional else None,
            "service":              self.service.to_dict()      if self.service      else None,
            "client_name":          self.client_name,
            "client_phone":         self.client_phone,
            "client_address":       self.client_address,
            "notes":                self.notes,
            "design_image_url":     self.design_image_url,
            "appointment_datetime": self.appointment_datetime.isoformat(),
            "status":               self.status,
            "created_at":           self.created_at.isoformat(),
        }
