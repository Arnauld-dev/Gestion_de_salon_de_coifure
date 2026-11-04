<?php

namespace App\Http\Controllers\Api;

use App\Actions\EnregistrerVisite;
use App\Http\Controllers\Controller;
use App\Models\Visite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VisiteController extends Controller
{
    /** Filtres : ?client_id=, ?employe_id=, ?service_id=, ?debut=, ?fin= */
    public function index(Request $request): JsonResponse
    {
        $visites = Visite::query()
            ->with(['client:id,nom,prenom', 'employe:id,nom,prenom', 'service:id,nom_service', 'facture'])
            ->when($request->client_id, fn($q, $v) => $q->where('client_id', $v))
            ->when($request->employe_id, fn($q, $v) => $q->where('employe_id', $v))
            ->when($request->service_id, fn($q, $v) => $q->where('service_id', $v))
            ->when($request->debut, fn($q, $v) => $q->whereDate('date_visite', '>=', $v))
            ->when($request->fin, fn($q, $v) => $q->whereDate('date_visite', '<=', $v))
            ->orderByDesc('date_visite')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json($visites);
    }

    /** Crée la visite ET sa facture. Le prix est celui du service sauf si "prix" est fourni (remise, tarif spécial). */
    public function store(Request $request, EnregistrerVisite $enregistrer): JsonResponse
    {
        $data = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'employe_id' => 'required|exists:employes,id',
            'service_id' => 'required|exists:services,id',
            'date_visite' => 'required|date',
            'prix' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        return response()->json($enregistrer->handle($data), 201);
    }

    public function show(Visite $visite): JsonResponse
    {
        return response()->json($visite->load(['client', 'employe', 'service', 'facture', 'paiements']));
    }

    public function update(Request $request, Visite $visite): JsonResponse
    {
        $data = $request->validate([
            'date_visite' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'prix' => 'sometimes|required|numeric|min:0',
        ]);

        if (isset($data['prix'])) {
            $paye = (float) $visite->paiements()->sum('montant');
            if ((float) $data['prix'] < $paye) {
                throw ValidationException::withMessages(['prix' => "Le prix ne peut pas être inférieur au montant déjà payé ($paye)."]);
            }
            $visite->facture()->update(['montant_total' => $data['prix']]);
        }
        if (isset($data['date_visite']) && $visite->employe->estEnConge(substr($data['date_visite'], 0, 10))) {
            throw ValidationException::withMessages(['date_visite' => 'Cet employé est en congé à cette date.']);
        }
        $visite->update($data);

        return response()->json($visite->load(['client', 'employe', 'service', 'facture']));
    }

    /** Supprime la visite, sa facture et ses paiements (admin uniquement). */
    public function destroy(Visite $visite): JsonResponse
    {
        $visite->delete();

        return response()->json(null, 204);
    }
}
