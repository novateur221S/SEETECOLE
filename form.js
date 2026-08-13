document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('schoolForm');
  if (!form) return;
  const steps = [...form.querySelectorAll('.form-step')];
  const bar = document.getElementById('progressBar');
  const status = document.getElementById('formStatus');
  const submit = document.getElementById('schoolSubmit');
  const fallback = document.getElementById('emailFallback');
  let current = 0;

  function showStep(index) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, i) => step.classList.toggle('active', i === current));
    bar.style.width = `${((current + 1) / steps.length) * 100}%`;
    status.textContent = `Étape ${current + 1} sur ${steps.length} — ${steps[current].dataset.stepTitle || ''}`;
    form.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function validateCurrentStep() {
    const fields = [...steps[current].querySelectorAll('input, select, textarea')]
      .filter(field => field.type !== 'hidden' && field.type !== 'button');
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus({preventScroll: false});
        return false;
      }
    }
    return true;
  }

  form.querySelectorAll('.next').forEach(button => button.addEventListener('click', () => {
    if (validateCurrentStep()) showStep(current + 1);
  }));
  form.querySelectorAll('.prev').forEach(button => button.addEventListener('click', () => showStep(current - 1)));

  const geoBtn = document.getElementById('geoBtn');
  geoBtn?.addEventListener('click', () => {
    const message = document.getElementById('geoStatus');
    if (!navigator.geolocation) { message.textContent = 'La géolocalisation n’est pas disponible sur cet appareil.'; return; }
    geoBtn.disabled = true; message.textContent = 'Localisation en cours…';
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude.toFixed(6), lon = position.coords.longitude.toFixed(6);
      document.getElementById('schoolLatitude').value = lat;
      document.getElementById('schoolLongitude').value = lon;
      const maps = form.elements['Lien_Google_Maps'];
      if (maps && !maps.value) maps.value = `https://www.google.com/maps?q=${lat},${lon}`;
      message.textContent = 'Position ajoutée avec succès ✅'; geoBtn.disabled = false;
    }, () => { message.textContent = 'Position non récupérée. Autorisez la géolocalisation ou collez un lien Google Maps.'; geoBtn.disabled = false; }, {enableHighAccuracy:true, timeout:12000});
  });

  form.addEventListener('input', () => {
    if (!fallback) return;
    const data = new FormData(form);
    const school = String(data.get('Nom_etablissement') || '').trim();
    const person = String(data.get('Responsable') || '').trim();
    const phone = String(data.get('Telephone') || '').trim();
    const email = String(data.get('Email') || '').trim();
    const subject = encodeURIComponent(`Inscription SETECOLE — ${school || 'Nouvel établissement'}`);
    const body = encodeURIComponent(`Établissement : ${school}\nResponsable : ${person}\nTéléphone : ${phone}\nEmail : ${email}\n\nJe souhaite inscrire cet établissement sur SETECOLE.`);
    fallback.href = `mailto:novateur221@gmail.com?subject=${subject}&body=${body}`;
  });

  form.addEventListener('submit', event => {
    if (!form.checkValidity()) {
      event.preventDefault();
      const invalid = form.querySelector(':invalid');
      const stepIndex = steps.findIndex(step => step.contains(invalid));
      if (stepIndex >= 0) showStep(stepIndex);
      invalid?.reportValidity();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Envoi en cours…';
  });

  showStep(0);
});
