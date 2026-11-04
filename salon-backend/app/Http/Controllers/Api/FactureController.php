<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facture;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FactureController extends Controller
{
    /** Filtres : ?statut=payee|partielle|non_payee, ?client_id=, ?debut=, ?fin= */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['statut' => 'nullable|in:payee,partielle,non_payee']);

        $factures = Facture::query()
            ->withSum('paiements', 'montant')
            ->with(['visite.client:id,nom,prenom', 'visite.service:id,nom_service'])
            ->statut($request->statut)
            ->when($request->client_id, fn ($q, $id) => $q->whereHas('visite', fn ($w) => $w->where('client_id', $id)))
            ->when($request->debut, fn ($q, $d) => $q->whereDate('date_facture', '>=', $d))
            ->when($request->fin, fn ($q, $d) => $q->whereDate('date_facture', '<=', $d))
            ->orderByDesc('date_facture')->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json($factures);
    }

    public function show(Facture $facture): JsonResponse
    {
        return response()->json($facture->load(['visite.client', 'visite.employe', 'visite.service', 'paiements']));
    }
}
