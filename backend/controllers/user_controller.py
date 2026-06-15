from flask import Blueprint, request, jsonify
from services.user_service import UserService
from models.user import users_schema, user_schema

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/', methods=['POST'])
def create_user():
    data = request.get_json()
    try:
        new_user = UserService.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password']
        )
        return jsonify(user_schema.dump(new_user)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@user_bp.route('/', methods=['GET'])
def get_users():
    users = UserService.get_all_users()
    return jsonify(users_schema.dump(users)), 200

@user_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = UserService.get_user_by_id(user_id)
    if user:
        return jsonify(user_schema.dump(user)), 200
    return jsonify({"error": "User not found"}), 404
