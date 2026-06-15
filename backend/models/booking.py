from extensions import db, ma
from datetime import datetime

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    service_type = db.Column(db.String(100), nullable=False)
    booking_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BookingSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Booking
        load_instance = True
        include_fk = True

booking_schema = BookingSchema()
bookings_schema = BookingSchema(many=True)
