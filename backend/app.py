from flask import Flask
from config import Config
from extensions import db, ma, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    cors.init_app(app)

    # Register blueprints (controllers)
    from controllers.booking_controller import booking_bp
    from controllers.user_controller import user_bp

    app.register_blueprint(booking_bp, url_prefix='/api/bookings')
    app.register_blueprint(user_bp, url_prefix='/api/users')

    @app.route('/')
    def index():
        return {"message": "Welcome to Sistema Reservas API"}

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # Create database tables if they don't exist
        db.create_all()
    app.run(debug=True, port=5000)
