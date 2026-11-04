<?php

namespace App\Http\Controllers\Api;

use App\Enums\TypeDepense;
use App\Http\Controllers\Controller;
use App\Models\Depense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepenseController extends Controller
{
    private function rules(bool $update = false): array
    {
        $req = $update ? 'sometimes|required' : 'required';

        return [
            'type_depense' => [$update ? 'sometimes' : 'required', Rule::enum(TypeDepense::class)],
            'description' => 'nullable|string|max:255',
            'montant' => "$req|numeric|min:0.01",
            'date_depense' => "$req|date",
        ];
    }

    /** Filtres : ?type_depense=, ?debut=, ?fin= — renvoie aussi le total de la sélection. */
    public function index(Request $request): JsonResponse
    {
        $query = Depense::query()
            ->when($request->type_depense, fn ($q, $v) => $q->where('type_depense', $v))
            ->when($request->debut, fn ($q, $v) => $q->whereDate('date_depense', '>=', $v))
            ->when($request->fin, fn ($q, $v) => $q->whereDate('date_depense', '<=', $v));

        $total = round((float) (clone $query)->sum('montant'), 2);
        $depenses = $query->orderByDesc('date_depense')->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json(['total_selection' => $total, 'depenses' => $depenses]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Depense::create($request->validate($this->rules())), 201);
    }

    public function show(Depense $depense): JsonResponse
    {
        return response()->json($depense);
    }

    public function update(Request $request, Depense $depense): JsonResponse
    {
        $depense->update($request->validate($this->rules(true)));

        return response()->json($depense);
    }

    public function destroy(Depense $depense): JsonResponse
    {
        $depense->delete();

        return response()->json(null, 204);
    }
}
