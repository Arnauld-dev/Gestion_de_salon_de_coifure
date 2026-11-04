<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Conge;
use App\Models\Depense;
use App\Models\Employe;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalonTest extends TestCase
{
    use RefreshDatabase;

    private function connecter(string $role = 'admin'): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => $role]));
    }

    /** @return array{0: Client, 1: Employe, 2: Service} */
    private function donnees(): array
    {
        $client = Client::create(['nom' => 'Test', 'prenom' => 'Aline']);
        $employe = Employe::create([
            'nom' => 'Niyonzima', 'prenom' => 'Claude', 'poste' => 'coiffeur',
            'type_remuneration' => 'commission', 'salaire_ou_commission' => 0.30,
        ]);
        $service = Service::create(['nom_service' => 'Coupe femme', 'duree_minutes' => 45, 'prix' => 15000]);
        $employe->services()->attach($service->id);

        return [$client, $employe, $service];
    }

    private function payload(array $d, string $date = '2026-10-30 10:00:00'): array
    {
        return ['client_id' => $d[0]->id, 'employe_id' => $d[1]->id, 'service_id' => $d[2]->id, 'date_visite' => $date];
    }

    public function test_login_renvoie_un_token(): void
    {
        User::factory()->create(['email' => 'a@b.test', 'password' => 'secret123', 'role' => 'admin']);

        $this->postJson('/api/login', ['email' => 'a@b.test', 'password' => 'secret123'])
            ->assertOk()->assertJsonStructure(['token', 'user']);
        $this->postJson('/api/login', ['email' => 'a@b.test', 'password' => 'faux'])->assertStatus(422);
    }

    public function test_une_visite_cree_sa_facture_et_les_paiements_sont_plafonnes(): void
    {
        $this->connecter();
        $d = $this->donnees();

        $r = $this->postJson('/api/visites', $this->payload($d))->assertCreated();
        $this->assertEquals(15000, $r->json('facture.montant_total'));
        $this->assertStringStartsWith('FAC-2026-', $r->json('facture.numero'));
        $visiteId = $r->json('id');

        // paiement partiel
        $this->postJson('/api/paiements', ['visite_id' => $visiteId, 'montant' => 5000, 'mode_paiement' => 'especes'])
            ->assertCreated()->assertJsonPath('facture.statut', 'partielle');

        // dépasse le reste (10 000)
        $this->postJson('/api/paiements', ['visite_id' => $visiteId, 'montant' => 10001, 'mode_paiement' => 'carte'])
            ->assertStatus(422)->assertJsonValidationErrors('montant');

        // solde exact
        $this->postJson('/api/paiements', ['visite_id' => $visiteId, 'montant' => 10000, 'mode_paiement' => 'mobile_money'])
            ->assertCreated()->assertJsonPath('facture.statut', 'payee');

        // plus rien à payer
        $this->postJson('/api/paiements', ['visite_id' => $visiteId, 'montant' => 1, 'mode_paiement' => 'especes'])
            ->assertStatus(422);

        $this->getJson('/api/factures?statut=payee')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/factures?statut=non_payee')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_employe_en_conge_ou_non_habilite_est_refuse(): void
    {
        $this->connecter();
        $d = $this->donnees();
        Conge::create(['employe_id' => $d[1]->id, 'date_debut' => '2026-10-28', 'date_fin' => '2026-11-02']);

        $this->postJson('/api/visites', $this->payload($d))
            ->assertStatus(422)->assertJsonValidationErrors('employe_id');

        $autre = Service::create(['nom_service' => 'Lissage', 'duree_minutes' => 150, 'prix' => 60000]);
        $this->postJson('/api/visites', array_merge($this->payload($d, '2026-12-01 10:00:00'), ['service_id' => $autre->id]))
            ->assertStatus(422)->assertJsonValidationErrors('service_id');
    }

    public function test_la_reception_n_accede_pas_aux_depenses_ni_aux_rapports(): void
    {
        $this->connecter('reception');

        $this->getJson('/api/depenses')->assertForbidden();
        $this->getJson('/api/rapports/dashboard')->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/clients')->assertOk();
    }

    public function test_rapport_mensuel_calcule_ca_depenses_et_resultat(): void
    {
        $this->connecter();
        $d = $this->donnees();
        $visiteId = $this->postJson('/api/visites', $this->payload($d))->json('id');
        $this->postJson('/api/paiements', [
            'visite_id' => $visiteId, 'montant' => 15000, 'mode_paiement' => 'mobile_money', 'date_paiement' => '2026-10-30',
        ])->assertCreated();
        Depense::create(['type_depense' => 'loyer', 'montant' => 5000, 'date_depense' => '2026-10-05']);

        $r = $this->getJson('/api/rapports/mensuel?mois=2026-10')->assertOk();
        $this->assertEquals(15000, $r->json('chiffre_affaires'));
        $this->assertEquals(5000, $r->json('depenses'));
        $this->assertEquals(10000, $r->json('resultat'));
        $this->assertEquals(15000, $r->json('par_mode_paiement.mobile_money'));

        $e = $this->getJson('/api/rapports/employes?mois=2026-10')->assertOk();
        $this->assertEquals(4500, $e->json('employes.0.remuneration_due')); // 30 % de 15 000

        $this->assertEquals(15000, $this->getJson('/api/rapports/jour?date=2026-10-30')->json('chiffre_affaires'));
    }

    public function test_une_commission_superieure_a_100_pourcent_est_refusee(): void
    {
        $this->connecter();

        $this->postJson('/api/employes', [
            'nom' => 'X', 'prenom' => 'Y', 'poste' => 'coiffeur',
            'type_remuneration' => 'commission', 'salaire_ou_commission' => 30,
        ])->assertStatus(422)->assertJsonValidationErrors('salaire_ou_commission');
    }
}
