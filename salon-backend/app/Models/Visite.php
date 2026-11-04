<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Visite extends Model
{
    protected $fillable = ['client_id', 'employe_id', 'service_id', 'date_visite', 'prix', 'notes'];

    protected $casts = ['date_visite' => 'datetime', 'prix' => 'decimal:2'];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function facture(): HasOne
    {
        return $this->hasOne(Facture::class);
    }

    public function paiements(): HasMany
    {
        return $this->hasMany(Paiement::class);
    }
}
