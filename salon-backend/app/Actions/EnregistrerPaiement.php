<?php

namespace App\Actions;

use App\Models\Facture;
use App\Models\Paiement;
use App\Models\Visite;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnregistrerPaiement
{
    /** Enregistre un paiement sans jamais dépasser le reste à payer de la facture. */
    public function handle(array $data): Paiement
    {
        return DB::transaction(function () use ($data) {
            // verrou pour éviter deux paiements simultanés qui dépasseraient le total
            $visite = Visite::lockForUpdate()->findOrFail($data['visite_id']);
            $facture = Facture::where('visite_id', $visite->id)->firstOrFail();
            $montant = round((float) $data['montant'], 2);

            if ($facture->reste_a_payer <= 0) {
                throw ValidationException::withMessages(['visite_id' => 'Cette facture est déjà entièrement payée.']);
            }
            if ($montant > $facture->reste_a_payer) {
                throw ValidationException::withMessages([
                    'montant' => "Le montant dépasse le reste à payer ({$facture->reste_a_payer}).",
                ]);
            }

            return Paiement::create([
                'visite_id' => $visite->id,
                'montant' => $montant,
                'mode_paiement' => $data['mode_paiement'],
                'date_paiement' => $data['date_paiement'] ?? now()->toDateString(),
                'reference' => $data['reference'] ?? null,
            ]);
        });
    }
}
