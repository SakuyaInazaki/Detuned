# M7.4-A v11 F1/F2 review

Static only; no checks or native execution. v10 review remains unchanged. Actual SHA256 matches: source a6f3a8069342647f326520d711198e4e30a0f380f95ac7b3c2c6fcd66ac4962c; freeze c3cd4dbaa9408899cfd67a729386bacac574c95f752b863defcb8d1e382e7d8d; delta 244e75b08face0e6b6e601f529a8f056ad0a593c509564beb3af04cefcc2e6a6.

F1 static closure: terminal is set synchronously on interruption, catch, and finally. Every initialization awaited boundary is followed by gate; allocation/fork/bootstrap/native ACK/MCP ACK are gated. Observer waits race interruption. The separately retained initializer has rejection observation and finite cleanup settlement; unconfirmed settlement forces worker/group closure false and failure. A late directory allocation continuation can only attempt removal and throw after terminal, not fork/bootstrap.

F2 static closure: allocatedRoot is assigned before realpath; cleanup uses canonical or exact allocated fallback with absence check. Failed canonicalization no longer loses the known allocated path. Original error remains priority; unverified cleanup is not passed.

No additional actionable defect found in this F1/F2 delta. This is not runtime acceptance. D F3 capture was still the old v10-bound source at inspection: lines 41/42/47 unbounded close awaits remain pending a separate final revision. No combined release conclusion yet. Required controlled rejection, never-resolve, and SIGTERM must occur after worker_registered registry acknowledgement but before callback completion/bootstrap; assertion must prove no native/MCP registration and actual worker/group absence.
