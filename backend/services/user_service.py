from extensions import db
from models.user import User
import hashlib

class UserService:
    @staticmethod
    def create_user(username, email, password):
        # Basic hashing for demonstration
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        new_user = User(username=username, email=email, password_hash=password_hash)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def get_all_users():
        return User.query.all()

    @staticmethod
    def get_user_by_id(user_id):
        return User.query.get(user_id)
