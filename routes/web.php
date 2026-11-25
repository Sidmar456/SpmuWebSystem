<?php

use Illuminate\Support\Facades\Route;

// JSON API. Each module keeps its routes in app/Modules/<Module>/routes.php.
Route::prefix('api')->group(function () {
    foreach (glob(app_path('Modules/*/routes.php')) as $routes) {
        require $routes;
    }
});

// Every other path is a React screen; React Router decides what to show.
Route::view('/{path?}', 'app')->where('path', '^(?!api/|api$|storage/|build/).*');
