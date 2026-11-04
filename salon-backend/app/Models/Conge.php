<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Conge extends Model
{
    protected $fillable = ['employe_id', 'date_debut', 'date_fin', 'motif'];

    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class);
    }

    /** Stocke la date au format Y-m-d (sans heure) pour que les comparaisons SQL restent fiables. */
    protected function dateDebut(): Attribute
    {
        return Attribute::make(set: fn ($v) => $v ? Carbon::parse($v)->toDateString() : null);
    }

    /** Stocke la date au format Y-m-d (sans heure) pour que les comparaisons SQL restent fiables. */
    protected function dateFin(): Attribute
    {
        return Attribute::make(set: fn ($v) => $v ? Carbon::parse($v)->toDateString() : null);
    }
}
