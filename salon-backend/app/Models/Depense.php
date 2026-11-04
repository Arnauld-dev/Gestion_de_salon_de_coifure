<?php

namespace App\Models;

use App\Enums\TypeDepense;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Depense extends Model
{
    protected $fillable = ['type_depense', 'description', 'montant', 'date_depense'];

    protected $casts = [
        'type_depense' => TypeDepense::class,
        'montant' => 'decimal:2',
    ];

    /** Stocke la date au format Y-m-d (sans heure) pour que les comparaisons SQL restent fiables. */
    protected function dateDepense(): Attribute
    {
        return Attribute::make(set: fn ($v) => $v ? Carbon::parse($v)->toDateString() : null);
    }
}
