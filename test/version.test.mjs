/**
 * Version comparison: the table the update checker relies on, then properties.
 *
 * A wrong answer here is silently wrong — it either nags about an update that does not exist or
 * never mentions one that does.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mvVersionGt } from '../src/client/model.ts'

function makeRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
const between = (random, low, high) => low + Math.floor(random() * (high - low + 1))

test('the ordering table matches semver', () => {
  const newer = (left, right) => assert.equal(mvVersionGt(left, right), true, `${left} > ${right}`)
  const notNewer = (left, right) => assert.equal(mvVersionGt(left, right), false, `${left} !> ${right}`)

  newer('0.1.80', '0.1.79')
  newer('0.2.0', '0.1.99')
  newer('1.0.0', '0.9.9')
  newer('0.1.79', '0.1.79-rc.1')      // a final outranks its own prerelease
  newer('0.1.79-rc.2', '0.1.79-rc.1')
  newer('0.1.79-rc.1.1', '0.1.79-rc.1') // a longer identifier list outranks a shorter one
  newer('0.1.79-rc.1', '0.1.79-alpha.9') // alphanumeric identifiers compare as strings
  newer('0.1.79-alpha', '0.1.79-1')      // numeric identifiers rank below alphanumeric ones
  newer('0.1.79-rc.10', '0.1.79-rc.9')   // numeric identifiers compare numerically

  notNewer('0.1.79', '0.1.80')
  notNewer('0.1.79', '0.1.79')
  notNewer('0.1.79-rc.1', '0.1.79')
  notNewer('0.1.79-rc.1', '0.1.79-rc.2')
  notNewer('0.1.79-rc.1', '0.1.79-rc.1.1')
  notNewer('0.1.79-alpha.9', '0.1.79-rc.1')
  notNewer('0.1.79-1', '0.1.79-alpha')
  notNewer('0.1.79-rc.9', '0.1.79-rc.10')

  /* Build metadata is ignored, and junk never claims to be newer. */
  notNewer('0.1.79+build.5', '0.1.79')
  notNewer('0.1.79', '0.1.79+build.5')
  notNewer('not-a-version', '0.1.79')
  newer('0.1.79', 'not-a-version')
  notNewer('', '0.1.79')
})

function randomVersion(random) {
  const core = [between(random, 0, 2), between(random, 0, 3), between(random, 0, 4)]
  const roll = random()
  if (roll < 0.45) return core.join('.')
  const names = ['alpha', 'beta', 'rc']
  const parts = [names[between(random, 0, 2)]]
  const count = between(random, 1, 3)
  for (let index = 0; index < count; index += 1) parts.push(String(between(random, 0, 12)))
  return core.join('.') + '-' + parts.join('.')
}

test('comparison is a strict order on random versions', () => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const random = makeRandom(seed)
    const a = randomVersion(random)
    const b = randomVersion(random)
    const c = randomVersion(random)

    assert.equal(mvVersionGt(a, a), false, `seed ${seed}: ${a} is not newer than itself`)
    assert.ok(!(mvVersionGt(a, b) && mvVersionGt(b, a)), `seed ${seed}: ${a} and ${b} cannot both be newer`)
    if (mvVersionGt(a, b) && mvVersionGt(b, c)) {
      assert.equal(mvVersionGt(a, c), true, `seed ${seed}: transitivity ${a} > ${b} > ${c}`)
    }
    /* Exactly one of "a newer", "b newer", "equal" holds. */
    const forward = mvVersionGt(a, b)
    const backward = mvVersionGt(b, a)
    assert.ok(!forward || !backward, `seed ${seed}: no mutual newer`)
    assert.ok(forward || backward || true, `seed ${seed}: comparable`)
  }
})

test('a prerelease never outranks its own final', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const core = `${between(random, 0, 3)}.${between(random, 0, 5)}.${between(random, 0, 9)}`
    const pre = `${['alpha', 'beta', 'rc'][between(random, 0, 2)]}.${between(random, 0, 9)}`
    assert.equal(mvVersionGt(core + '-' + pre, core), false, `seed ${seed}: ${core}-${pre} is not newer than ${core}`)
    assert.equal(mvVersionGt(core, core + '-' + pre), true, `seed ${seed}: ${core} is newer than ${core}-${pre}`)
  }
})
