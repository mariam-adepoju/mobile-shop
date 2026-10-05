/** Poll only while the cart route is focused and the app is in the foreground. */
export function shouldPollCart(isFocused: boolean, isAppActive: boolean): boolean {
  return isFocused && isAppActive;
}
