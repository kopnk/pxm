import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const KOPINDOSAT_LOGO_CANDIDATES = [
  join(process.cwd(), "public", "kopindosat.JPG"),
  join(process.cwd(), "public", "kopindosat.jpg"),
];

export function readKopindosatLogoBuffer(): Buffer | null {
  const logoPath = KOPINDOSAT_LOGO_CANDIDATES.find((path) => existsSync(path));
  return logoPath ? readFileSync(logoPath) : null;
}
