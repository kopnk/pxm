import type { AccessContext } from "~/server/utils/accessContext";
import type { RlsMatrix } from "~/lib/rls";

declare module "h3" {
  interface H3EventContext {
    accessContext?: AccessContext;
    user?: {
      id: string;
      email: string;
      role: string;
      isActive: boolean;
    };
    permissions?: RlsMatrix;
    rlsEnforced?: boolean;
    session?: unknown;
  }
}
