import { type ArtifactContentQuery, type ArtifactContentPage } from '@detuned/protocol';
import type { ArtifactDownload } from './artifact-transfer.js';
/** Entire blob has already passed length/MIME/EOF/SHA verification; return one bounded JSON slice. */
export declare function artifactContentPage(download: ArtifactDownload, query: ArtifactContentQuery): ArtifactContentPage;
//# sourceMappingURL=artifact-content.d.ts.map