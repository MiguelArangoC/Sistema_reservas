import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import Config
from models import db


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    # Extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from routes.services      import services_bp
    from routes.professionals import professionals_bp
    from routes.availability  import availability_bp
    from routes.appointments  import appointments_bp

    app.register_blueprint(services_bp)
    app.register_blueprint(professionals_bp)
    app.register_blueprint(availability_bp)
    app.register_blueprint(appointments_bp)

    # Serve uploaded design images
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Generic error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": str(e)}), 404

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({"error": str(e)}), 409

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    # Create DB tables (if they don't exist yet)
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config["DEBUG"], port=5000)
