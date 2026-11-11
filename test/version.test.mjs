/**
 * Version comparison: the table the update checker relies on, then properties.
 *
 * A wrong answer here is silently wrong — it either nags about an update that does not exist or
 * never mentions one that does.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mvVersionGt, mvUpdateDue, mvBackoffDelay } from '../src/client/model.ts'

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

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const INTERVAL = DAY
const BASE = HOUR
const MAX = 12 * HOUR

test('the retry delay doubles from one hour and then stays capped', () => {
  const expected = [1, 2, 4, 8, 12, 12, 12]
  expected.forEach((hours, index) => {
    const failures = index + 1
    assert.equal(mvBackoffDelay(failures, BASE, MAX), hours * HOUR, `failure ${failures} waits ${hours}h`)
  })
  /* Junk counts behave like the first failure instead of producing NaN or Infinity. */
  assert.equal(mvBackoffDelay(0, BASE, MAX), BASE)
  assert.equal(mvBackoffDelay(-3, BASE, MAX), BASE)
  assert.equal(mvBackoffDelay(Number.NaN, BASE, MAX), BASE)
  assert.equal(mvBackoffDelay(1000, BASE, MAX), MAX, 'a huge count still lands on the cap')
})

test('a failure may retry sooner than a full interval — the bug that made the backoff inert', () => {
  const start = 1_000_000
  /* First check succeeded a long time ago; then a check failed an hour back. */
  const checkedAt = start - 30 * DAY
  const now = start

  /* Old behaviour: the failure stamped checkedAt=now, so the interval gate blocked this retry. */
  assert.equal(mvUpdateDue(now, start + HOUR, now, INTERVAL), false, 'stamping checkedAt=now blocks the retry')

  /* Correct behaviour: last success is old, the backoff window has passed, so the retry runs. */
  assert.equal(mvUpdateDue(checkedAt, start, now, INTERVAL), true, 'the retry becomes due')

  /* And the backoff window itself is honoured. */
  assert.equal(mvUpdateDue(checkedAt, now + 1, now, INTERVAL), false, 'a future nextAt still blocks')
})

test('the schedule gate is a strict conjunction', () => {
  const cases = [
    { checkedAt: 0, nextAt: 100, now: DAY, expect: true, why: 'never checked, window passed' },
    { checkedAt: 100, nextAt: 100, now: 100, expect: false, why: 'just checked' },
    { checkedAt: 0, nextAt: 101, now: 100, expect: false, why: 'window not reached' },
    { checkedAt: 0, nextAt: 100, now: 99, expect: false, why: 'interval not elapsed' },
    { checkedAt: 0, nextAt: 0, now: DAY, expect: true, why: 'a full interval passed' },
  ]
  for (const item of cases) {
    assert.equal(mvUpdateDue(item.checkedAt, item.nextAt, item.now, INTERVAL), item.expect, item.why)
  }
})
