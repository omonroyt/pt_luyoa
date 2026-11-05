"use client";

/**
 * ES: Encabezado del chat: la marca de Café Alborada y los botones que abren el panel de
 *     preferencias, el de trazas y el cambio de tema. Queda fijo arriba con fondo sólido
 *     y una línea inferior que lo separa del hilo al desplazarse.
 * EN: Chat header: the Café Alborada brand and the buttons that open the preferences
 *     panel, the trace panel and the theme switch. It stays pinned at the top with a solid
 *     background and a bottom rule that separates it from the thread while scrolling.
 */
import { BrandMark } from "@/components/ui/brand-mark";
import { Icon, type IconName } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type ChatHeaderProps = {
  traceAvailable: boolean;
  onShowPreferences: () => void;
  onShowTrace: () => void;
};

type HeaderButtonProps = {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function HeaderButton({ icon, label, onClick, disabled = false }: HeaderButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/70 px-3 text-sm font-medium text-muted transition hover:text-foreground hover:shadow-soft disabled:pointer-events-none disabled:opacity-45 sm:px-4"
    >
      <Icon name={icon} className="size-4" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}

export function ChatHeader({ traceAvailable, onShowPreferences, onShowTrace }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <BrandMark
          size={40}
          priority
          className="-my-1 -rotate-6 drop-shadow-[0_4px_6px_rgb(0_0_0/0.15)] transition-transform duration-500 hover:rotate-6"
        />
        <div className="leading-tight">
          <h1 className="font-display text-xl font-semibold tracking-tight">Café Alborada</h1>
          <p className="text-xs text-muted">Copiloto de tu negocio</p>
        </div>
      </div>
      <nav className="flex items-center gap-2" aria-label="Paneles">
        <HeaderButton icon="sliders" label="Preferencias" onClick={onShowPreferences} />
        <HeaderButton
          icon="activity"
          label="Trazas"
          onClick={onShowTrace}
          disabled={!traceAvailable}
        />
        <ThemeToggle />
      </nav>
    </header>
  );
}
