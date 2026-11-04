<?php

namespace Database\Seeders;

use App\Actions\EnregistrerPaiement;
use App\Actions\EnregistrerVisite;
use App\Models\Client;
use App\Models\Conge;
use App\Models\Depense;
use App\Models\Employe;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Comptes de démonstration : CHANGEZ LES MOTS DE PASSE avant toute mise en production.
        User::updateOrCreate(['email' => 'admin@salon.test'], ['name' => 'Gérant', 'password' => 'password', 'role' => 'admin']);
        User::updateOrCreate(['email' => 'reception@salon.test'], ['name' => 'Réception', 'password' => 'password', 'role' => 'reception']);

        $services = collect([
            ['Coupe femme', 45, 15000], ['Coupe homme', 30, 8000], ['Brushing', 30, 10000],
            ['Coloration', 90, 35000], ['Mèches', 120, 45000], ['Lissage', 150, 60000], ['Soin', 30, 12000],
        ])->mapWithKeys(fn ($s) => [$s[0] => Service::firstOrCreate(
            ['nom_service' => $s[0]], ['duree_minutes' => $s[1], 'prix' => $s[2]]
        )]);

        $claude = Employe::firstOrCreate(['nom' => 'Niyonzima', 'prenom' => 'Claude'], [
            'poste' => 'coiffeur', 'specialites' => 'Coupe, brushing', 'horaires' => 'Lun-Sam 8h-17h',
            'type_remuneration' => 'commission', 'salaire_ou_commission' => 0.30,
        ]);
        $marie = Employe::firstOrCreate(['nom' => 'Irakoze', 'prenom' => 'Marie'], [
            'poste' => 'coloriste', 'specialites' => 'Coloration, mèches, lissage', 'horaires' => 'Mar-Sam 9h-18h',
            'type_remuneration' => 'commission', 'salaire_ou_commission' => 0.35,
        ]);
        Employe::firstOrCreate(['nom' => 'Hakizimana', 'prenom' => 'Eric'], [
            'poste' => 'receptionniste', 'horaires' => 'Lun-Sam 8h-17h',
            'type_remuneration' => 'salaire_fixe', 'salaire_ou_commission' => 250000,
        ]);

        $claude->services()->syncWithoutDetaching($services->only(['Coupe femme', 'Coupe homme', 'Brushing', 'Soin'])->pluck('id'));
        $marie->services()->syncWithoutDetaching($services->only(['Coloration', 'Mèches', 'Lissage', 'Soin'])->pluck('id'));

        if (Client::exists()) {
            return; // données de démo déjà créées
        }

        $aline = Client::create(['nom' => 'Ndayisaba', 'prenom' => 'Aline', 'telephone' => '+257 79 000 001', 'preferences' => 'Coupe carré', 'date_naissance' => '1995-04-12']);
        $sandra = Client::create(['nom' => 'Uwimana', 'prenom' => 'Sandra', 'telephone' => '+257 79 000 002', 'allergies' => 'Ammoniaque']);

        Conge::create(['employe_id' => $marie->id, 'date_debut' => now()->addDays(20)->toDateString(), 'date_fin' => now()->addDays(27)->toDateString(), 'motif' => 'Congé annuel']);

        $visite = app(EnregistrerVisite::class);
        $paiement = app(EnregistrerPaiement::class);

        $v1 = $visite->handle(['client_id' => $aline->id, 'employe_id' => $claude->id, 'service_id' => $services['Coupe femme']->id, 'date_visite' => now()->subDays(2)->setTime(10, 0)]);
        $paiement->handle(['visite_id' => $v1->id, 'montant' => 15000, 'mode_paiement' => 'mobile_money', 'date_paiement' => now()->subDays(2)->toDateString(), 'reference' => 'MM-0001']);

        $v2 = $visite->handle(['client_id' => $sandra->id, 'employe_id' => $marie->id, 'service_id' => $services['Coloration']->id, 'date_visite' => now()->subDay()->setTime(14, 0)]);
        $paiement->handle(['visite_id' => $v2->id, 'montant' => 20000, 'mode_paiement' => 'especes', 'date_paiement' => now()->subDay()->toDateString()]);

        Depense::create(['type_depense' => 'loyer', 'description' => 'Loyer du mois', 'montant' => 300000, 'date_depense' => now()->startOfMonth()->toDateString()]);
        Depense::create(['type_depense' => 'produits', 'description' => 'Shampooings et colorants', 'montant' => 85000, 'date_depense' => now()->subDays(3)->toDateString()]);
    }
}
