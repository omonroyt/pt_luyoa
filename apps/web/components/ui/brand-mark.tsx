/**
 * ES: Marca de Café Alborada: una taza de café en 3D, sin recuadro. La ilustración es
 *     "Hot beverage" de Fluent Emoji (Microsoft, licencia MIT) recoloreada al terracota
 *     de la paleta. Es decorativa: el nombre del negocio va en texto al lado.
 * EN: Café Alborada brand mark: a 3D coffee cup, with no frame. The illustration is
 *     "Hot beverage" from Fluent Emoji (Microsoft, MIT license) recolored to the palette's
 *     terracotta. It is decorative: the business name is given as text next to it.
 */
import Image from "next/image";

type BrandMarkProps = { size: number; className?: string; priority?: boolean };

export function BrandMark({ size, className = "", priority = false }: BrandMarkProps) {
  return (
    <Image
      src="/brand/taza-cafe.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
