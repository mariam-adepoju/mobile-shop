/** Poll only while the cart route is focused and the app is in the foreground. */
export function shouldPollCart(isFocused: boolean, isAppActive: boolean): boolean {
  return isFocused && isAppActive;
}

/** Refetch once on an offline to online transition while the app is active. */
export function shouldRefetchOnReconnect(wasOnline: boolean, isOnline: boolean, isAppActive: boolean): boolean {
  return !wasOnline && isOnline && isAppActive;
}
