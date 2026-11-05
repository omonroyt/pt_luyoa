/**
 * ES: Página de entrada a la demo publicada (IMP-63). Si la demo no tiene código de acceso
 *     (desarrollo local), lleva directo al chat.
 * EN: Published demo entry page (IMP-63). If the demo has no access code (local
 *     development), it goes straight to the chat.
 */
import { redirect } from "next/navigation";
import { AccessForm } from "@/components/access/access-form";
import { BrandMark } from "@/components/ui/brand-mark";
import { isDemoProtected } from "@/lib/auth/demo-session";
import { serverConfig } from "@/lib/server-config";

export const dynamic = "force-dynamic";

export default function AccessPage() {
  if (!isDemoProtected(serverConfig().businesses)) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark
          size={96}
          priority
          className="animate-float drop-shadow-[0_14px_18px_rgb(120_45_10/0.22)]"
        />
        <div className="flex animate-rise flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Café Alborada</h1>
          <p className="text-pretty text-muted">
            Copiloto de negocio. Escribe el código de acceso que recibiste para entrar a la demo.
          </p>
        </div>
      </div>
      <AccessForm />
    </main>
  );
}
