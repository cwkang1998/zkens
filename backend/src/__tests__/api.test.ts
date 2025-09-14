import crypto from 'crypto';
import type { Request, Response } from 'express';
import {
  resolveStealthHandler,
  deriveStealthHandler,
  getAnnouncementsHandler,
  poolDepositHandler,
  poolStateHandler,
  poolSweepHandler
} from '../index';

function sha256Hex(hex: string): string {
  return crypto.createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');
}

function poseidon2SimHex(inputs: string[]): string {
  return sha256Hex(inputs.join(''));
}

function mockReqRes({ params = {}, body = {} as any }: { params?: any; body?: any }) {
  const req = { params, body } as unknown as Request;
  let statusCode = 200;
  let jsonBody: any;
  const res = {
    status(code: number) {
      statusCode = code;
      return this as unknown as Response;
    },
    json(data: any) {
      jsonBody = data;
      return this as unknown as Response;
    }
  } as unknown as Response & { _getStatus: () => number; _getJSON: () => any };
  (res as any)._getStatus = () => statusCode;
  (res as any)._getJSON = () => jsonBody;
  return { req, res };
}

describe('Handlers', () => {
  it('resolves meta-address', async () => {
    const { req, res } = mockReqRes({ params: { ensName: 'alice.eth' } });
    resolveStealthHandler(req, res);
    const body = (res as any)._getJSON();
    expect((res as any)._getStatus()).toBe(200);
    expect(body.metaAddress).toHaveProperty('pSpend');
    expect(body.metaAddress).toHaveProperty('pView');
  });

  it('derives announcement with aligned aStealth and viewTag', async () => {
    const r1 = mockReqRes({ params: { ensName: 'bob.eth' } });
    resolveStealthHandler(r1.req, r1.res);
    const meta = (r1.res as any)._getJSON().metaAddress;
    const r2 = mockReqRes({ body: { ensName: 'bob.eth', metaAddress: meta } });
    deriveStealthHandler(r2.req, r2.res);
    const ann = (r2.res as any)._getJSON();
    expect(ann).toHaveProperty('aStealth');
    expect(ann).toHaveProperty('R');
    const expectAStealth = poseidon2SimHex([meta.pSpend, meta.pView, ann.R]);
    const expectTag = poseidon2SimHex([meta.pView, ann.R]).slice(0, 2);
    expect(ann.aStealth).toBe(expectAStealth);
    expect(ann.viewTag).toBe(expectTag);
    expect(ann.stealthAddress).toBe('0x' + expectAStealth.slice(0, 40));
  });

  it('filters announcements by recomputed viewTag and pView', async () => {
    const rr = mockReqRes({ params: { ensName: 'charlie.eth' } });
    resolveStealthHandler(rr.req, rr.res);
    const meta = (rr.res as any)._getJSON().metaAddress;
    const d = mockReqRes({ body: { ensName: 'charlie.eth', metaAddress: meta } });
    deriveStealthHandler(d.req, d.res);
    const ann = (d.res as any)._getJSON();

    const r3 = mockReqRes({ params: { viewTag: ann.viewTag, pView: meta.pView } });
    getAnnouncementsHandler(r3.req, r3.res);
    const hits = (r3.res as any)._getJSON();
    expect(Array.isArray(hits)).toBe(true);
    const found = hits.find((a: any) => a.id === ann.id);
    expect(found).toBeTruthy();

    const wrongTag = ann.viewTag === '00' ? 'ff' : '00';
    const r4 = mockReqRes({ params: { viewTag: wrongTag, pView: meta.pView } });
    getAnnouncementsHandler(r4.req, r4.res);
    const misses = (r4.res as any)._getJSON();
    const notFound = (misses as any[]).find((a: any) => a.id === ann.id);
    expect(notFound).toBeUndefined();
  });

  it('deposits to pool and reflects in state', async () => {
    const rr = mockReqRes({ params: { ensName: 'dana.eth' } });
    resolveStealthHandler(rr.req, rr.res);
    const meta = (rr.res as any)._getJSON().metaAddress;
    const d = mockReqRes({ body: { ensName: 'dana.eth', metaAddress: meta } });
    deriveStealthHandler(d.req, d.res);
    const ann = (d.res as any)._getJSON();

    const dep = mockReqRes({ body: { announcementId: ann.id, value: 5 } });
    poolDepositHandler(dep.req, dep.res);
    expect((dep.res as any)._getStatus()).toBe(200);
    const st = mockReqRes({});
    poolStateHandler(st.req, st.res);
    const state = (st.res as any)._getJSON();
    expect(state.total).toBeGreaterThanOrEqual(5);
    const note = state.commitments.find((c: any) => c.stealthAddress === ann.stealthAddress);
    expect(note).toBeTruthy();
    expect(note.spent).toBe(false);
  });

  it('sweeps notes for a given pView to a main address', async () => {
    const rr = mockReqRes({ params: { ensName: 'erin.eth' } });
    resolveStealthHandler(rr.req, rr.res);
    const meta = (rr.res as any)._getJSON().metaAddress;
    const d = mockReqRes({ body: { ensName: 'erin.eth', metaAddress: meta } });
    deriveStealthHandler(d.req, d.res);
    const ann = (d.res as any)._getJSON();
    const dep = mockReqRes({ body: { announcementId: ann.id, value: 7 } });
    poolDepositHandler(dep.req, dep.res);

    const sw = mockReqRes({ body: { pView: meta.pView, mainAddress: '0xabc' } });
    poolSweepHandler(sw.req, sw.res);
    const sweep = (sw.res as any)._getJSON();
    expect(sweep.swept).toBeGreaterThanOrEqual(7);
    expect(Array.isArray(sweep.transfers)).toBe(true);
    // verify state shows notes as spent
    const st = mockReqRes({});
    poolStateHandler(st.req, st.res);
    const state = (st.res as any)._getJSON();
    const spentNote = state.commitments.find((c: any) => c.stealthAddress === ann.stealthAddress);
    expect(spentNote.spent).toBe(true);
  });
});
