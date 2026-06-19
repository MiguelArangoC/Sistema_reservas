import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    print("PGUSER:", repr(os.getenv("PGUSER")))
    print("PGHOST:", repr(os.getenv("PGHOST")))
    print("PGPORT:", repr(os.getenv("PGPORT")))
    print("PGDATABASE:", repr(os.getenv("PGDATABASE")))
    print("DATABASE_URL:", repr(os.getenv("DATABASE_URL")))
    # Support both individual PG* environment variables and a single DATABASE_URL
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT", "5432")
    pg_database = os.getenv("PGDATABASE")

    if pg_user and pg_password and pg_host and pg_database:
        # Render external DB connection requires SSL
        ssl_mode = "?sslmode=require" if "render.com" in pg_host else ""
        raw_db_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}{ssl_mode}"
    else:
        raw_db_url = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:password@localhost:5432/lumina_studio",
        )
        if raw_db_url and raw_db_url.startswith("postgres://"):
            raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 5 * 1024 * 1024))  # 5 MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
