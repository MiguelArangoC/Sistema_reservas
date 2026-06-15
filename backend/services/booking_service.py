from extensions import db
from models.booking import Booking
from datetime import datetime

class BookingService:
    @staticmethod
    def create_booking(user_id, service_type, booking_date_str):
        booking_date = datetime.fromisoformat(booking_date_str.replace('Z', '+00:00'))
        new_booking = Booking(user_id=user_id, service_type=service_type, booking_date=booking_date)
        db.session.add(new_booking)
        db.session.commit()
        return new_booking

    @staticmethod
    def get_all_bookings():
        return Booking.query.all()

    @staticmethod
    def get_bookings_by_user(user_id):
        return Booking.query.filter_by(user_id=user_id).all()
    
    @staticmethod
    def update_booking_status(booking_id, status):
        booking = Booking.query.get(booking_id)
        if booking:
            booking.status = status
            db.session.commit()
            return booking
        return None
