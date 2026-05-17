// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
});

// Close nav when a link is clicked
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  }
});

// Close nav on outside click
document.addEventListener('click', (e) => {
  if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

// Highlight active nav link on scroll
const sections = document.querySelectorAll('section[id], header[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const observerOptions = {
  root: null,
  rootMargin: '-50% 0px -50% 0px',
  threshold: 0,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      navAnchors.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`);
      });
    }
  });
}, observerOptions);

sections.forEach((s) => observer.observe(s));

// Contact form — show success state on submit
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    // If formspree action is still the placeholder, prevent real submission and show success
    if (form.action.includes('YOUR_FORMSPREE_ID')) {
      e.preventDefault();
      showSuccess();
      return;
    }

    // Real formspree submission — let the browser handle it normally,
    // but intercept with fetch for a nicer in-page success experience
    e.preventDefault();
    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        showSuccess();
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send My Request';
        alert('Something went wrong. Please call us at (903) 000-0000 or try again.');
      }
    } catch {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send My Request';
      alert('Network error. Please call us at (903) 000-0000 or try again.');
    }
  });
}

function showSuccess() {
  const formEl = document.getElementById('contactForm');
  formEl.innerHTML = `
    <div class="form-success">
      <div class="success-icon">&#10003;</div>
      <h3>Request Received!</h3>
      <p>Thanks for reaching out. Scott will be in touch within one business day to schedule your free estimate.</p>
    </div>
  `;
}

// Smooth nav shadow on scroll
const navWrapper = document.querySelector('.nav-wrapper');
window.addEventListener('scroll', () => {
  navWrapper.style.boxShadow = window.scrollY > 10
    ? '0 2px 16px rgba(0,0,0,.35)'
    : '0 2px 12px rgba(0,0,0,.25)';
}, { passive: true });
