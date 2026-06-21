import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


def env_value(name, default=None):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value


class Config:
    SECRET_KEY = env_value("SECRET_KEY", "dev-secret-key-change-me")

    # Support both individual PG* environment variables and a single DATABASE_URL
    pg_user = env_value("PGUSER")
    pg_password = env_value("PGPASSWORD")
    pg_host = env_value("PGHOST")
    pg_port = env_value("PGPORT", "5432")
    pg_database = env_value("PGDATABASE")

    if pg_user and pg_password and pg_host and pg_database:
        # Render external DB connection requires SSL
        ssl_mode = "?sslmode=require" if "render.com" in pg_host else ""
        raw_db_url = (
            f"postgresql://{quote_plus(pg_user)}:{quote_plus(pg_password)}"
            f"@{pg_host}:{pg_port}/{pg_database}{ssl_mode}"
        )
    else:
        raw_db_url = env_value(
            "DATABASE_URL",
            "postgresql://postgres:password@localhost:5432/lumina_studio",
        )

    if raw_db_url and raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    MAX_CONTENT_LENGTH = int(env_value("MAX_CONTENT_LENGTH", 5 * 1024 * 1024))  # 5 MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    DEBUG = env_value("DEBUG", "True").lower() == "true"
