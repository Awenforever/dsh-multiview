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
/**
 * Version discovery gets a longer budget than installs: the market resolves the
 * published version by querying the registry, and a cold index has been measured
 * taking ~23 s. Timing out early here produced a bare "aborted" message.
 */
const MV_CHECK_TIMEOUT = 30000
/** A cached result older than this is refreshed when the dialog is opened. */
const MV_UPDATE_STALE = 10 * 60 * 1000
/** Capabilities is a local read; it has no excuse to be slow. */
const MV_CAPABILITY_TIMEOUT = 5000
/**
 * The public registry, used for version discovery only.
 *
 * This is the one deliberate non-market endpoint: the market's own package query
 * has been observed taking 40–75 s and returning `latestVersion: null` (it cannot
 * resolve npm from its host), which made every update check fail. The registry
 * answers in milliseconds and sends `Access-Control-Allow-Origin: *`, so a
 * credentialed-free GET is enough. Installs still go through the market.
 */
const MV_REGISTRY_LATEST = 'https://registry.npmjs.org/dsh-multiview/latest'
/** Discovery budget: the registry answers in milliseconds, so waiting longer is pointless. */
const MV_REGISTRY_TIMEOUT = 8000

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



/** Same-origin JSON GET with a bounded wait. */
async function mvUpdateGet(url: string, timeoutMs: number = MV_REQUEST_TIMEOUT): Promise<any> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller === null ? 0 : setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      credentials: timeoutMs === MV_REQUEST_TIMEOUT ? 'same-origin' : 'omit',
      headers: { accept: 'application/json' },
      signal: controller === null ? undefined : controller.signal,
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return await response.json()
  } finally {
    if (timer !== 0) clearTimeout(timer)
  }
}

/**
 * Turn a raw fetch failure into something a person can act on.
 * @param error - whatever the request threw.
 * @param timeoutMs - the budget that was in force, for the timeout wording.
 * @param label - which service failed, for the message.
 * @returns a short sentence, never a bare DOMException message.
 */
function mvUpdateDescribe(error: any, timeoutMs: number, label: string): string {
  const name = error === null || error === undefined ? '' : String((error as any).name ?? '')
  const message = error instanceof Error ? error.message : String(error)
  if (name === 'AbortError' || /aborted/i.test(message)) {
    return mvFormat(T('updateTimeout'), { label, seconds: String(Math.round(timeoutMs / 1000)) })
  }
  if (error instanceof TypeError || /fetch|network|failed to fetch/i.test(message)) {
    return mvFormat(T('updateUnreachable'), { label })
  }
  return message
}

/**
 * Latest published version, straight from the public registry.
 * @returns the version, or null when the registry cannot be reached.
 */
async function mvUpdateRegistryLatest(): Promise<string | null> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller === null ? 0 : setTimeout(() => controller.abort(), MV_REGISTRY_TIMEOUT)
  try {
    const response = await fetch(MV_REGISTRY_LATEST, {
      /* No cookies and no referrer: this is a public read of a public package. */
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { accept: 'application/json' },
      signal: controller === null ? undefined : controller.signal,
    })
    if (!response.ok) return null
    const answer = await response.json()
    const version = typeof answer?.version === 'string' ? answer.version : ''
    return version === '' ? null : version
  } catch (error) {
    return null
  } finally {
    if (timer !== 0) clearTimeout(timer)
  }
}

/** Same-origin JSON POST with a bounded wait. */async function mvUpdatePost(url: string, body: any): Promise<any> {
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
 *
 * Version discovery prefers the public registry: it answers in milliseconds and
 * is the authority for "what is the latest published version". The market stays
 * the installer, and remains the fallback when the registry cannot be reached.
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

  /* 1. Market capabilities: decides whether the install button can exist at all. */
  let installed = MV_PLUGIN_VERSION
  let capabilities: any = null
  try {
    capabilities = await mvUpdateGet('/dsh-market/api/v1/capabilities', MV_CAPABILITY_TIMEOUT)
  } catch (error) {
    capabilities = null
  }
  const marketReady = capabilities !== null && capabilities.schema === 'dsh-market/update-api/v1'
  const endpoints = marketReady ? capabilities.endpoints ?? {} : {}
  const updatesPath = typeof endpoints.updates === 'string' ? endpoints.updates : '/dsh-market/api/v1/updates'

  /* 2. Latest version: registry first, market second. */
  let latest: string | null = await mvUpdateRegistryLatest()
  let source: string | null = latest === null ? null : 'npm'
  let marketAnswered = false
  let failure: string | null = null

  if (latest === null) {
    try {
      const answer = await mvUpdateGet(updatesPath + '?name=dsh-multiview', MV_CHECK_TIMEOUT)
      const pkg = answer?.package ?? null
      marketAnswered = pkg !== null && pkg !== undefined
      if (typeof pkg?.installedVersion === 'string') installed = pkg.installedVersion
      if (typeof pkg?.latestVersion === 'string') latest = pkg.latestVersion
      if (latest !== null) source = typeof pkg?.source === 'string' ? pkg.source : 'market'
    } catch (error) {
      failure = mvUpdateDescribe(error, MV_CHECK_TIMEOUT, T('serviceMarket'))
    }
  }

  if (latest === null) {
    const failures = mvUpdateState.failures + 1
    const delay = Math.min(MV_BACKOFF_BASE * Math.pow(2, failures - 1), MV_BACKOFF_MAX)
    mvUpdateCommit({
      status: marketReady ? 'error' : 'unsupported',
      available: false,
      latest: null,
      failures,
      checkedAt: now,
      nextAt: now + delay,
      error: failure ?? T('updateNoVersion'),
    })
    return
  }

  const available = mvVersionGt(latest, installed)
  mvUpdateCommit({
    status: available ? 'available' : 'idle',
    installed,
    latest,
    source,
    available,
    /* Install needs the market; a registry-only answer keeps the manual hint. */
    canAutoInstall: marketReady && endpoints.updates !== undefined,
    localOnly: typeof source === 'string' && /^link|local|file/i.test(source),
    checkedAt: now,
    nextAt: now + MV_CHECK_INTERVAL,
    failures: 0,
    error: null,
    restartSupported: marketReady ? capabilities.restart?.supported === true : false,
  })
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
