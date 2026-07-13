import {
  passwordChangedSignInAgainMessage,
  toastCrudSuccessMessage,
  type EntityMessageKey,
} from "~/lib/entityMessages";

export type ToastEntityKey = EntityMessageKey;

export function toastSuccessCreated(key: ToastEntityKey): string {
  return toastCrudSuccessMessage(key, "created");
}

export function toastSuccessUpdated(key: ToastEntityKey): string {
  return toastCrudSuccessMessage(key, "updated");
}

export function toastSuccessDeleted(key: ToastEntityKey): string {
  return toastCrudSuccessMessage(key, "deleted");
}

/** Change password, then prompt the user to sign in again. */
export function toastPasswordChangedSignInAgain(): string {
  return passwordChangedSignInAgainMessage();
}
