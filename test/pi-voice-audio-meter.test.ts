import assert from "node:assert/strict";
import { test } from "bun:test";
import { METER_CELLS, rmsFromPcm16, rmsToBlock } from "../packages/pi-voice/audio-meter.ts";

test("audio meter computes PCM16 RMS and maps silence through speech levels", () => {
	const pcm = Buffer.alloc(4);
	pcm.writeInt16LE(32767, 0);
	pcm.writeInt16LE(-32768, 2);
	assert.equal(METER_CELLS, 6);
	assert.ok(rmsFromPcm16(pcm) > 0.999);
	assert.equal(rmsFromPcm16(Buffer.alloc(0)), 0);
	assert.equal(rmsToBlock(0), "▁");
	assert.equal(rmsToBlock(0.001), "▁");
	assert.equal(rmsToBlock(0.01), "▂");
	assert.equal(rmsToBlock(0.1), "▆");
	assert.equal(rmsToBlock(1), "█");
});
