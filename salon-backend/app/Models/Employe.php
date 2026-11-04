<?php

namespace App\Models;

use App\Enums\Poste;
use App\Enums\TypeRemuneration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employe extends Model
{
    protected $fillable = [
        'nom', 'prenom', 'telephone', 'adresse', 'poste', 'specialites', 'horaires',
        'type_remuneration', 'salaire_ou_commission', 'actif',
    ];

    protected $casts = [
        'poste' => Poste::class,
        'type_remuneration' => TypeRemuneration::class,
        'salaire_ou_commission' => 'decimal:2',
        'actif' => 'boolean',
    ];

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'employe_service');
    }

    public function conges(): HasMany
    {
        return $this->hasMany(Conge::class);
    }

    public function visites(): HasMany
    {
        return $this->hasMany(Visite::class);
    }

    public function estEnConge(string $date): bool
    {
        return $this->conges()
            ->whereDate('date_debut', '<=', $date)
            ->whereDate('date_fin', '>=', $date)
            ->exists();
    }
}
