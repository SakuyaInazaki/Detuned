import { DetunedError, ErrorCode } from '@detuned/protocol';

/** Owners finish only after their complete async finally; sockets are not ownership. */
export class RuntimeResources {
  private isClosing = false;
  private cancelFailed = false;
  private readonly active = new Set<() => void>();
  private idle: Promise<void> | undefined;
  private resolveIdle: (() => void) | undefined;
  get closing(): boolean { return this.isClosing; }
  get activeCount(): number { return this.active.size; }
  acquire(cancel: () => void): () => void {
    if (this.isClosing) throw new DetunedError(ErrorCode.SERVICE_NOT_READY,'服务正在关闭。',503,true);
    // A distinct wrapper gives even identical callback functions independent leases.
    const entry = () => cancel();
    this.active.add(entry);
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.active.delete(entry);
      if (this.isClosing && this.active.size === 0) this.resolveIdle?.();
    };
  }
  beginClosing(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    for (const cancel of [...this.active]) {
      try { cancel(); } catch { this.cancelFailed = true; }
    }
  }
  async waitForIdle(): Promise<void> {
    if (!this.isClosing) throw new Error('活动资源尚未开始关闭。');
    if (this.active.size !== 0) {
      this.idle ??= new Promise<void>(resolve => { this.resolveIdle = resolve; });
      await this.idle;
    }
    if (this.cancelFailed) throw new Error('活动资源取消失败。');
  }
}
