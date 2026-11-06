/**
 * Update surface for this plugin, built on the plugin market's public update API
 * v1 (`dshmarket/UPDATE-API-V1.md`): same-origin JSON, no package manager of our
 * own, and the market keeps ownership of install, verification and rollback.
 *
 * The check runs at most once every 24h, backs off exponentially after a
 * failure, and never blocks the stage: every failure ends in a state the bar can
 * render.
 */

/** Where the last known check outcome is kept between page loads. */
const MV_UPDATE_KEY = 'dsh.multiview.update.v1'
/** Scheduled check interval. */
const MV_CHECK_INTERVAL = 24 * 60 * 60 * 1000
/** First retry delay after a failure; doubles per failure up to the cap. */
const MV_BACKOFF_BASE = 60 * 60 * 1000
const MV_BACKOFF_MAX = 12 * 60 * 60 * 1000
/** Operation polling cadence and ceiling. */
const MV_POLL_INTERVAL = 1500
const MV_POLL_LIMIT = 200
/** Upper bound for one market request, so a slow registry cannot hang the bar. */
const MV_REQUEST_TIMEOUT = 20000

let mvUpdateState: any = {
  status: 'idle',
  installed: MV_PLUGIN_VERSION,
  latest: null,
  source: null,
  available: false,
  localOnly: false,
  checkedAt: 0,
  nextAt: 0,
  failures: 0,
  error: null,
  operationId: null,
  operationState: null,
  restartRequired: false,
  restartSupported: false,
}

const mvUpdateListeners = new Set<() => void>()

/** Current update snapshot. */
function mvUpdateGetState(): any {
  return mvUpdateState
}

/** Subscribe to update state changes. */
function mvUpdateSubscribe(listener: () => void): () => void {
  mvUpdateListeners.add(listener)
  return () => {
    mvUpdateListeners.delete(listener)
  }
}

/** Merge a patch into the update state, notify, and persist the durable bits. */
function mvUpdateCommit(patch: any): void {
  mvUpdateState = { ...mvUpdateState, ...patch }
  try {
    window.localStorage.setItem(
      MV_UPDATE_KEY,
      JSON.stringify({
        checkedAt: mvUpdateState.checkedAt,
        nextAt: mvUpdateState.nextAt,
        failures: mvUpdateState.failures,
        latest: mvUpdateState.latest,
        available: mvUpdateState.available,
        localOnly: mvUpdateState.localOnly,
        source: mvUpdateState.source,
      }),
    )
  } catch (error) {
    /* Not persisting only costs one extra check later. */
  }
  for (const listener of mvUpdateListeners) {
    try {
      listener()
    } catch (error) {
      console.error('dsh-multiview: update listener failed', error)
    }
  }
}

/** Load the persisted check outcome once. */
function mvUpdateHydrate(): void {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MV_UPDATE_KEY) ?? 'null')
    if (raw === null || typeof raw !== 'object') return
    mvUpdateState = {
      ...mvUpdateState,
      checkedAt: typeof raw.checkedAt === 'number' ? raw.checkedAt : 0,
      nextAt: typeof raw.nextAt === 'number' ? raw.nextAt : 0,
      failures: typeof raw.failures === 'number' ? raw.failures : 0,
      latest: typeof raw.latest === 'string' ? raw.latest : null,
      available: raw.available === true,
      localOnly: raw.localOnly === true,
      source: typeof raw.source === 'string' ? raw.source : null,
    }
  } catch (error) {
    /* A corrupt cache only means the next check runs sooner. */
  }
}

/** Split a version into numeric parts, ignoring build metadata. */
function mvVersionParts(version: string): number[] {
  const core = String(version).split('-')[0].split('+')[0]
  return core.split('.').map((part) => {
    const value = Number.parseInt(part, 10)
    return Number.isFinite(value) ? value : 0
  })
}

/** Whether `left` is a strictly newer version than `right`. */
function mvVersionGt(left: string, right: string): boolean {
  const a = mvVersionParts(left)
  const b = mvVersionParts(right)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const first = a[index] ?? 0
    const second = b[index] ?? 0
    if (first !== second) return first > second
  }
  return false
}

/** Same-origin JSON GET with a bounded wait. */
async function mvUpdateGet(url: string): Promise<any> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller === null ? 0 : setTimeout(() => controller.abort(), MV_REQUEST_TIMEOUT)
  try {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller === null ? undefined : controller.signal,
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return await response.json()
  } finally {
    if (timer !== 0) clearTimeout(timer)
  }
}

/** Same-origin JSON POST with a bounded wait. */
async function mvUpdatePost(url: string, body: any): Promise<any> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller === null ? 0 : setTimeout(() => controller.abort(), MV_REQUEST_TIMEOUT)
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller === null ? undefined : controller.signal,
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return await response.json()
  } finally {
    if (timer !== 0) clearTimeout(timer)
  }
}

/**
 * Ask the market what it knows about this package.
 * @param force - ignore the 24h schedule and the backoff window.
 */
async function mvUpdateCheck(force?: boolean): Promise<void> {
  const now = Date.now()
  if (force !== true) {
    if (now - mvUpdateState.checkedAt < MV_CHECK_INTERVAL) return
    if (mvUpdateState.nextAt > now) return
  }
  if (mvUpdateState.status === 'checking' || mvUpdateState.status === 'installing') return
  mvUpdateCommit({ status: 'checking', error: null })
  try {
    let capabilities = null
    try {
      capabilities = await mvUpdateGet('/dsh-market/api/v1/capabilities')
    } catch (error) {
      capabilities = null
    }
    if (capabilities === null || capabilities.schema !== 'dsh-market/update-api/v1') {
      mvUpdateCommit({ status: 'unsupported', checkedAt: now, nextAt: now + MV_CHECK_INTERVAL, failures: 0 })
      return
    }
    const endpoints = capabilities.endpoints ?? {}
    const checkPath = typeof endpoints.updates === 'string' ? endpoints.updates : '/dsh-market/api/v1/updates'
    const answer = await mvUpdateGet(checkPath + '?name=dsh-multiview')
    const pkg = answer?.package ?? null
    const installed = typeof pkg?.installedVersion === 'string' ? pkg.installedVersion : MV_PLUGIN_VERSION
    const latest = typeof pkg?.latestVersion === 'string' ? pkg.latestVersion : null
    const source = typeof pkg?.source === 'string' ? pkg.source : null
    const available = pkg?.updateAvailable === true || (latest !== null && mvVersionGt(latest, installed))
    mvUpdateCommit({
      status: available ? 'available' : 'idle',
      installed,
      latest,
      source,
      available,
      localOnly: source !== null && /link|local|file/i.test(source),
      checkedAt: now,
      nextAt: now + MV_CHECK_INTERVAL,
      failures: 0,
      error: null,
      restartSupported: capabilities?.restart?.supported === true,
    })
  } catch (error) {
    const failures = mvUpdateState.failures + 1
    const delay = Math.min(MV_BACKOFF_BASE * Math.pow(2, failures - 1), MV_BACKOFF_MAX)
    mvUpdateCommit({
      status: 'error',
      failures,
      checkedAt: now,
      nextAt: now + delay,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/** Start the market's own update operation and poll it to a terminal state. */
async function mvUpdateInstall(): Promise<void> {
  if (mvUpdateState.status === 'installing') return
  mvUpdateCommit({ status: 'installing', error: null, operationState: 'queued' })
  try {
    let capabilities = null
    try {
      capabilities = await mvUpdateGet('/dsh-market/api/v1/capabilities')
    } catch (error) {
      capabilities = null
    }
    if (capabilities === null) {
      mvUpdateCommit({ status: 'unsupported', error: null })
      return
    }
    const endpoints = capabilities.endpoints ?? {}
    const updatesPath = typeof endpoints.updates === 'string' ? endpoints.updates : '/dsh-market/api/v1/updates'
    const operationsPath = typeof endpoints.operations === 'string' ? endpoints.operations : '/dsh-market/api/v1/operations'
    const accepted = await mvUpdatePost(updatesPath, { packageName: 'dsh-multiview' })
    const operationId = typeof accepted?.operationId === 'string' ? accepted.operationId : null
    if (operationId === null) throw new Error('market returned no operation')
    mvUpdateCommit({ operationId, operationState: 'running' })
    for (let attempt = 0; attempt < MV_POLL_LIMIT; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, MV_POLL_INTERVAL))
      const record = await mvUpdateGet(operationsPath + '?operationId=' + encodeURIComponent(operationId))
      const operation = record?.operation ?? record
      const state = typeof operation?.state === 'string' ? operation.state : null
      mvUpdateCommit({ operationState: state })
      if (state === 'succeeded') {
        mvUpdateCommit({
          status: 'done',
          available: false,
          installed: typeof operation?.installedVersion === 'string' ? operation.installedVersion : mvUpdateState.installed,
          restartRequired: operation?.restartRequired === true,
          checkedAt: Date.now(),
          nextAt: Date.now() + MV_CHECK_INTERVAL,
        })
        return
      }
      if (state === 'failed' || state === 'cancelled' || state === 'rolled-back') {
        const message = operation?.message ?? operation?.failureCode ?? state
        mvUpdateCommit({ status: 'error', error: typeof message === 'string' ? message : String(message) })
        return
      }
    }
    mvUpdateCommit({ status: 'error', error: 'operation timed out' })
  } catch (error) {
    mvUpdateCommit({ status: 'error', error: error instanceof Error ? error.message : String(error) })
  }
}

/** Run the scheduled check when the stage mounts. */
function mvUpdateMaybeAutoCheck(): void {
  if (mvUpdateState.status === 'checking' || mvUpdateState.status === 'installing') return
  if (Date.now() - mvUpdateState.checkedAt < MV_CHECK_INTERVAL) return
  if (mvUpdateState.nextAt > Date.now()) return
  void mvUpdateCheck(false)
}
