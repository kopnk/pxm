const DEFAULT_AVATAR = "/default-avatar.svg";
/** Legacy placeholder stored by an old profile form. */
const LEGACY_PLACEHOLDER = "http://profile/update";

export function resolveAvatarUrl(url?: string | null): string {
  return !url || url === LEGACY_PLACEHOLDER ? DEFAULT_AVATAR : url;
}
