<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    private function rules(?Service $service = null): array
    {
        $req = $service ? 'sometimes|required' : 'required';

        return [
            'nom_service' => [...explode('|', $req), 'string', 'max:150', Rule::unique('services', 'nom_service')->ignore($service?->id)],
            'duree_minutes' => "$req|integer|min:5|max:600",
            'prix' => "$req|numeric|min:0",
            'actif' => 'sometimes|boolean',
            'employes' => 'sometimes|array',
            'employes.*' => 'integer|exists:employes,id',
        ];
    }

    /** Liste complète (peu de lignes). Filtres : ?actif=1|0, ?employe_id= (services qu'un employé peut faire) */
    public function index(Request $request): JsonResponse
    {
        $services = Service::query()
            ->with('employes:id,nom,prenom')
            ->when($request->has('actif'), fn ($q) => $q->where('actif', $request->boolean('actif')))
            ->when($request->employe_id, fn ($q, $id) => $q->whereHas('employes', fn ($w) => $w->where('employes.id', $id)))
            ->orderBy('nom_service')
            ->get();

        return response()->json($services);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $service = Service::create(collect($data)->except('employes')->all());
        if (isset($data['employes'])) {
            $service->employes()->sync($data['employes']);
        }

        return response()->json($service->load('employes:id,nom,prenom'), 201);
    }

    public function show(Service $service): JsonResponse
    {
        return response()->json($service->load('employes:id,nom,prenom'));
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate($this->rules($service));
        $service->update(collect($data)->except('employes')->all());
        if (isset($data['employes'])) {
            $service->employes()->sync($data['employes']);
        }

        return response()->json($service->load('employes:id,nom,prenom'));
    }

    public function destroy(Service $service): JsonResponse
    {
        if ($service->visites()->exists()) {
            return response()->json([
                'message' => 'Ce service a déjà été réalisé : désactivez-le (actif = false) au lieu de le supprimer.',
            ], 409);
        }
        $service->delete();

        return response()->json(null, 204);
    }
}
