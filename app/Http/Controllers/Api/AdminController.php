<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        return response()->json([
            'total_users' => User::count(),
            'admin_users' => User::where('is_admin', true)->count(),
        ]);
    }

    public function users(Request $request)
    {
        $users = User::select('id', 'name', 'email', 'is_admin', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }
}
