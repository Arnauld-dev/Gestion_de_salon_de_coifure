<?php

namespace App\Enums;

enum TypeDepense: string
{
    case Loyer = 'loyer';
    case Electricite = 'electricite';
    case Produits = 'produits';
    case Salaires = 'salaires';
    case Autre = 'autre';
}
