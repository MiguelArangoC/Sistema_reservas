from flask import Blueprint

routes_bp = Blueprint("routes", __name__)

from .services       import services_bp        # noqa: F401
from .professionals  import professionals_bp    # noqa: F401
from .availability   import availability_bp     # noqa: F401
from .appointments   import appointments_bp     # noqa: F401
