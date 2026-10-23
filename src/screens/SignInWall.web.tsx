// Web has no sign-in wall: App.tsx's Gate sends every signed-out web visitor to
// the guest navigator, and web sign-in opens from the Profile tab (ProfileScreen
// imports SignInScreen itself, inside the navigator chunk). Resolving the wall
// to this module keeps SignInScreen, the shared UI barrel and React Navigation
// off the first-launch page. Reaching it would be a routing bug, so say so.
export default function SignInWall(_props: { onClose?: () => void; onGuest?: () => void }): never {
  throw new Error('The sign-in wall is native-only; web Gate routes to the guest navigator.');
}
