/**
 * Host half of the dsh-multiview bundle.
 *
 * The multiview surface is client-owned: layout state is per-device UI state and
 * the panes are the shipped Conversation rendered through public slots. The Host
 * therefore contributes exactly one activatable loader row — no service, no
 * listening port, no filesystem or credential access.
 *
 * @returns {void}
 */
export function apply() {}
