<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    /** Sous-requête SQL : total déjà payé pour la visite de la facture. */
    public const PAYE_SQL = '(select coalesce(sum(p.montant), 0) from paiements p where p.visite_id = factures.visite_id)';

    protected $fillable = ['visite_id', 'numero', 'date_facture', 'montant_total'];

    protected $casts = ['montant_total' => 'decimal:2'];

    protected $appends = ['montant_paye', 'reste_a_payer', 'statut'];

    public function visite(): BelongsTo
    {
        return $this->belongsTo(Visite::class);
    }

    public function paiements(): HasMany
    {
        return $this->hasMany(Paiement::class, 'visite_id', 'visite_id');
    }

    public function getMontantPayeAttribute(): float
    {
        // utilise withSum('paiements', 'montant') s'il a été demandé (évite le N+1)
        $somme = $this->paiements_sum_montant ?? $this->paiements()->sum('montant');

        return round((float) $somme, 2);
    }

    public function getResteAPayerAttribute(): float
    {
        return round(max(0, (float) $this->montant_total - $this->montant_paye), 2);
    }

    public function getStatutAttribute(): string
    {
        if ($this->montant_paye <= 0) {
            return 'non_payee';
        }

        return $this->montant_paye >= (float) $this->montant_total ? 'payee' : 'partielle';
    }

    public function scopeStatut(Builder $query, ?string $statut): Builder
    {
        return match ($statut) {
            'payee' => $query->whereRaw(self::PAYE_SQL.' >= factures.montant_total'),
            'non_payee' => $query->whereRaw(self::PAYE_SQL.' <= 0'),
            'partielle' => $query->whereRaw(self::PAYE_SQL.' > 0')->whereRaw(self::PAYE_SQL.' < factures.montant_total'),
            default => $query,
        };
    }

    /** Stocke la date au format Y-m-d (sans heure) pour que les comparaisons SQL restent fiables. */
    protected function dateFacture(): Attribute
    {
        return Attribute::make(set: fn ($v) => $v ? Carbon::parse($v)->toDateString() : null);
    }
}
