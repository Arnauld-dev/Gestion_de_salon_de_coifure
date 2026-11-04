<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    private function rules(bool $update = false): array
    {
        $req = $update ? 'sometimes|required' : 'required';

        return [
            'nom' => "$req|string|max:100",
            'prenom' => "$req|string|max:100",
            'telephone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:150',
            'date_naissance' => 'nullable|date|before:today',
            'preferences' => 'nullable|string',
            'allergies' => 'nullable|string',
        ];
    }

    /** Recherche : ?q=texte (nom, prénom, téléphone, e-mail) */
    public function index(Request $request): JsonResponse
    {
        $clients = Client::query()
            ->when($request->q, function ($query, $q) {
                $query->where(fn ($w) => $w->where('nom', 'like', "%$q%")
                    ->orWhere('prenom', 'like', "%$q%")
                    ->orWhere('telephone', 'like', "%$q%")
                    ->orWhere('email', 'like', "%$q%"));
            })
            ->orderBy('nom')->orderBy('prenom')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json($clients);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Client::create($request->validate($this->rules())), 201);
    }

    /** Fiche client avec historique des visites. */
    public function show(Client $client): JsonResponse
    {
        $client->load(['visites' => fn ($q) => $q->with(['service:id,nom_service', 'employe:id,nom,prenom', 'facture'])
            ->orderByDesc('date_visite')]);

        return response()->json($client);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $client->update($request->validate($this->rules(true)));

        return response()->json($client);
    }

    public function destroy(Client $client): JsonResponse
    {
        if ($client->visites()->exists()) {
            return response()->json(['message' => 'Ce client a un historique de visites : suppression impossible.'], 409);
        }
        $client->delete();

        return response()->json(null, 204);
    }

    /** Clients dont l'anniversaire tombe dans le mois : ?mois=1..12 (mois courant par défaut). */
    public function anniversaires(Request $request): JsonResponse
    {
        $request->validate(['mois' => 'nullable|integer|between:1,12']);
        $mois = (int) $request->input('mois', now()->month);

        return response()->json(
            Client::whereMonth('date_naissance', $mois)
                ->get()
                ->sortBy(fn ($c) => \Illuminate\Support\Carbon::parse($c->date_naissance)->day)
                ->values()
        );
    }
}
