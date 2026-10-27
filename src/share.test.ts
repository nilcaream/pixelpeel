import { describe, expect, it } from 'vitest';
import { fileSharer, type ShareDeps } from './share.ts';

function rig(coarse: boolean, outcome: 'ok' | 'AbortError' | 'NotAllowedError' = 'ok') {
  const calls: string[] = [];
  let settle: () => void = () => {};
  const deps: ShareDeps = {
    coarse: () => coarse,
    canShare: (d) => !!d.files?.length,
    share: () => {
      calls.push('share');
      return new Promise<void>((resolve, reject) => {
        settle = () => (outcome === 'ok' ? resolve() : reject(Object.assign(new Error(outcome), { name: outcome })));
      });
    },
    download: (f) => void calls.push(`download ${f.name}`),
  };
  return { calls, sharer: fileSharer(deps), settle: () => settle() };
}

const FILE = new File(['log'], 'pixelpeel-solve-log.txt', { type: 'text/plain' });

describe('file sharer', () => {
  it('opens the share sheet within the tap itself, with nothing awaited before it', () => {
    const { calls, sharer } = rig(true);
    sharer.prepare(FILE);
    void sharer.send();
    expect(calls).toEqual(['share']);
  });

  it('ignores a second tap while the share sheet is open, and shares again once it closed', async () => {
    const { calls, sharer, settle } = rig(true);
    sharer.prepare(FILE);
    const first = sharer.send();
    void sharer.send();
    expect(calls).toEqual(['share']);
    settle();
    await first;
    void sharer.send();
    expect(calls).toEqual(['share', 'share']);
  });

  it('downloads on a desktop, and when a share fails for any reason but cancelling', async () => {
    const desk = rig(false);
    desk.sharer.prepare(FILE);
    await desk.sharer.send();
    expect(desk.calls).toEqual(['download pixelpeel-solve-log.txt']);
    for (const [outcome, after] of [['AbortError', []], ['NotAllowedError', ['download pixelpeel-solve-log.txt']]] as const) {
      const phone = rig(true, outcome);
      phone.sharer.prepare(FILE);
      const sent = phone.sharer.send();
      phone.settle();
      await sent;
      expect(phone.calls).toEqual(['share', ...after]);
    }
  });

  it('sends nothing before a file is prepared', async () => {
    const { calls, sharer } = rig(true);
    await sharer.send();
    expect(calls).toEqual([]);
  });
});
