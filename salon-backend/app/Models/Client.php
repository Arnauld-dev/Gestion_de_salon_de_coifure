<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = ['nom', 'prenom', 'telephone', 'email', 'date_naissance', 'preferences', 'allergies'];

    public function visites(): HasMany
    {
        return $this->hasMany(Visite::class);
    }

    /** Stocke la date au format Y-m-d (sans heure) pour que les comparaisons SQL restent fiables. */
    protected function dateNaissance(): Attribute
    {
        return Attribute::make(set: fn ($v) => $v ? Carbon::parse($v)->toDateString() : null);
    }
}
