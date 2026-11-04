<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CongeController extends Controller
{
    /** Filtres : ?employe_id=, ?debut=, ?fin= (congés qui touchent la période) */
    public function index(Request $request): JsonResponse
    {
        $conges = Conge::with('employe:id,nom,prenom')
            ->when($request->employe_id, fn ($q, $id) => $q->where('employe_id', $id))
            ->when($request->debut, fn ($q, $d) => $q->whereDate('date_fin', '>=', $d))
            ->when($request->fin, fn ($q, $d) => $q->whereDate('date_debut', '<=', $d))
            ->orderByDesc('date_debut')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json($conges);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employe_id' => 'required|exists:employes,id',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_debut',
            'motif' => 'nullable|string|max:255',
        ]);
        $this->verifierChevauchement($data['employe_id'], $data['date_debut'], $data['date_fin']);

        return response()->json(Conge::create($data)->load('employe:id,nom,prenom'), 201);
    }

    public function show(Conge $conge): JsonResponse
    {
        return response()->json($conge->load('employe:id,nom,prenom'));
    }

    public function update(Request $request, Conge $conge): JsonResponse
    {
        $data = $request->validate([
            'date_debut' => 'sometimes|required|date',
            'date_fin' => 'sometimes|required|date',
            'motif' => 'nullable|string|max:255',
        ]);
        $debut = $data['date_debut'] ?? $conge->date_debut;
        $fin = $data['date_fin'] ?? $conge->date_fin;
        if ($fin < $debut) {
            throw ValidationException::withMessages(['date_fin' => 'La date de fin doit suivre la date de début.']);
        }
        $this->verifierChevauchement($conge->employe_id, $debut, $fin, $conge->id);

        $conge->update($data);

        return response()->json($conge->load('employe:id,nom,prenom'));
    }

    public function destroy(Conge $conge): JsonResponse
    {
        $conge->delete();

        return response()->json(null, 204);
    }

    private function verifierChevauchement(int|string $employeId, string $debut, string $fin, ?int $ignorerId = null): void
    {
        $existe = Conge::where('employe_id', $employeId)
            ->when($ignorerId, fn ($q) => $q->where('id', '!=', $ignorerId))
            ->whereDate('date_debut', '<=', $fin)
            ->whereDate('date_fin', '>=', $debut)
            ->exists();

        if ($existe) {
            throw ValidationException::withMessages(['date_debut' => 'Cet employé a déjà un congé sur cette période.']);
        }
    }
}
