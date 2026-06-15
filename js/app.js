/* 
  SISTEMA DE RESERVAS — App Initialization & Global Logic
*/

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  if (typeof BUSINESS_CONFIG === 'undefined') {
    console.error("BUSINESS_CONFIG is missing!");
    return;
  }

  applyThemeVariables();
  initThemeToggle();
  populateBusinessInfo();
  initAnimations();
  initMobileMenu();
}

// 1. Apply Dynamic CSS Variables from Config
function applyThemeVariables() {
  const root = document.documentElement;
  const theme = BUSINESS_CONFIG.theme;
  
  if (theme) {
    root.style.setProperty('--primary-h', theme.primaryH);
    root.style.setProperty('--primary-s', theme.primaryS + '%');
    root.style.setProperty('--primary-l', theme.primaryL + '%');
    
    root.style.setProperty('--accent-h', theme.accentH);
    root.style.setProperty('--accent-s', theme.accentS + '%');
    root.style.setProperty('--accent-l', theme.accentL + '%');
  }
}

// 2. Handle Dark/Light Mode
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  // Check saved preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  updateThemeIcon(toggleBtn, currentTheme);

  toggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon(toggleBtn, currentTheme);
  });
}

function updateThemeIcon(btn, theme) {
  // Simple icon toggle (could use SVGs instead)
  btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}

// 3. Populate dynamic strings across the UI
function populateBusinessInfo() {
  const nameEls = document.querySelectorAll('.b-name');
  nameEls.forEach(el => el.textContent = BUSINESS_CONFIG.name);
  
  const tagEls = document.querySelectorAll('.b-tagline');
  tagEls.forEach(el => el.textContent = BUSINESS_CONFIG.tagline);
  
  const phoneEls = document.querySelectorAll('.b-phone');
  phoneEls.forEach(el => {
    el.textContent = BUSINESS_CONFIG.contact.phone;
    if(el.tagName === 'A') el.href = `tel:${BUSINESS_CONFIG.contact.phone.replace(/\s+/g, '')}`;
  });
  
  const wpBtn = document.getElementById('whatsapp-fab');
  if (wpBtn) {
    wpBtn.href = `https://wa.me/${BUSINESS_CONFIG.contact.whatsapp}`;
  }
}

// 4. Scroll animations
function initAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Animate only once
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger').forEach(el => {
    observer.observe(el);
  });
  
  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
}

// 5. Mobile Menu
function initMobileMenu() {
  const hamburger = document.querySelector('.navbar__hamburger');
  const menu = document.querySelector('.mobile-menu');
  
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });
  }
}

// Utility for showing toasts
window.showToast = function(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${message}</div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
