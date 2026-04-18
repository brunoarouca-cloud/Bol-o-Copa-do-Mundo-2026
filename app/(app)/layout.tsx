import { AuthGate } from "@/components/auth-gate";
import { Navbar } from "@/components/navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
