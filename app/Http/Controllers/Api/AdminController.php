<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        $stats = User::select([
            DB::raw('COUNT(*) as total_users'),
            DB::raw('SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_users'),
        ])->first();

        return response()->json([
            'total_users' => (int) $stats->total_users,
            'admin_users' => (int) $stats->admin_users,
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
