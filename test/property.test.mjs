/**
 * Property tests for the two helpers added in 0.1.67 / 0.1.68.
 *
 * Examples cover the cases I thought of; properties cover the ones I did not. Inputs are generated
 * from a seeded PRNG so a failure is reproducible.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mvMergeSearchRows, mvTrimViews } from '../src/client/model.ts'

/** Deterministic 32-bit LCG: same seed, same sequence, so a failure is reproducible. */
function makeRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const pick = (random, list) => list[Math.floor(random() * list.length) % list.length]

test('merging search hits never duplicates, invents or loses a title match', () => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const random = makeRandom(seed)
    const universe = Array.from({ length: 6 }, (_, index) => 's' + index)
    const titles = new Map(universe.map((id) => [id, 'T' + id]))
    const titleOf = (id) => titles.get(id) ?? null

    const rows = []
    for (const id of universe) {
      if (random() < 0.5) rows.push({ id, title: titles.get(id), depth: 0, owner: null, onStage: random() < 0.3 })
    }
    /* Hits include unknown ids on purpose: the picker must not offer a session it cannot open. */
    const hits = Array.from({ length: Math.floor(random() * 5) }, () => ({
      sessionId: random() < 0.2 ? 'ghost' : pick(random, universe),
      snippet: random() < 0.5 ? 'snip' : '',
    }))
    const cap = 1 + Math.floor(random() * 8)

    const out = mvMergeSearchRows(rows.map((row) => ({ ...row })), hits, titleOf, cap)

    assert.ok(out.length <= cap, `seed ${seed}: the cap is respected`)
    const ids = out.map((row) => row.id)
    assert.equal(new Set(ids).size, ids.length, `seed ${seed}: no duplicate rows`)
    assert.ok(!ids.includes('ghost'), `seed ${seed}: a hit for an unknown session is dropped`)
    for (const row of out) {
      assert.equal(typeof row.title, 'string', `seed ${seed}: every row has a title`)
    }
    /* Title matches keep their order and survive unless the cap cuts them off. */
    const kept = ids.filter((id) => rows.some((row) => row.id === id))
    assert.deepEqual(kept, rows.map((row) => row.id).filter((id) => kept.includes(id)), `seed ${seed}: title matches keep their order`)
    if (out.length < cap) {
      assert.equal(kept.length, rows.length, `seed ${seed}: no title match is lost below the cap`)
    }
  }
})

test('trimming the split library keeps its cap and never sacrifices a hand-written name', () => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const random = makeRandom(seed)
    const count = 1 + Math.floor(random() * 14)
    const candidates = Array.from({ length: count }, (_, index) => {
      const named = index !== 0 && random() < 0.4
      return { id: 'v' + index, customName: named ? 'name' + index : undefined }
    })
    const cap = 2 + Math.floor(random() * 11)
    const before = candidates.map((entry) => ({ ...entry }))

    const { views, keptNewcomer } = mvTrimViews(candidates, cap)
    const ids = views.map((entry) => entry.id)

    assert.ok(views.length <= cap, `seed ${seed}: the cap is respected`)
    assert.equal(new Set(ids).size, ids.length, `seed ${seed}: no duplicate entries`)
    if (count <= cap) {
      assert.equal(views.length, count, `seed ${seed}: a short library is untouched`)
      assert.equal(keptNewcomer, true, `seed ${seed}: the newcomer fits`)
    }
    if (!keptNewcomer) {
      assert.ok(!ids.includes('v0'), `seed ${seed}: a newcomer that does not fit is not stored`)
      assert.equal(views.length, Math.min(cap, count - 1), `seed ${seed}: the library keeps its size`)
    }
    if (keptNewcomer) {
      assert.ok(ids.includes('v0'), `seed ${seed}: the newcomer is kept`)
    }
    /* The rule that always holds: an evicted entry is unnamed, or it is the newcomer the library
       refused. A hand-written name is outranked only when the cap cannot hold every name. */
    const namedBefore = before.filter((entry) => entry.customName !== undefined)
    if (namedBefore.length <= cap) {
      for (const entry of before) {
        if (ids.includes(entry.id)) continue
        if (entry.id === 'v0' && !keptNewcomer) continue
        assert.equal(entry.customName, undefined, `seed ${seed}: named ${entry.id} must not be evicted`)
      }
    }

  }
})
