// Configuration centrale : modifiez uniquement ce fichier selon votre environnement.
const API_URL = 'http://localhost:8000/api'; // URL de base de l'API Laravel
const SALON_NAME = 'Salon';                  // Nom affiché (sidebar, factures)
const CURRENCY = 'FBu';                      // Devise (Franc burundais)
// Chemin vers la racine du frontend selon la page courante (login.html ou pages/*.html)
const ROOT = location.pathname.includes('/pages/') ? '../' : './';
