"use client";

import { ProtectedRoute } from "@/components/protected-route";
import MediaMTXDashboard from "./MediaMTXDashboard";

export default function Page() {
  return (
    <ProtectedRoute>
      <MediaMTXDashboard />
    </ProtectedRoute>
  );
}