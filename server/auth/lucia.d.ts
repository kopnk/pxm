/// <reference types="lucia" />

declare namespace Lucia {
  interface Register {
    Lucia: typeof import("./lucia").lucia;
    DatabaseUserAttributes: {
      email: string;
      role: string;
      isActive: boolean;
    };
  }
}
