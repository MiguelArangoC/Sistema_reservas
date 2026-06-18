import io
import os
import sys
import tempfile
import unittest
from datetime import date, datetime, time, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEBUG"] = "False"
for pg_key in ("PGUSER", "PGPASSWORD", "PGHOST", "PGPORT", "PGDATABASE"):
    os.environ[pg_key] = ""

from app import create_app  # noqa: E402
from models import Appointment, Professional, Service, WorkingHours, db  # noqa: E402


def next_weekday(day_of_week):
    today = date.today()
    days_ahead = (day_of_week - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


class ReservationAppTestCase(unittest.TestCase):
    def setUp(self):
        self.uploads_dir = tempfile.TemporaryDirectory()
        self.app = create_app()
        self.app.config.update(
            TESTING=True,
            UPLOAD_FOLDER=self.uploads_dir.name,
            MAX_CONTENT_LENGTH=5 * 1024 * 1024,
        )
        self.client = self.app.test_client()

        with self.app.app_context():
            db.drop_all()
            db.create_all()
            self._seed_data()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.uploads_dir.cleanup()

    def _seed_data(self):
        manicure = Service(
            name="Manicure",
            description="Manicure spa",
            price=50000,
            duration_minutes=60,
            category="Uñas",
            is_active=True,
        )
        inactive_service = Service(
            name="Servicio oculto",
            description="No debe listarse",
            price=10000,
            duration_minutes=30,
            category="Oculto",
            is_active=False,
        )
        haircut = Service(
            name="Corte",
            description="Corte de cabello",
            price=40000,
            duration_minutes=45,
            category="Cabello",
            is_active=True,
        )

        ana = Professional(
            name="Ana",
            title="Estilista",
            rating=4.9,
            reviews=12,
            is_active=True,
            services=[manicure, haircut],
        )
        bea = Professional(
            name="Bea",
            title="Manicurista",
            rating=4.8,
            reviews=8,
            is_active=True,
            services=[manicure],
        )
        inactive_professional = Professional(
            name="Carla",
            title="Inactiva",
            is_active=False,
            services=[manicure],
        )

        db.session.add_all(
            [
                manicure,
                inactive_service,
                haircut,
                ana,
                bea,
                inactive_professional,
            ]
        )
        db.session.flush()

        monday = 0
        db.session.add_all(
            [
                WorkingHours(
                    professional_id=ana.id,
                    day_of_week=monday,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                ),
                WorkingHours(
                    professional_id=bea.id,
                    day_of_week=monday,
                    start_time=time(10, 0),
                    end_time=time(12, 0),
                ),
            ]
        )

        monday_date = next_weekday(monday)
        db.session.add_all(
            [
                Appointment(
                    professional_id=ana.id,
                    service_id=manicure.id,
                    client_name="Cliente confirmado",
                    client_phone="3001112233",
                    appointment_datetime=datetime.combine(monday_date, time(9, 45)),
                    status="confirmed",
                ),
                Appointment(
                    professional_id=ana.id,
                    service_id=manicure.id,
                    client_name="Cliente cancelado",
                    client_phone="3001112234",
                    appointment_datetime=datetime.combine(monday_date, time(10, 30)),
                    status="cancelled",
                ),
            ]
        )
        db.session.commit()

        self.manicure_id = manicure.id
        self.haircut_id = haircut.id
        self.ana_id = ana.id
        self.bea_id = bea.id
        self.inactive_service_id = inactive_service.id
        self.monday_date = monday_date

    def test_root_serves_frontend(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"html", response.data.lower())

    def test_services_endpoint_lists_only_active_services_ordered_by_category_and_name(
        self,
    ):
        response = self.client.get("/api/services")

        self.assertEqual(response.status_code, 200)
        services = response.get_json()
        self.assertEqual(
            [service["name"] for service in services], ["Corte", "Manicure"]
        )
        self.assertNotIn("Servicio oculto", [service["name"] for service in services])

    def test_service_detail_and_categories(self):
        detail_response = self.client.get(f"/api/services/{self.manicure_id}")
        categories_response = self.client.get("/api/services/categories")

        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.get_json()["name"], "Manicure")
        self.assertEqual(categories_response.status_code, 200)
        self.assertEqual(categories_response.get_json(), ["Cabello", "Uñas"])

    def test_professionals_endpoint_lists_active_professionals_and_filters_by_service(
        self,
    ):
        list_response = self.client.get("/api/professionals")
        filter_response = self.client.get(
            f"/api/professionals/by-service/{self.haircut_id}"
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(
            [prof["name"] for prof in list_response.get_json()], ["Ana", "Bea"]
        )
        self.assertEqual(filter_response.status_code, 200)
        self.assertEqual([prof["name"] for prof in filter_response.get_json()], ["Ana"])

    def test_availability_returns_open_slots_and_excludes_confirmed_bookings(self):
        response = self.client.get(
            f"/api/availability/{self.ana_id}/{self.monday_date.isoformat()}",
            query_string={"service_id": self.manicure_id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), ["09:00", "10:30"])

    def test_availability_validation_and_empty_cases(self):
        invalid_response = self.client.get(f"/api/availability/{self.ana_id}/bad-date")
        past_response = self.client.get(f"/api/availability/{self.ana_id}/2000-01-01")
        sunday = next_weekday(6)
        no_hours_response = self.client.get(
            f"/api/availability/{self.ana_id}/{sunday.isoformat()}"
        )

        self.assertEqual(invalid_response.status_code, 400)
        self.assertEqual(past_response.status_code, 200)
        self.assertEqual(past_response.get_json(), [])
        self.assertEqual(no_hours_response.status_code, 200)
        self.assertEqual(no_hours_response.get_json(), [])

    def test_create_get_cancel_and_rebook_appointment(self):
        payload = {
            "professional_id": self.bea_id,
            "service_id": self.manicure_id,
            "client_name": "Laura Perez",
            "client_phone": "3005556677",
            "client_address": "Calle 1 #2-3",
            "notes": "Sin acetona",
            "appointment_datetime": datetime.combine(
                self.monday_date, time(10, 45)
            ).isoformat(),
        }

        create_response = self.client.post("/api/appointments", json=payload)
        self.assertEqual(create_response.status_code, 201)
        created = create_response.get_json()
        self.assertEqual(created["client_name"], "Laura Perez")
        self.assertEqual(created["status"], "confirmed")

        detail_response = self.client.get(f"/api/appointments/{created['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.get_json()["client_phone"], "3005556677")

        conflict_response = self.client.post("/api/appointments", json=payload)
        self.assertEqual(conflict_response.status_code, 409)

        cancel_response = self.client.patch(f"/api/appointments/{created['id']}/cancel")
        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(cancel_response.get_json()["status"], "cancelled")

        rebook_response = self.client.post("/api/appointments", json=payload)
        self.assertEqual(rebook_response.status_code, 201)

    def test_create_appointment_validates_required_fields_and_references(self):
        missing_response = self.client.post("/api/appointments", json={})
        bad_professional_response = self.client.post(
            "/api/appointments",
            json={
                "professional_id": 999,
                "service_id": self.manicure_id,
                "client_name": "Cliente",
                "client_phone": "3000000000",
                "appointment_datetime": datetime.combine(
                    self.monday_date, time(11, 15)
                ).isoformat(),
            },
        )
        bad_datetime_response = self.client.post(
            "/api/appointments",
            json={
                "professional_id": self.ana_id,
                "service_id": self.manicure_id,
                "client_name": "Cliente",
                "client_phone": "3000000000",
                "appointment_datetime": "fecha-invalida",
            },
        )

        self.assertEqual(missing_response.status_code, 400)
        self.assertEqual(bad_professional_response.status_code, 404)
        self.assertEqual(bad_datetime_response.status_code, 400)

    def test_upload_image_validates_input_and_saves_allowed_files(self):
        no_file_response = self.client.post("/api/upload", data={})
        invalid_file_response = self.client.post(
            "/api/upload",
            data={"file": (io.BytesIO(b"not an image"), "design.txt")},
            content_type="multipart/form-data",
        )
        valid_file_response = self.client.post(
            "/api/upload",
            data={"file": (io.BytesIO(b"fake png content"), "design.png")},
            content_type="multipart/form-data",
        )

        self.assertEqual(no_file_response.status_code, 400)
        self.assertEqual(invalid_file_response.status_code, 400)
        self.assertEqual(valid_file_response.status_code, 201)
        saved_url = valid_file_response.get_json()["url"]
        self.assertTrue(saved_url.startswith("/uploads/"))
        self.assertTrue(
            Path(self.uploads_dir.name, saved_url.removeprefix("/uploads/")).exists()
        )


if __name__ == "__main__":
    unittest.main()
