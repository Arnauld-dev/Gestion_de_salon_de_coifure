// Mon profil. Le backend n'a pas de route d'auto-modification :
// l'admin modifie son compte via PUT /users/{id}, la réception est en lecture seule.
const content = buildShell('profil', 'Mon profil');
if (content) init();

async function init() {
  content.innerHTML = loadingHtml();
  try { render(await http.get('/me').then((r) => r.data)); } catch (err) { content.innerHTML = errorHtml(err); }
}

function render(u) {
  const admin = isAdmin(), ro = admin ? '' : 'disabled';
  content.innerHTML = `<div class="card" style="max-width:560px"><form id="pf" novalidate>
    <div class="field"><label>Nom</label><input name="name" value="${esc(u.name)}" ${ro}><div class="field-error" data-error-for="name"></div></div>
    <div class="field"><label>Adresse e-mail</label><input name="email" type="email" value="${esc(u.email)}" ${ro}><div class="field-error" data-error-for="email"></div></div>
    <div class="field"><label>Rôle</label><input value="${esc(labelOf(u.role))}" disabled></div>
    ${admin ? `<div class="field"><label>Nouveau mot de passe (laisser vide pour ne pas changer)</label><input name="password" type="password" autocomplete="new-password"><div class="field-error" data-error-for="password"></div></div>
      <div class="field"><label>Confirmer le mot de passe</label><input name="confirm" type="password" autocomplete="new-password"><div class="field-error" data-error-for="confirm"></div></div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">Enregistrer</button></div>`
      : '<p class="note">La modification du profil est réservée à l\'administrateur par le backend.</p>'}
  </form></div>`;
  if (!admin) return;
  const form = document.getElementById('pf');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const data = { name: form.name.value.trim(), email: form.email.value.trim() }; // le rôle n'est jamais envoyé
    if (form.password.value) {
      if (form.password.value !== form.confirm.value) return showFieldErrors(form, { confirm: ['Les mots de passe ne correspondent pas.'] });
      data.password = form.password.value;
    }
    try {
      const updated = await Api.users.update(u.id, data);
      saveSession(getToken(), updated); // met à jour le nom affiché
      toast('Profil mis à jour.'); render(updated);
    } catch (err) {
      const { message, errors } = apiError(err);
      errors ? showFieldErrors(form, errors) : toast(message, 'error');
    }
  });
}
