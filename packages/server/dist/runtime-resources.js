import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Owners finish only after their complete async finally; sockets are not ownership. */
export class RuntimeResources {
    isClosing = false;
    cancelFailed = false;
    active = new Set();
    idle;
    resolveIdle;
    get closing() { return this.isClosing; }
    get activeCount() { return this.active.size; }
    acquire(cancel) {
        if (this.isClosing)
            throw new DetunedError(ErrorCode.SERVICE_NOT_READY, '服务正在关闭。', 503, true);
        // A distinct wrapper gives even identical callback functions independent leases.
        const entry = () => cancel();
        this.active.add(entry);
        let finished = false;
        return () => {
            if (finished)
                return;
            finished = true;
            this.active.delete(entry);
            if (this.isClosing && this.active.size === 0)
                this.resolveIdle?.();
        };
    }
    beginClosing() {
        if (this.isClosing)
            return;
        this.isClosing = true;
        for (const cancel of [...this.active]) {
            try {
                cancel();
            }
            catch {
                this.cancelFailed = true;
            }
        }
    }
    async waitForIdle() {
        if (!this.isClosing)
            throw new Error('活动资源尚未开始关闭。');
        if (this.active.size !== 0) {
            this.idle ??= new Promise(resolve => { this.resolveIdle = resolve; });
            await this.idle;
        }
        if (this.cancelFailed)
            throw new Error('活动资源取消失败。');
    }
}
//# sourceMappingURL=runtime-resources.js.map