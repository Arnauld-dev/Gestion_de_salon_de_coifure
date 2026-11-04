<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = ['nom_service', 'duree_minutes', 'prix', 'actif'];

    protected $casts = ['prix' => 'decimal:2', 'duree_minutes' => 'integer', 'actif' => 'boolean'];

    public function employes(): BelongsToMany
    {
        return $this->belongsToMany(Employe::class, 'employe_service');
    }

    public function visites(): HasMany
    {
        return $this->hasMany(Visite::class);
    }
}
