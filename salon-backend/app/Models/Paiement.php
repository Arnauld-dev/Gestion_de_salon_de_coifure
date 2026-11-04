<?php

namespace App\Models;

use App\Enums\ModePaiement;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Paiement extends Model
{
    protected $fillable = ['visite_id', 'montant', 'mode_paiement', 'date_paiement', 'reference'];

    protected $casts = [
        'montant' => 'decimal:2',
        'mode_paiement' => ModePaiement::class,
    ];

    public function visite(): BelongsTo
    {
        return $this->belongsTo(Visite::class);
    }

    public function facture(): HasOne
    {
        return $this->hasOne(Facture::class, 'visite_id', 'visite_id');
    }

    /** Stocke la date au format Y-m-d (sans heure) pour que les comparaisons SQL restent fiables. */
    protected function datePaiement(): Attribute
    {
        return Attribute::make(set: fn ($v) => $v ? Carbon::parse($v)->toDateString() : null);
    }
}
