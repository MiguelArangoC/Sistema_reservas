from flask import Blueprint, request, jsonify
from services.booking_service import BookingService
from models.booking import bookings_schema, booking_schema

booking_bp = Blueprint('booking_bp', __name__)

@booking_bp.route('/', methods=['POST'])
def create_booking():
    data = request.get_json()
    try:
        new_booking = BookingService.create_booking(
            user_id=data['user_id'],
            service_type=data['service_type'],
            booking_date_str=data['booking_date']
        )
        return jsonify(booking_schema.dump(new_booking)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@booking_bp.route('/', methods=['GET'])
def get_bookings():
    bookings = BookingService.get_all_bookings()
    return jsonify(bookings_schema.dump(bookings)), 200

@booking_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_bookings(user_id):
    bookings = BookingService.get_bookings_by_user(user_id)
    return jsonify(bookings_schema.dump(bookings)), 200

@booking_bp.route('/<int:booking_id>/status', methods=['PUT'])
def update_status(booking_id):
    data = request.get_json()
    status = data.get('status')
    updated_booking = BookingService.update_booking_status(booking_id, status)
    if updated_booking:
        return jsonify(booking_schema.dump(updated_booking)), 200
    return jsonify({"error": "Booking not found"}), 404
