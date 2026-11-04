<?php

namespace App\Http\Controllers\Api;

use App\Enums\Poste;
use App\Enums\TypeRemuneration;
use App\Http\Controllers\Controller;
use App\Models\Employe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployeController extends Controller
{
    private function rules(bool $update = false): array
    {
        $req = $update ? 'sometimes|required' : 'required';

        return [
            'nom' => "$req|string|max:100",
            'prenom' => "$req|string|max:100",
            'telephone' => 'nullable|string|max:30',
            'adresse' => 'nullable|string|max:255',
            'poste' => [$update ? 'sometimes' : 'required', Rule::enum(Poste::class)],
            'specialites' => 'nullable|string|max:255',
            'horaires' => 'nullable|string|max:255',
            'type_remuneration' => [$update ? 'sometimes' : 'required', Rule::enum(TypeRemuneration::class)],
            'salaire_ou_commission' => 'sometimes|required|numeric|min:0',
            'actif' => 'sometimes|boolean',
            'services' => 'sometimes|array',
            'services.*' => 'integer|exists:services,id',
        ];
    }

    /** Une commission est un taux entre 0 et 1 (0.30 = 30 %). */
    private function verifierRemuneration(string $type, float $valeur): void
    {
        if ($type === TypeRemuneration::Commission->value && $valeur > 1) {
            throw ValidationException::withMessages([
                'salaire_ou_commission' => 'Une commission est un taux entre 0 et 1 (ex. 0.30 pour 30 %).',
            ]);
        }
    }

    /** Filtres : ?q=, ?poste=, ?actif=1|0, ?service_id= */
    public function index(Request $request): JsonResponse
    {
        $employes = Employe::query()
            ->with('services:id,nom_service')
            ->when($request->q, fn ($q, $t) => $q->where(fn ($w) => $w->where('nom', 'like', "%$t%")->orWhere('prenom', 'like', "%$t%")))
            ->when($request->poste, fn ($q, $p) => $q->where('poste', $p))
            ->when($request->has('actif'), fn ($q) => $q->where('actif', $request->boolean('actif')))
            ->when($request->service_id, fn ($q, $s) => $q->whereHas('services', fn ($w) => $w->where('services.id', $s)))
            ->orderBy('nom')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json($employes);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $this->verifierRemuneration($data['type_remuneration'], (float) ($data['salaire_ou_commission'] ?? 0));

        $employe = Employe::create(collect($data)->except('services')->all());
        if (isset($data['services'])) {
            $employe->services()->sync($data['services']);
        }

        return response()->json($employe->load('services:id,nom_service'), 201);
    }

    public function show(Employe $employe): JsonResponse
    {
        return response()->json($employe->load(['services:id,nom_service', 'conges']));
    }

    public function update(Request $request, Employe $employe): JsonResponse
    {
        $data = $request->validate($this->rules(true));
        $this->verifierRemuneration(
            $data['type_remuneration'] ?? $employe->type_remuneration->value,
            (float) ($data['salaire_ou_commission'] ?? $employe->salaire_ou_commission)
        );

        $employe->update(collect($data)->except('services')->all());
        if (isset($data['services'])) {
            $employe->services()->sync($data['services']);
        }

        return response()->json($employe->load('services:id,nom_service'));
    }

    public function destroy(Employe $employe): JsonResponse
    {
        if ($employe->visites()->exists()) {
            return response()->json([
                'message' => 'Cet employé a des visites enregistrées : désactivez-le (actif = false) au lieu de le supprimer.',
            ], 409);
        }
        $employe->delete();

        return response()->json(null, 204);
    }
}
