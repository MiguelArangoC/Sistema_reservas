const BUSINESS_CONFIG = {
  name: "Lumina Aesthetic Clinic",
  type: "clinic", // "clinic" | "restaurant" | "barbershop" | "salon"
  tagline: "Tu belleza, nuestra pasión",
  
  // Design system base colors (HSL values)
  theme: {
    primaryH: 262, // Purple
    primaryS: 83,
    primaryL: 58,
    accentH: 330,  // Pink
    accentS: 81,
    accentL: 60,
  },
  
  currency: "USD",
  locale: "es-CO",
  timezone: "America/Bogota",
  
  contact: { 
    phone: "+57 300 000 0000", 
    whatsapp: "573000000000", 
    email: "contacto@lumina.clinic",
    address: "Cra 15 # 93-60, Bogotá"
  },
  
  // Weekly schedule
  schedule: {
    monday:    { open: "09:00", close: "18:00" },
    tuesday:   { open: "09:00", close: "18:00" },
    wednesday: { open: "09:00", close: "18:00" },
    thursday:  { open: "09:00", close: "19:00" },
    friday:    { open: "09:00", close: "19:00" },
    saturday:  { open: "09:00", close: "14:00" },
    sunday:    null // closed
  },
  
  slotDuration: 30, // minutes
  
  // Services
  services: [
    {
      id: "s1",
      name: "Limpieza Facial Profunda",
      description: "Extracción de impurezas, exfoliación y mascarilla hidratante.",
      duration: 60, // minutes
      price: 50,
      icon: "✨"
    },
    {
      id: "s2",
      name: "Peeling Químico",
      description: "Renovación celular para atenuar manchas y marcas de acné.",
      duration: 45,
      price: 80,
      icon: "🧪"
    },
    {
      id: "s3",
      name: "Masaje Relajante",
      description: "Masaje de cuerpo completo con aceites esenciales.",
      duration: 60,
      price: 60,
      icon: "💆‍♀️"
    },
    {
      id: "s4",
      name: "Depilación Láser (Zonas Pequeñas)",
      description: "Sesión de depilación definitiva.",
      duration: 30,
      price: 40,
      icon: "⚡"
    }
  ],
  
  // Staff / Team
  staff: [
    {
      id: "p1",
      name: "Dra. Sofía Reyes",
      role: "Médico Estético",
      avatar: "https://i.pravatar.cc/150?u=sofia",
      rating: 4.9,
      services: ["s2", "s4"] // IDs of services they provide
    },
    {
      id: "p2",
      name: "Laura Gómez",
      role: "Cosmetóloga",
      avatar: "https://i.pravatar.cc/150?img=5",
      rating: 4.8,
      services: ["s1", "s3"]
    },
    {
      id: "p3",
      name: "Carlos Ruiz",
      role: "Masoterapeuta",
      avatar: "https://i.pravatar.cc/150?img=11",
      rating: 4.7,
      services: ["s3"]
    }
  ]
};

// Export if using modules, otherwise global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BUSINESS_CONFIG;
} else {
  window.BUSINESS_CONFIG = BUSINESS_CONFIG;
}
