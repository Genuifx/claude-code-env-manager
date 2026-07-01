export type QuerySnapshot<QueryHandle, InputQueue> = {
  query: QueryHandle;
  inputQueue: InputQueue | null;
  generation: number;
};

export class QuerySnapshotSlot<QueryHandle, InputQueue> {
  private currentSnapshot: QuerySnapshot<QueryHandle, InputQueue> | null = null;
  private generationCounter = 0;

  activate(query: QueryHandle, inputQueue: InputQueue | null) {
    const snapshot = {
      query,
      inputQueue,
      generation: ++this.generationCounter,
    };
    this.currentSnapshot = snapshot;
    return snapshot;
  }

  capture() {
    return this.currentSnapshot;
  }

  isCurrent(
    snapshot: QuerySnapshot<QueryHandle, InputQueue> | null | undefined,
  ): snapshot is QuerySnapshot<QueryHandle, InputQueue> {
    return snapshot != null && this.currentSnapshot === snapshot;
  }

  clearIfCurrent(snapshot: QuerySnapshot<QueryHandle, InputQueue> | null | undefined) {
    if (!this.isCurrent(snapshot)) {
      return false;
    }

    this.currentSnapshot = null;
    return true;
  }

  clear() {
    this.currentSnapshot = null;
  }
}
