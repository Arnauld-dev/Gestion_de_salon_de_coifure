<?php

namespace App\Actions;

use App\Models\Employe;
use App\Models\Facture;
use App\Models\Service;
use App\Models\Visite;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnregistrerVisite
{
    /**
     * Crée une visite et sa facture après avoir vérifié les règles métier :
     * l'employé est actif, habilité pour le service, et pas en congé ce jour-là.
     */
    public function handle(array $data): Visite
    {
        $employe = Employe::findOrFail($data['employe_id']);
        $service = Service::findOrFail($data['service_id']);
        $date = Carbon::parse($data['date_visite']);

        if (! $employe->actif) {
            throw ValidationException::withMessages(['employe_id' => "Cet employé n'est plus actif."]);
        }
        if (! $service->actif) {
            throw ValidationException::withMessages(['service_id' => "Ce service n'est plus proposé."]);
        }
        if (! $employe->services()->whereKey($service->id)->exists()) {
            throw ValidationException::withMessages(['service_id' => "Cet employé n'est pas habilité à réaliser ce service."]);
        }
        if ($employe->estEnConge($date->toDateString())) {
            throw ValidationException::withMessages(['employe_id' => 'Cet employé est en congé à cette date.']);
        }

        return DB::transaction(function () use ($data, $service, $date) {
            $prix = $data['prix'] ?? $service->prix;

            $visite = Visite::create([
                'client_id' => $data['client_id'],
                'employe_id' => $data['employe_id'],
                'service_id' => $service->id,
                'date_visite' => $date,
                'prix' => $prix,
                'notes' => $data['notes'] ?? null,
            ]);

            $facture = Facture::create([
                'visite_id' => $visite->id,
                'date_facture' => $date->toDateString(),
                'montant_total' => $prix,
            ]);
            $facture->update(['numero' => sprintf('FAC-%s-%05d', $date->year, $facture->id)]);

            return $visite->load(['client', 'employe', 'service', 'facture']);
        });
    }
}
