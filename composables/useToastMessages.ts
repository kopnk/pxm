/**
 * Redaksi toast sukses standar FE (create / update / delete).
 * Pola tetap: `Success! {Entity} {created|updated|deleted}.`
 * Hanya nama entitas yang berbeda per modul.
 */

export const ToastEntity = {
  user: "User",
  client: "Client",
  partner: "Partner",
  dcn: "DCN",
  project: "Project",
  projectDetail: "Project detail",
  projectProgress: "Project progress",
  projectFinancial: "Project financial",
  profile: "Profile",
  password: "Password",
} as const;

export type ToastEntityKey = keyof typeof ToastEntity;

export function toastSuccessCreated(key: ToastEntityKey): string {
  return `Success! ${ToastEntity[key]} created.`;
}

export function toastSuccessUpdated(key: ToastEntityKey): string {
  return `Success! ${ToastEntity[key]} updated.`;
}

export function toastSuccessDeleted(key: ToastEntityKey): string {
  return `Success! ${ToastEntity[key]} deleted.`;
}

/** Ganti password lalu logout — tetap satu kalimat standar + instruksi singkat. */
export function toastPasswordChangedSignInAgain(): string {
  return "Success! Password updated. Please sign in again.";
}
