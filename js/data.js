/* 
  Mock Data Simulation
  This file handles loading/saving mock data (bookings) to LocalStorage
  to simulate a backend for the boilerplate.
*/

const DB_KEY = 'reservas_mock_db';

// Initialize DB if not exists
function initDB() {
  const existingData = localStorage.getItem(DB_KEY);
  if (!existingData) {
    const initialData = {
      bookings: [
        // Dummy data
        {
          id: "B-1001",
          serviceId: "s1",
          staffId: "p2",
          date: "2024-06-20",
          time: "10:00",
          client: {
            name: "Ana Martínez",
            email: "ana.m@example.com",
            phone: "+573001112233",
            notes: "Primera vez en la clínica"
          },
          status: "confirmed", // 'confirmed', 'pending', 'cancelled'
          createdAt: new Date().toISOString()
        }
      ]
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initialData));
  }
}

// Get all bookings
function getBookings() {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data).bookings : [];
}

// Add new booking
function addBooking(bookingData) {
  const db = JSON.parse(localStorage.getItem(DB_KEY));
  
  // Generate random ID
  const newId = "B-" + Math.floor(1000 + Math.random() * 9000);
  
  const newBooking = {
    id: newId,
    ...bookingData,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  
  db.bookings.push(newBooking);
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  
  return newBooking;
}

// Get booked slots for a specific date and staff
function getBookedSlots(dateStr, staffId = null) {
  const bookings = getBookings();
  return bookings
    .filter(b => b.date === dateStr && b.status === 'confirmed' && (!staffId || b.staffId === staffId))
    .map(b => b.time);
}

// Initialize on load
initDB();

window.MockDB = {
  getBookings,
  addBooking,
  getBookedSlots
};
