// Tous les appels HTTP passent par ici (Axios).
const http = axios.create({ baseURL: API_URL, headers: { Accept: 'application/json' } });

// Ajoute le token à chaque requête
http.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) cfg.headers.Authorization = 'Bearer ' + token;
  return cfg;
});
// Token invalide ou expiré (401) : retour à la connexion
http.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && !location.pathname.endsWith('login.html')) {
    clearSession();
    location.href = ROOT + 'login.html';
  }
  return Promise.reject(err);
});

// Transforme une erreur Axios en { message, errors } lisible
function apiError(err) {
  const r = err.response;
  if (!r) return { message: 'Impossible de joindre le serveur. Vérifiez l\'URL de l\'API et votre connexion.' };
  if (r.status === 422) return { message: 'Certains champs sont invalides.', errors: r.data.errors };
  if (r.status === 403) return { message: 'Vous n\'avez pas le droit d\'effectuer cette action.' };
  if (r.status === 429) return { message: 'Trop de tentatives. Patientez une minute.' };
  if (r.status >= 500) return { message: 'Erreur du serveur. Réessayez plus tard.' };
  return { message: r.data?.message || 'Une erreur est survenue.' };
}

const get = (url, params) => http.get(url, { params }).then((r) => r.data);
const send = (method, url, data) => http[method](url, data).then((r) => r.data);

// Génère list / show / create / update / remove pour une ressource REST Laravel
const crud = (path) => ({
  list: (p) => get(path, p),
  show: (id) => get(path + '/' + id),
  create: (d) => send('post', path, d),
  update: (id, d) => send('put', path + '/' + id, d),
  remove: (id) => http.delete(path + '/' + id),
});

const Api = {
  login: (email, password) => send('post', '/login', { email, password }),
  logout: () => http.post('/logout'),
  clients: crud('/clients'),
  employes: crud('/employes'),
  services: crud('/services'),
  visites: crud('/visites'),
  factures: crud('/factures'),   // le backend n'autorise que list et show
  paiements: crud('/paiements'), // list, show, create, remove (pas de modification)
  depenses: crud('/depenses'),   // admin uniquement
  users: crud('/users'),         // admin uniquement
  rapports: { // admin uniquement
    dashboard: () => get('/rapports/dashboard'),
    mensuel: () => get('/rapports/mensuel'),
    annuel: () => get('/rapports/annuel'),
  },
};
