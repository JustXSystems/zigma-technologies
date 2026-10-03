/** Returned by admin save APIs when a slug edit redirected the old public address. */
export type MovedAddress = { from: string; to: string } | null | undefined;

/** Sentence appended to a save message, or '' when nothing moved. */
export function movedAddressNote(redirect: MovedAddress) {
  return redirect ? ` The old address ${redirect.from} now redirects to ${redirect.to}.` : '';
}
