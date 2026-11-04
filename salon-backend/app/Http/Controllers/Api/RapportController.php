<?php

namespace App\Http\Controllers\Api;

use App\Enums\ModePaiement;
use App\Enums\TypeDepense;
use App\Enums\TypeRemuneration;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Facture;
use App\Models\Visite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Rapports de gestion (admin). "CA" = argent réellement encaissé (table paiements).
 * "Prestations" = valeur des services réalisés (table visites), qu'ils soient payés ou non.
 */
class RapportController extends Controller
{
    private function ca(string $debut, string $fin): float
    {
        return round((float) DB::table('paiements')->whereBetween('date_paiement', [$debut, $fin])->sum('montant'), 2);
    }

    private function depenses(string $debut, string $fin): float
    {
        return round((float) DB::table('depenses')->whereBetween('date_depense', [$debut, $fin])->sum('montant'), 2);
    }

    private function mois(Request $request): Carbon
    {
        $request->validate(['mois' => 'nullable|date_format:Y-m']);

        return Carbon::createFromFormat('!Y-m', $request->input('mois', now()->format('Y-m')))->startOfMonth();
    }

    /** Tableau de bord : indicateurs du jour et du mois courant. */
    public function dashboard(): JsonResponse
    {
        $today = now()->toDateString();
        $debut = now()->startOfMonth();
        $fin = now()->endOfMonth();
        $paye = Facture::PAYE_SQL;

        $impayes = DB::table('factures')
            ->whereRaw("$paye < factures.montant_total")
            ->selectRaw("COUNT(*) as nombre, COALESCE(SUM(factures.montant_total - $paye), 0) as reste")
            ->first();

        $caMois = $this->ca($debut->toDateString(), $fin->toDateString());
        $depMois = $this->depenses($debut->toDateString(), $fin->toDateString());

        return response()->json([
            'date' => $today,
            'ca_jour' => $this->ca($today, $today),
            'ca_mois' => $caMois,
            'depenses_mois' => $depMois,
            'resultat_mois' => round($caMois - $depMois, 2),
            'visites_jour' => Visite::whereDate('date_visite', $today)->count(),
            'visites_mois' => Visite::whereBetween('date_visite', [$debut, $fin])->count(),
            'clients_total' => Client::count(),
            'factures_impayees' => [
                'nombre' => (int) $impayes->nombre,
                'reste_a_encaisser' => round((float) $impayes->reste, 2),
            ],
        ]);
    }

    /** CA d'un jour : ?date=YYYY-MM-DD (aujourd'hui par défaut), avec répartition par mode de paiement. */
    public function jour(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $date = Carbon::parse($request->input('date', now()))->toDateString();

        return response()->json([
            'date' => $date,
            'chiffre_affaires' => $this->ca($date, $date),
            'nombre_paiements' => DB::table('paiements')->where('date_paiement', $date)->count(),
            'par_mode_paiement' => $this->parMode($date, $date),
            'depenses' => $this->depenses($date, $date),
        ]);
    }

    /** Bilan d'un mois : ?mois=YYYY-MM (mois courant par défaut). */
    public function mensuel(Request $request): JsonResponse
    {
        $debut = $this->mois($request);
        $fin = $debut->copy()->endOfMonth();
        $d = $debut->toDateString();
        $f = $fin->toDateString();

        $ca = $this->ca($d, $f);
        $dep = $this->depenses($d, $f);

        $parJour = DB::table('paiements')->whereBetween('date_paiement', [$d, $f])
            ->selectRaw('date_paiement as jour, SUM(montant) as total')
            ->groupBy('date_paiement')->orderBy('date_paiement')->get()
            ->map(fn ($r) => ['jour' => $r->jour, 'total' => round((float) $r->total, 2)]);

        $depParType = DB::table('depenses')->whereBetween('date_depense', [$d, $f])
            ->selectRaw('type_depense, SUM(montant) as total')->groupBy('type_depense')
            ->pluck('total', 'type_depense');

        $parService = DB::table('visites')
            ->join('services', 'services.id', '=', 'visites.service_id')
            ->whereBetween('visites.date_visite', [$debut, $fin])
            ->groupBy('services.id', 'services.nom_service')
            ->selectRaw('services.id, services.nom_service, COUNT(*) as nombre, SUM(visites.prix) as total')
            ->orderByDesc('total')->get()
            ->map(fn ($r) => [
                'service_id' => $r->id, 'service' => $r->nom_service,
                'nombre' => (int) $r->nombre, 'total_prestations' => round((float) $r->total, 2),
            ]);

        return response()->json([
            'mois' => $debut->format('Y-m'),
            'chiffre_affaires' => $ca,
            'depenses' => $dep,
            'resultat' => round($ca - $dep, 2),
            'nombre_visites' => Visite::whereBetween('date_visite', [$debut, $fin])->count(),
            'par_mode_paiement' => $this->parMode($d, $f),
            'depenses_par_type' => collect(TypeDepense::cases())->mapWithKeys(
                fn ($t) => [$t->value => round((float) ($depParType[$t->value] ?? 0), 2)]
            ),
            'ca_par_jour' => $parJour,
            'prestations_par_service' => $parService,
        ]);
    }

    /** Évolution sur une année : ?annee=2026 → CA, dépenses et résultat de chaque mois. */
    public function annuel(Request $request): JsonResponse
    {
        $request->validate(['annee' => 'nullable|integer|between:2000,2100']);
        $annee = (int) $request->input('annee', now()->year);
        $d = "$annee-01-01";
        $f = "$annee-12-31";

        $ca = DB::table('paiements')->whereBetween('date_paiement', [$d, $f])
            ->selectRaw('date_paiement as jour, SUM(montant) as total')->groupBy('date_paiement')->get()
            ->groupBy(fn ($r) => substr($r->jour, 0, 7))->map(fn ($g) => (float) $g->sum('total'));
        $dep = DB::table('depenses')->whereBetween('date_depense', [$d, $f])
            ->selectRaw('date_depense as jour, SUM(montant) as total')->groupBy('date_depense')->get()
            ->groupBy(fn ($r) => substr($r->jour, 0, 7))->map(fn ($g) => (float) $g->sum('total'));

        $mois = collect(range(1, 12))->map(function ($m) use ($annee, $ca, $dep) {
            $cle = sprintf('%d-%02d', $annee, $m);
            $c = round($ca[$cle] ?? 0, 2);
            $x = round($dep[$cle] ?? 0, 2);

            return ['mois' => $cle, 'chiffre_affaires' => $c, 'depenses' => $x, 'resultat' => round($c - $x, 2)];
        });

        return response()->json([
            'annee' => $annee,
            'chiffre_affaires' => round($mois->sum('chiffre_affaires'), 2),
            'depenses' => round($mois->sum('depenses'), 2),
            'resultat' => round($mois->sum('resultat'), 2),
            'mois' => $mois,
        ]);
    }

    /**
     * Activité et rémunération des employés sur un mois : ?mois=YYYY-MM.
     * Commission = taux × valeur des prestations réalisées ; salaire fixe = montant mensuel.
     */
    public function employes(Request $request): JsonResponse
    {
        $debut = $this->mois($request);
        $fin = $debut->copy()->endOfMonth();

        $lignes = DB::table('employes')
            ->leftJoin('visites', function ($j) use ($debut, $fin) {
                $j->on('visites.employe_id', '=', 'employes.id')
                    ->whereBetween('visites.date_visite', [$debut, $fin]);
            })
            ->groupBy('employes.id', 'employes.nom', 'employes.prenom', 'employes.poste', 'employes.type_remuneration', 'employes.salaire_ou_commission')
            ->selectRaw('employes.id, employes.nom, employes.prenom, employes.poste, employes.type_remuneration, employes.salaire_ou_commission, COUNT(visites.id) as nombre, COALESCE(SUM(visites.prix), 0) as total')
            ->orderByDesc('total')->get()
            ->map(function ($e) {
                $taux = (float) $e->salaire_ou_commission;
                $commission = $e->type_remuneration === TypeRemuneration::Commission->value;

                return [
                    'employe_id' => $e->id,
                    'employe' => trim("$e->prenom $e->nom"),
                    'poste' => $e->poste,
                    'nombre_visites' => (int) $e->nombre,
                    'total_prestations' => round((float) $e->total, 2),
                    'type_remuneration' => $e->type_remuneration,
                    'remuneration_due' => $commission ? round((float) $e->total * $taux, 2) : round($taux, 2),
                ];
            });

        return response()->json([
            'mois' => $debut->format('Y-m'),
            'total_remunerations' => round($lignes->sum('remuneration_due'), 2),
            'employes' => $lignes,
        ]);
    }

    /** Meilleurs clients (nombre de visites et montant dépensé) : ?limite=10, ?debut=, ?fin= */
    public function clientsFideles(Request $request): JsonResponse
    {
        $request->validate(['limite' => 'nullable|integer|between:1,100', 'debut' => 'nullable|date', 'fin' => 'nullable|date']);

        $rows = DB::table('visites')
            ->join('clients', 'clients.id', '=', 'visites.client_id')
            ->when($request->debut, fn ($q, $d) => $q->whereDate('visites.date_visite', '>=', $d))
            ->when($request->fin, fn ($q, $d) => $q->whereDate('visites.date_visite', '<=', $d))
            ->groupBy('clients.id', 'clients.nom', 'clients.prenom', 'clients.telephone')
            ->selectRaw('clients.id, clients.nom, clients.prenom, clients.telephone, COUNT(*) as nombre, SUM(visites.prix) as total, MAX(visites.date_visite) as derniere_visite')
            ->orderByDesc('total')->limit((int) $request->input('limite', 10))->get()
            ->map(fn ($r) => [
                'client_id' => $r->id, 'client' => trim("$r->prenom $r->nom"), 'telephone' => $r->telephone,
                'nombre_visites' => (int) $r->nombre, 'total_depense' => round((float) $r->total, 2),
                'derniere_visite' => $r->derniere_visite,
            ]);

        return response()->json($rows);
    }

    private function parMode(string $debut, string $fin): array
    {
        $rows = DB::table('paiements')->whereBetween('date_paiement', [$debut, $fin])
            ->selectRaw('mode_paiement, SUM(montant) as total')->groupBy('mode_paiement')
            ->pluck('total', 'mode_paiement');

        return collect(ModePaiement::cases())
            ->mapWithKeys(fn ($m) => [$m->value => round((float) ($rows[$m->value] ?? 0), 2)])
            ->all();
    }
}
