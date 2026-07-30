export interface CollectiveCommitmentActionState {
  ok: boolean;
  message: string;
  commitmentId?: string;
}

export const EMPTY_COLLECTIVE_ACTION_STATE: CollectiveCommitmentActionState = {
  ok: false,
  message: "",
};
