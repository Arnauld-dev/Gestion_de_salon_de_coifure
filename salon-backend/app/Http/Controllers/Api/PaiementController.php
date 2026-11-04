<?php

namespace App\Http\Controllers\Api;

use App\Actions\EnregistrerPaiement;
use App\Enums\ModePaiement;
use App\Http\Controllers\Controller;
use App\Models\Facture;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaiementController extends Controller
{
    /** Filtres : ?visite_id=, ?mode_paiement=, ?debut=, ?fin= — renvoie aussi le total de la sélection. */
    public function index(Request $request): JsonResponse
    {
        $query = Paiement::query()
            ->when($request->visite_id, fn ($q, $v) => $q->where('visite_id', $v))
            ->when($request->mode_paiement, fn ($q, $v) => $q->where('mode_paiement', $v))
            ->when($request->debut, fn ($q, $v) => $q->whereDate('date_paiement', '>=', $v))
            ->when($request->fin, fn ($q, $v) => $q->whereDate('date_paiement', '<=', $v));

        $total = round((float) (clone $query)->sum('montant'), 2);
        $paiements = $query->with('visite.client:id,nom,prenom')
            ->orderByDesc('date_paiement')->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json(['total_selection' => $total, 'paiements' => $paiements]);
    }

    public function store(Request $request, EnregistrerPaiement $enregistrer): JsonResponse
    {
        $data = $request->validate([
            'visite_id' => 'required|exists:visites,id',
            'montant' => 'required|numeric|min:0.01',
            'mode_paiement' => ['required', Rule::enum(ModePaiement::class)],
            'date_paiement' => 'nullable|date|before_or_equal:today',
            'reference' => 'nullable|string|max:100',
        ]);
        $paiement = $enregistrer->handle($data);

        return response()->json([
            'paiement' => $paiement,
            'facture' => Facture::where('visite_id', $paiement->visite_id)->first(),
        ], 201);
    }

    public function show(Paiement $paiement): JsonResponse
    {
        return response()->json($paiement->load(['visite.client', 'facture']));
    }

    /** Annulation d'un paiement saisi par erreur (admin uniquement). */
    public function destroy(Paiement $paiement): JsonResponse
    {
        $paiement->delete();

        return response()->json(null, 204);
    }
}
