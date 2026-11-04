// Moteur de page "liste + formulaire" réutilisé par employés, services, visites, factures, paiements, dépenses.
// Chaque page fournit seulement une configuration (colonnes, champs, fonctions API).
const statusBadge = (a) => `<span class="badge ${a ? 'success' : 'error'}">${a ? 'Actif' : 'Inactif'}</span>`;
const toOptions = (arr) => arr.map((v) => ({ value: v, label: labelOf(v) }));
const today = () => new Date().toISOString().slice(0, 10);

async function createCrudPage(cfg) {
  const content = buildShell(cfg.key, cfg.title);
  if (!content) return;
  if (cfg.adminOnly && !isAdmin()) { location.href = 'dashboard.html'; return; }
  const canWrite = cfg.canWrite ? cfg.canWrite() : true;   // création / modification
  const canDelete = cfg.canDelete ? cfg.canDelete() : isAdmin();
  const state = { page: 1, filters: {}, rows: {} };
  const cache = {};
  const opts = async (kind, f) => (cache[kind + f.name] ??= typeof f.options === 'function' ? await f.options() : f.options || []);
  const optionTags = (o, sel) => o.map((x) => `<option value="${esc(x.value)}" ${String(x.value) === String(sel) ? 'selected' : ''}>${esc(x.label)}</option>`).join('');

  // ----- Barre d'outils : filtres + bouton d'ajout -----
  const filters = await Promise.all((cfg.filters || []).map(async (f) => {
    if (f.type === 'select') return `<select data-filter="${f.name}"><option value="">${esc(f.label)} : tous</option>${optionTags(await opts('f', f))}</select>`;
    if (f.type === 'date') return `<label class="filter">${esc(f.label)}<input type="date" data-filter="${f.name}"></label>`;
    return `<div class="search"><i data-lucide="search"></i><input data-filter="${f.name}" type="search" placeholder="${esc(f.label)}"></div>`;
  }));
  content.innerHTML = `<div class="toolbar"><div class="filters">${filters.join('')}</div>
    ${canWrite && cfg.create ? `<button class="btn btn-primary" id="btn-add"><i data-lucide="plus"></i>${esc(cfg.addLabel)}</button>` : ''}</div>
    <div id="summary"></div><div class="card"><div id="zone"></div></div>`;
  refreshIcons();
  const zone = document.getElementById('zone');

  let timer;
  content.querySelector('.toolbar').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.filters = {};
      content.querySelectorAll('[data-filter]').forEach((i) => { if (i.value !== '') state.filters[i.dataset.filter] = i.value; });
      state.page = 1; load();
    }, 350);
  });
  document.getElementById('btn-add')?.addEventListener('click', () => openForm());

  // ----- Liste -----
  const btn = (action, id, icon, title, cls = '') => `<button class="icon-btn ${cls}" data-action="${action}" data-id="${id}" title="${title}"><i data-lucide="${icon}"></i></button>`;
  const rowHtml = (r) => `<tr>${cfg.columns.map(([, fn, isHtml]) => `<td>${isHtml ? fn(r) : esc(fn(r))}</td>`).join('')}<td class="actions">
    ${cfg.detail ? btn('show', r.id, cfg.detailIcon || 'eye', cfg.detailTitle || 'Détails') : ''}
    ${canWrite && cfg.update ? btn('edit', r.id, 'pencil', 'Modifier') : ''}
    ${canDelete && cfg.remove ? btn('delete', r.id, 'trash-2', 'Supprimer', 'danger') : ''}</td></tr>`;

  async function load() {
    zone.innerHTML = loadingHtml();
    try {
      const resp = await cfg.list({ ...state.filters, page: state.page });
      const p = cfg.paginated ? cfg.paginated(resp) : resp;
      state.rows = Object.fromEntries(p.data.map((r) => [r.id, r]));
      document.getElementById('summary').innerHTML = cfg.summary ? cfg.summary(resp) : '';
      if (!p.data.length) { zone.innerHTML = emptyHtml(cfg.emptyMsg || 'Aucun résultat.'); return; }
      zone.innerHTML = `<div class="table-wrap"><table><thead><tr>${cfg.columns.map((c) => `<th>${c[0]}</th>`).join('')}<th></th></tr></thead>
        <tbody>${p.data.map(rowHtml).join('')}</tbody></table></div>${paginationHtml(p)}`;
      refreshIcons();
    } catch (err) { zone.innerHTML = errorHtml(err); }
  }

  zone.addEventListener('click', async (e) => {
    const pg = e.target.closest('[data-page]');
    if (pg) { state.page = Number(pg.dataset.page); return load(); }
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const row = state.rows[b.dataset.id];
    if (b.dataset.action === 'edit') openForm(row);
    if (b.dataset.action === 'show') {
      const body = openModal(cfg.detailTitle || 'Détails', loadingHtml());
      try { body.innerHTML = await cfg.detail(row.id, row); refreshIcons(); } catch (err) { body.innerHTML = errorHtml(err); }
    }
    if (b.dataset.action === 'delete' && await confirmDialog(cfg.deleteMsg ? cfg.deleteMsg(row) : 'Supprimer cet élément ?')) {
      try { await cfg.remove(row.id); toast('Suppression effectuée.'); load(); }
      catch (err) { toast(apiError(err).message, 'error'); } // ex. 409 : élément déjà utilisé
    }
  });

  // ----- Formulaire (ajout et modification) -----
  const fieldHtml = (f, v, o) => {
    const id = `f-${f.name}`, dis = f.readonly ? 'disabled' : '';
    let input;
    if (f.type === 'select') input = `<select id="${id}" name="${f.name}" ${dis}><option value="">Choisir…</option>${optionTags(o, v)}</select>`;
    else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.name}" ${dis}>${esc(v)}</textarea>`;
    else if (f.type === 'checks') input = `<div class="checks">${o.map((x) => `<label><input type="checkbox" name="${f.name}" value="${esc(x.value)}" ${(v || []).includes(x.value) ? 'checked' : ''}> ${esc(x.label)}</label>`).join('') || '<small>Aucun choix disponible</small>'}</div>`;
    else input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" ${f.attrs || ''} value="${esc(v)}" ${dis}>`;
    return `<div class="field ${f.full || f.type === 'checks' ? 'span2' : ''}"><label for="${id}">${esc(f.label)}</label>${input}<div class="field-error" data-error-for="${f.name}"></div></div>`;
  };

  async function openForm(row = null) {
    const fields = cfg.fields.filter((f) => !(row && f.createOnly));
    const vals = row ? { ...row, ...(cfg.toForm ? cfg.toForm(row) : {}) } : cfg.defaults || {};
    const body = openModal(row ? 'Modifier' : cfg.addLabel, loadingHtml());
    try {
      const parts = await Promise.all(fields.map(async (f) => fieldHtml(f, vals[f.name], await opts('c', f))));
      body.innerHTML = `<form id="crud-form" novalidate>${row && cfg.editNote ? `<p class="note">${cfg.editNote(row)}</p>` : ''}
        <div class="form-grid">${parts.join('')}</div><div class="form-actions"><button type="button" class="btn" data-close>Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button></div></form>`;
    } catch (err) { body.innerHTML = errorHtml(err); return; }

    const form = body.querySelector('#crud-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors(form);
      const data = {};
      fields.filter((f) => !f.readonly).forEach((f) => {
        data[f.name] = f.type === 'checks'
          ? [...form.querySelectorAll(`[name="${f.name}"]:checked`)].map((i) => Number(i.value))
          : form.elements[f.name].value;
      });
      const missing = fields.find((f) => f.required && !f.readonly && data[f.name] === '');
      if (missing) return showFieldErrors(form, { [missing.name]: ['Ce champ est obligatoire.'] });
      try {
        const payload = cfg.beforeSend ? cfg.beforeSend(data, row) : data;
        row ? await cfg.update(row.id, payload) : await cfg.create(payload);
        closeModal(); toast(row ? 'Modifications enregistrées.' : 'Enregistrement effectué.'); load();
      } catch (err) {
        const { message, errors } = apiError(err);
        errors ? showFieldErrors(form, errors) : toast(message, 'error');
      }
    });
  }
  load();
}
