// Sending the solve log's file: on a phone or tablet through the share sheet, where the browser can share files,
// and otherwise as a download. The file is made when the dialog opens, so the Share tap calls the share sheet at
// once, inside the tap; while the sheet is open, another tap is ignored rather than starting a second share,
// which the browser would refuse.

export interface ShareDeps {
  /** Whether the main pointer is a finger: a phone or a tablet. */
  coarse: () => boolean;
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  download: (file: File) => void;
}

export interface FileSharer {
  /** The file the next send sends. */
  prepare(file: File): void;
  /** Sends the prepared file; settles once the share sheet is closed or the download started. */
  send(): Promise<void>;
}

export function fileSharer(deps: ShareDeps): FileSharer {
  let file: File | null = null;
  let sharing = false;
  return {
    prepare(f) {
      file = f;
    },
    send() {
      if (!file || sharing) return Promise.resolve();
      const f = file;
      if (deps.coarse() && deps.share && deps.canShare?.({ files: [f] })) {
        sharing = true;
        return deps
          .share({ files: [f], title: 'Pixel Peel solve log' })
          .catch((e: unknown) => {
            // Cancelled by the player: nothing to do. Anything else: the file is downloaded instead.
            if ((e as Error).name !== 'AbortError') deps.download(f);
          })
          .finally(() => {
            sharing = false;
          });
      }
      deps.download(f);
      return Promise.resolve();
    },
  };
}
