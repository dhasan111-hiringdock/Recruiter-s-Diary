import { useState, useEffect } from 'react'
import './App.css'

const RECRUITERS_STORAGE_KEY = 'rd_recruiters_v1'
const CLIENTS_STORAGE_KEY = 'rd_clients_v1'

const ROLE_SUB_STATUS_OPTIONS = {
  Active: ['Open', 'Feedback Pending'],
  Closed: ['Lost', 'Deal', 'On hold', 'No answer'],
}

const DEFAULT_RECRUITERS = [
  { id: 'rec-1', name: 'Alex', active: true },
  { id: 'rec-2', name: 'Jordan', active: true },
  { id: 'rec-3', name: 'Taylor', active: true },
]

const DEFAULT_CLIENTS = [
  { id: 'client-1', name: 'Acme Corp', active: true },
  { id: 'client-2', name: 'BlueSky Tech', active: true },
  { id: 'client-3', name: 'Northstar Finance', active: true },
  { id: 'client-4', name: 'Innova Labs', active: true },
]

const ISSUE_CATEGORY_DEFINITIONS = {
  CLIENT_RESPONSIVENESS: {
    label: 'Client responsiveness',
    keywords: [
      'waiting feedback',
      'no feedback',
      'slow feedback',
      'delayed feedback',
      'client not responding',
      'no response',
      'unresponsive',
      'reschedule',
      'rescheduled',
      'cancelled call',
      'canceled call',
      'cancelled interview',
      'canceled interview',
    ],
  },
  COMPENSATION_MISMATCH: {
    label: 'Compensation mismatch',
    keywords: [
      'budget issue',
      'budget is low',
      'low budget',
      'low salary',
      'below market',
      'salary too low',
      'compensation',
      'package',
      'offer too low',
      'ctc',
    ],
  },
  ROLE_CLARITY: {
    label: 'Role clarity',
    keywords: [
      'unclear jd',
      'unclear role',
      'unclear requirement',
      'requirements keep changing',
      'changing jd',
      'change requirement',
      'change in requirement',
      'new requirements came up',
      'scope changed',
    ],
  },
  CANDIDATE_QUALITY: {
    label: 'Candidate quality',
    keywords: [
      'no suitable',
      'no relevant profiles',
      'no relevant candidates',
      'lack of experience',
      'quality issue',
      'not a good fit',
      'not good fit',
      'overqualified',
      'underqualified',
    ],
  },
  INTERNAL_PROCESS: {
    label: 'Internal process',
    keywords: [
      'internal approval',
      'approval pending',
      'internal delay',
      'headcount freeze',
      'hiring freeze',
      'sign off pending',
      'signoff pending',
      'internal process',
    ],
  },
  MARKET_CONDITIONS: {
    label: 'Market conditions',
    keywords: [
      'market is tough',
      'tough market',
      'shortage',
      'niche skill',
      'niche skills',
      'location constraint',
      'location issue',
      'few candidates available',
      'limited pool',
    ],
  },
  TIMELINE_URGENCY: {
    label: 'Timeline urgency',
    keywords: [
      'urgent',
      'critical',
      'high priority',
      'tight timeline',
      'tight timelines',
      'aggressive timeline',
      'deadline',
      'need to close quickly',
      'close asap',
    ],
  },
}

const ISSUE_SEVERE_TERMS = [
  'stuck',
  'blocked',
  'frustrated',
  'escalated',
  'escalation',
  'at risk',
  'might lose',
  'may lose',
  'lost candidate',
  'lost the candidate',
  'role on hold',
  'role cancelled',
  'role canceled',
]

const analyzeRoleRemark = (remark) => {
  const normalized = remark.toLowerCase()
  const categories = []
  const tags = []

  Object.entries(ISSUE_CATEGORY_DEFINITIONS).forEach(([key, definition]) => {
    let matched = false

    definition.keywords.forEach((keyword) => {
      if (normalized.includes(keyword)) {
        matched = true
        if (!tags.includes(keyword)) {
          tags.push(keyword)
        }
      }
    })

    if (matched) {
      categories.push(key)
    }
  })

  let severity = 1

  if (categories.length >= 2) {
    severity += 1
  }

  if (categories.length >= 3) {
    severity += 1
  }

  const hasSevereTerm = ISSUE_SEVERE_TERMS.some((term) =>
    normalized.includes(term),
  )

  if (hasSevereTerm) {
    severity += 1
  }

  if (!categories.length && remark.trim()) {
    categories.push('OTHER')
  }

  if (severity < 1) {
    severity = 1
  }

  if (severity > 5) {
    severity = 5
  }

  const isRisk = severity >= 3

  return {
    categories,
    tags,
    severity,
    isRisk,
  }
}

const SAMPLE_TODAY_KEY = new Date().toISOString().slice(0, 10)

const DEFAULT_ROLES = []

const DEFAULT_ROLE_ISSUE_INSIGHTS = []

function App() {
  const [activeModal, setActiveModal] = useState(null)
  const [activeStatusTab, setActiveStatusTab] = useState('role')
  const [activeSidebarSection, setActiveSidebarSection] = useState('home')
  const [askMeOpen, setAskMeOpen] = useState(false)
  const [askMeInput, setAskMeInput] = useState('')
  const [askMeMessages, setAskMeMessages] = useState([])

  const [roles, setRoles] = useState(DEFAULT_ROLES)
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    client: '',
    recruiterId: '',
    releasedDate: '',
    remarks: '',
  })

  const [recruiters, setRecruiters] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_RECRUITERS
    }

    try {
      const saved = window.localStorage.getItem(RECRUITERS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Failed to read recruiters from storage', error)
    }

    return DEFAULT_RECRUITERS
  })

  const [clients, setClients] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_CLIENTS
    }

    try {
      const saved = window.localStorage.getItem(CLIENTS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Failed to read clients from storage', error)
    }

    return DEFAULT_CLIENTS
  })

  const [submissionDrafts, setSubmissionDrafts] = useState(() =>
    recruiters.reduce(
      (acc, recruiter) => ({
        ...acc,
        [recruiter.id]: {
          submissions: '',
          interviews: '',
        },
      }),
      {},
    ),
  )

  const [dealsLog, setDealsLog] = useState([])
  const [entries, setEntries] = useState([])
  const [roleIssueInsights, setRoleIssueInsights] =
    useState(DEFAULT_ROLE_ISSUE_INSIGHTS)
  const [focusedRecruiterId, setFocusedRecruiterId] = useState('')
  const [focusedClientName, setFocusedClientName] = useState('')
  const [rolesSidebarStatus, setRolesSidebarStatus] = useState('Active')
  const [rolesSidebarClientFilter, setRolesSidebarClientFilter] = useState('')
  const [recruiterStatsRange, setRecruiterStatsRange] = useState('week')
  const [clientStatsRange, setClientStatsRange] = useState('week')
  const [recruiterCustomRangeStart, setRecruiterCustomRangeStart] = useState('')
  const [recruiterCustomRangeEnd, setRecruiterCustomRangeEnd] = useState('')
  const [clientCustomRangeStart, setClientCustomRangeStart] = useState('')
  const [clientCustomRangeEnd, setClientCustomRangeEnd] = useState('')
  const [analyzeTargetType, setAnalyzeTargetType] = useState('recruiter')
  const [analyzeRecruiterId, setAnalyzeRecruiterId] = useState('')
  const [analyzeClientName, setAnalyzeClientName] = useState('')
  const [analyzeRange, setAnalyzeRange] = useState('week')
  const [analyzeCustomRangeStart, setAnalyzeCustomRangeStart] = useState('')
  const [analyzeCustomRangeEnd, setAnalyzeCustomRangeEnd] = useState('')

  const [statusRoleForm, setStatusRoleForm] = useState({
    roleId: '',
    status: 'Active',
    subStatus: 'Open',
    remarks: '',
  })

  const [statusMetricForm, setStatusMetricForm] = useState({
    recruiterId: '',
    date: '',
    quantity: '',
    candidateName: '',
    clientName: '',
    roleId: '',
    selectedDealId: '',
  })

  const [newRecruiterName, setNewRecruiterName] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [managePassword, setManagePassword] = useState('')
  const [managePasswordError, setManagePasswordError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      RECRUITERS_STORAGE_KEY,
      JSON.stringify(recruiters),
    )
  }, [recruiters])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients))
  }, [clients])

  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  const [weekOffset, setWeekOffset] = useState(0)

  const referenceDate = new Date(today)
  referenceDate.setDate(today.getDate() + weekOffset * 7)

  const startOfWeek = new Date(referenceDate)
  const dayOfWeek = referenceDate.getDay() === 0 ? 6 : referenceDate.getDay() - 1
  startOfWeek.setDate(referenceDate.getDate() - dayOfWeek)

  const dateSummariesFromEntries = entries.reduce(
    (accumulator, entry) => {
      const current = accumulator[entry.date] || {
        submissions: 0,
        interviews: 0,
        deals: 0,
        pullouts: 0,
      }

      accumulator[entry.date] = {
        submissions: current.submissions + (entry.submissions || 0),
        interviews: current.interviews + (entry.interviews || 0),
        deals: current.deals + (entry.deals || 0),
        pullouts: current.pullouts + (entry.pullouts || 0),
      }

      return accumulator
    },
    {},
  )

  const dateSummaries = dealsLog.reduce(
    (accumulator, record) => {
      const current = accumulator[record.date] || {
        submissions: 0,
        interviews: 0,
        deals: 0,
        pullouts: 0,
      }

      accumulator[record.date] = {
        ...current,
        deals: current.deals + (record.status === 'deal' ? 1 : 0),
        pullouts:
          current.pullouts + (record.status === 'pulled-out' ? 1 : 0),
      }

      return accumulator
    },
    { ...dateSummariesFromEntries },
  )

  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + index)

    const key = date.toISOString().slice(0, 10)
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    const isSelected = key === selectedDateKey

    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      day: date.getDate(),
      isToday,
      isSelected,
    }
  })

  const weekDateKeys = weekDays.map((day) => day.key)

  const dashboardActions = [
    {
      key: 'new-role',
      title: 'New Role',
      description: 'Capture details for a brand new position to work on today.',
    },
    {
      key: 'daily-submission',
      title: 'Daily Submission',
      description: 'Log today’s candidate submissions and outreach in one place.',
    },
    {
      key: 'status-update',
      title: 'Status Update',
      description: 'Update interview stages, feedback, and offer progress.',
    },
    {
      key: 'analyze',
      title: 'Analyze',
      description: 'Review key metrics, conversion rates, and recruiter performance.',
    },
  ]

  const activeRecruiters = recruiters.filter((recruiter) => recruiter.active)
  const activeClients = clients.filter((client) => client.active)

  const isDateInRange = (dateKey, range, customStart, customEnd) => {
    if (range === 'today') {
      return dateKey === todayKey
    }

    if (range === 'week') {
      return weekDateKeys.includes(dateKey)
    }

    if (range === 'month') {
      const parsed = new Date(dateKey)
      if (Number.isNaN(parsed.getTime())) {
        return false
      }

      return (
        parsed.getMonth() === today.getMonth() &&
        parsed.getFullYear() === today.getFullYear()
      )
    }

    if (range === 'custom') {
      if (!customStart && !customEnd) {
        return true
      }

      const parsed = new Date(dateKey)
      if (Number.isNaN(parsed.getTime())) {
        return false
      }

      if (customStart) {
        const start = new Date(customStart)
        if (parsed < start) {
          return false
        }
      }

      if (customEnd) {
        const end = new Date(customEnd)
        if (parsed > end) {
          return false
        }
      }

      return true
    }

    return true
  }

  const selectedRecruiterIds =
    focusedRecruiterId && recruiters.some((recruiter) => recruiter.id === focusedRecruiterId)
      ? [focusedRecruiterId]
      : activeRecruiters.map((recruiter) => recruiter.id)

  const recruiterStatsFromEntries = entries.reduce(
    (accumulator, entry) => {
      if (!selectedRecruiterIds.includes(entry.recruiterId)) {
        return accumulator
      }

      const inRange = isDateInRange(
        entry.date,
        recruiterStatsRange,
        recruiterCustomRangeStart,
        recruiterCustomRangeEnd,
      )

      if (!inRange) {
        return accumulator
      }

      return {
        submissions: accumulator.submissions + (entry.submissions || 0),
        interviews: accumulator.interviews + (entry.interviews || 0),
        deals: accumulator.deals + (entry.deals || 0),
        pullouts: accumulator.pullouts + (entry.pullouts || 0),
      }
    },
    {
      submissions: 0,
      interviews: 0,
      deals: 0,
      pullouts: 0,
    },
  )

  const recruiterStats = dealsLog.reduce(
    (accumulator, record) => {
      if (!selectedRecruiterIds.includes(record.recruiterId)) {
        return accumulator
      }

      const inRange = isDateInRange(
        record.date,
        recruiterStatsRange,
        recruiterCustomRangeStart,
        recruiterCustomRangeEnd,
      )

      if (!inRange) {
        return accumulator
      }

      return {
        ...accumulator,
        deals: accumulator.deals + (record.status === 'deal' ? 1 : 0),
        pullouts:
          accumulator.pullouts + (record.status === 'pulled-out' ? 1 : 0),
      }
    },
    { ...recruiterStatsFromEntries },
  )

  const recruiterAssignedRolesCount = roles.reduce(
    (accumulator, role) => {
      if (!role.recruiterId || !selectedRecruiterIds.includes(role.recruiterId)) {
        return accumulator
      }

      const inRange = role.releasedDate
        ? isDateInRange(
            role.releasedDate,
            recruiterStatsRange,
            recruiterCustomRangeStart,
            recruiterCustomRangeEnd,
          )
        : true

      if (!inRange) {
        return accumulator
      }

      return accumulator + 1
    },
    0,
  )

  const selectedClientNames =
    focusedClientName && clients.some((client) => client.name === focusedClientName)
      ? [focusedClientName]
      : activeClients.map((client) => client.name)

  const clientRoles = roles.filter((role) => selectedClientNames.includes(role.client))
  const clientActiveRoles = clientRoles.filter((role) => role.status === 'Active')
  const clientClosedRoles = clientRoles.filter((role) => role.status === 'Closed')

  const filteredClientRoleIssueInsights = roleIssueInsights.filter((insight) => {
    if (!selectedClientNames.includes(insight.client)) {
      return false
    }

    return isDateInRange(
      insight.date,
      clientStatsRange,
      clientCustomRangeStart,
      clientCustomRangeEnd,
    )
  })

  const clientRiskNotes = filteredClientRoleIssueInsights.filter(
    (insight) => insight.isRisk,
  )

  const clientDeskStatsFromEntries = entries.reduce(
    (accumulator, entry) => {
      const inRange = isDateInRange(
        entry.date,
        clientStatsRange,
        clientCustomRangeStart,
        clientCustomRangeEnd,
      )

      if (!inRange) {
        return accumulator
      }

      return {
        interviews: accumulator.interviews + (entry.interviews || 0),
        deals: accumulator.deals + (entry.deals || 0),
      }
    },
    {
      interviews: 0,
      deals: 0,
    },
  )

  const clientDeskStats = dealsLog.reduce(
    (accumulator, record) => {
      const inRange = isDateInRange(
        record.date,
        clientStatsRange,
        clientCustomRangeStart,
        clientCustomRangeEnd,
      )

      if (!inRange) {
        return accumulator
      }

      return {
        ...accumulator,
        deals: accumulator.deals + (record.status === 'deal' ? 1 : 0),
      }
    },
    { ...clientDeskStatsFromEntries },
  )

  const analyzeRecruiterStatsFromEntries = entries.reduce(
    (accumulator, entry) => {
      if (
        analyzeTargetType !== 'recruiter' ||
        !analyzeRecruiterId ||
        entry.recruiterId !== analyzeRecruiterId
      ) {
        return accumulator
      }

      if (
        !isDateInRange(
          entry.date,
          analyzeRange,
          analyzeCustomRangeStart,
          analyzeCustomRangeEnd,
        )
      ) {
        return accumulator
      }

      return {
        submissions: accumulator.submissions + (entry.submissions || 0),
        interviews: accumulator.interviews + (entry.interviews || 0),
        deals: accumulator.deals + (entry.deals || 0),
        pullouts: accumulator.pullouts + (entry.pullouts || 0),
      }
    },
    {
      submissions: 0,
      interviews: 0,
      deals: 0,
      pullouts: 0,
    },
  )

  const analyzeRecruiterStats = dealsLog.reduce(
    (accumulator, record) => {
      if (
        analyzeTargetType !== 'recruiter' ||
        !analyzeRecruiterId ||
        record.recruiterId !== analyzeRecruiterId
      ) {
        return accumulator
      }

      if (
        !isDateInRange(
          record.date,
          analyzeRange,
          analyzeCustomRangeStart,
          analyzeCustomRangeEnd,
        )
      ) {
        return accumulator
      }

      return {
        ...accumulator,
        deals: accumulator.deals + (record.status === 'deal' ? 1 : 0),
        pullouts:
          accumulator.pullouts + (record.status === 'pulled-out' ? 1 : 0),
      }
    },
    { ...analyzeRecruiterStatsFromEntries },
  )

  const analyzeClientRoles = roles.filter(
    (role) => analyzeTargetType === 'client' && role.client === analyzeClientName,
  )

  const analyzeClientActiveRoles = analyzeClientRoles.filter(
    (role) => role.status === 'Active',
  )

  const analyzeClientClosedRoles = analyzeClientRoles.filter(
    (role) => role.status === 'Closed',
  )

  const analyzeClientInsights = roleIssueInsights.filter((insight) => {
    if (analyzeTargetType !== 'client' || !analyzeClientName) {
      return false
    }

    if (insight.client !== analyzeClientName) {
      return false
    }

    return isDateInRange(
      insight.date,
      analyzeRange,
      analyzeCustomRangeStart,
      analyzeCustomRangeEnd,
    )
  })

  const analyzeClientRiskNotes = analyzeClientInsights.filter(
    (insight) => insight.isRisk,
  )

  const monthKeyFromDate = (dateString) => {
    if (!dateString) {
      return ''
    }
    if (dateString.length >= 7) {
      return dateString.slice(0, 7)
    }
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
  }

  const formatMonthKeyLabel = (key) => {
    if (!key) {
      return ''
    }
    const parsed = new Date(`${key}-01`)
    if (Number.isNaN(parsed.getTime())) {
      return key
    }
    return parsed.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
  }

  const answerAskMeQuestion = (rawQuestion) => {
    const text = rawQuestion.trim()
    if (!text) {
      return 'Ask about a recruiter, client, or metrics like submissions, interviews, deals, pull outs, or roles.'
    }
    const normalized = text.toLowerCase()
    const recruiterEntity =
      recruiters.find((recruiter) =>
        normalized.includes(recruiter.name.toLowerCase()),
      ) || null
    const clientEntity =
      clients.find((client) => normalized.includes(client.name.toLowerCase())) ||
      null
    const metricKeywords = [
      { key: 'submissions', words: ['submission', 'submissions', 'submittal', 'submittals'] },
      { key: 'interviews', words: ['interview', 'interviews'] },
      { key: 'deals', words: ['deal', 'deals', 'closure', 'closures', 'offer', 'offers'] },
      {
        key: 'pullouts',
        words: ['pull out', 'pullout', 'pull outs', 'pullouts', 'drop off', 'drop-off'],
      },
      { key: 'roles', words: ['role', 'roles', 'mandate', 'mandates'] },
    ]
    let metric = ''
    for (let index = 0; index < metricKeywords.length; index += 1) {
      const metricDef = metricKeywords[index]
      if (metricDef.words.some((word) => normalized.includes(word))) {
        metric = metricDef.key
        break
      }
    }
    const asksForAverageMonthly =
      normalized.includes('average monthly') ||
      normalized.includes('avg monthly') ||
      normalized.includes('average per month') ||
      normalized.includes('per month') ||
      normalized.includes('monthly')
    const asksForHighestMonth =
      (normalized.includes('highest') ||
        normalized.includes('max') ||
        normalized.includes('peak')) &&
      normalized.includes('month')
    const asksForThisMonth =
      normalized.includes('this month') ||
      normalized.includes('current month') ||
      normalized.includes('in this month') ||
      normalized.includes('so far this month')
    const labelForMetric = (metricKey) => {
      if (metricKey === 'submissions') {
        return 'submissions'
      }
      if (metricKey === 'interviews') {
        return 'interviews'
      }
      if (metricKey === 'deals') {
        return 'deals'
      }
      if (metricKey === 'pullouts') {
        return 'pull outs'
      }
      if (metricKey === 'roles') {
        return 'roles'
      }
      return 'value'
    }
    const buildTotalForMetricAllTime = (metricKey) => {
      if (metricKey === 'deals') {
        const fromEntries = entries.reduce(
          (sum, entry) => sum + (entry.deals || 0),
          0,
        )
        const fromDealsLog = dealsLog.reduce(
          (sum, record) => sum + (record.status === 'deal' ? 1 : 0),
          0,
        )
        return fromEntries + fromDealsLog
      }
      if (metricKey === 'pullouts') {
        const fromEntries = entries.reduce(
          (sum, entry) => sum + (entry.pullouts || 0),
          0,
        )
        const fromDealsLog = dealsLog.reduce(
          (sum, record) => sum + (record.status === 'pulled-out' ? 1 : 0),
          0,
        )
        return fromEntries + fromDealsLog
      }
      const field = metricKey
      return entries.reduce((sum, entry) => sum + (entry[field] || 0), 0)
    }
    const buildRecruiterSummary = () => {
      if (!recruiterEntity) {
        return ''
      }
      const relevantEntries = entries.filter(
        (entry) => entry.recruiterId === recruiterEntity.id,
      )
      const relevantDealsLog = dealsLog.filter(
        (record) => record.recruiterId === recruiterEntity.id,
      )
      if (!relevantEntries.length && !relevantDealsLog.length) {
        return `I do not have any activity logged for ${recruiterEntity.name} yet.`
      }
      const totalsFromEntries = relevantEntries.reduce(
        (accumulator, entry) => ({
          submissions: accumulator.submissions + (entry.submissions || 0),
          interviews: accumulator.interviews + (entry.interviews || 0),
          deals: accumulator.deals + (entry.deals || 0),
          pullouts: accumulator.pullouts + (entry.pullouts || 0),
        }),
        { submissions: 0, interviews: 0, deals: 0, pullouts: 0 },
      )
      const additionalDeals = relevantDealsLog.reduce(
        (accumulator, record) => ({
          deals: accumulator.deals + (record.status === 'deal' ? 1 : 0),
          pullouts:
            accumulator.pullouts +
            (record.status === 'pulled-out' ? 1 : 0),
        }),
        { deals: 0, pullouts: 0 },
      )
      const totals = {
        submissions: totalsFromEntries.submissions,
        interviews: totalsFromEntries.interviews,
        deals: totalsFromEntries.deals + additionalDeals.deals,
        pullouts: totalsFromEntries.pullouts + additionalDeals.pullouts,
      }
      return `${recruiterEntity.name} has ${totals.submissions} submissions, ${totals.interviews} interviews, ${totals.deals} deals, and ${totals.pullouts} pull outs across all time.`
    }
    const buildClientSummary = () => {
      if (!clientEntity) {
        return ''
      }
      const rolesForClient = roles.filter(
        (role) => role.client === clientEntity.name,
      )
      if (!rolesForClient.length) {
        return `I do not have any roles logged for ${clientEntity.name} yet.`
      }
      const activeCount = rolesForClient.filter(
        (role) => role.status === 'Active',
      ).length
      const closedCount = rolesForClient.filter(
        (role) => role.status === 'Closed',
      ).length
      return `${clientEntity.name} has ${activeCount} active role(s) and ${closedCount} closed role(s) on your desk.`
    }
    const answerGlobalMetricQuestion = () => {
      const perMonth = {}
      entries.forEach((entry) => {
        const key = monthKeyFromDate(entry.date)
        if (!key) {
          return
        }
        const value = entry[metric] || 0
        if (!value) {
          return
        }
        perMonth[key] = (perMonth[key] || 0) + value
      })
      if (metric === 'deals' || metric === 'pullouts') {
        dealsLog.forEach((record) => {
          const key = monthKeyFromDate(record.date)
          if (!key) {
            return
          }
          if (metric === 'deals' && record.status !== 'deal') {
            return
          }
          if (metric === 'pullouts' && record.status !== 'pulled-out') {
            return
          }
          perMonth[key] = (perMonth[key] || 0) + 1
        })
      }
      const monthKeys = Object.keys(perMonth)
      if (!monthKeys.length) {
        return 'I do not have enough data yet to calculate monthly stats for this metric.'
      }
      const metricLabel = labelForMetric(metric)
      if (asksForHighestMonth) {
        let bestKey = monthKeys[0]
        let bestValue = perMonth[bestKey]
        monthKeys.slice(1).forEach((key) => {
          if (perMonth[key] > bestValue) {
            bestKey = key
            bestValue = perMonth[key]
          }
        })
        const label = formatMonthKeyLabel(bestKey)
        return `Your highest ${metricLabel} month overall was ${label} with ${bestValue} ${metricLabel}.`
      }
      if (asksForAverageMonthly) {
        const total = monthKeys.reduce(
          (sum, key) => sum + perMonth[key],
          0,
        )
        const average = total / monthKeys.length
        return `Across your desk you average ${average.toFixed(
          1,
        )} ${metricLabel} per month based on ${monthKeys.length} month(s) of data.`
      }
      if (asksForThisMonth) {
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(
          now.getMonth() + 1,
        ).padStart(2, '0')}`
        const value = perMonth[monthKey] || 0
        return `In the current month so far you have ${value} ${metricLabel} across your desk.`
      }
      const totalAllTime = buildTotalForMetricAllTime(metric)
      return `Across your desk you have ${totalAllTime} ${metricLabel} in total across all time.`
    }
    if (!metric) {
      if (recruiterEntity) {
        return buildRecruiterSummary()
      }
      if (clientEntity) {
        return buildClientSummary()
      }
      return 'Ask about a recruiter or client, or mention a metric like submissions, interviews, deals, pull outs, or roles.'
    }
    if (metric === 'roles') {
      const targetClient = clientEntity
      const relevantRoles = targetClient
        ? roles.filter((role) => role.client === targetClient.name)
        : roles
      if (!relevantRoles.length) {
        if (targetClient) {
          return `I do not have any roles logged for ${targetClient.name} yet.`
        }
        return 'I do not have any roles logged yet.'
      }
      const perMonth = {}
      relevantRoles.forEach((role) => {
        const key = monthKeyFromDate(role.releasedDate || SAMPLE_TODAY_KEY)
        if (!key) {
          return
        }
        perMonth[key] = (perMonth[key] || 0) + 1
      })
      const monthKeys = Object.keys(perMonth)
      if (!monthKeys.length) {
        if (targetClient) {
          return `I have roles for ${targetClient.name}, but not enough date information to calculate monthly stats.`
        }
        return 'I have roles in the system, but not enough date information to calculate monthly stats.'
      }
      const totalRoles = relevantRoles.length
      if (asksForHighestMonth) {
        let bestKey = monthKeys[0]
        let bestValue = perMonth[bestKey]
        monthKeys.slice(1).forEach((key) => {
          if (perMonth[key] > bestValue) {
            bestKey = key
            bestValue = perMonth[key]
          }
        })
        const label = formatMonthKeyLabel(bestKey)
        if (targetClient) {
          return `${targetClient.name}'s highest roles month was ${label} with ${bestValue} roles opened.`
        }
        return `Your highest roles month overall was ${label} with ${bestValue} roles opened.`
      }
      if (asksForAverageMonthly) {
        const average = totalRoles / monthKeys.length
        if (targetClient) {
          return `${targetClient.name} has an average of ${average.toFixed(
            1,
          )} roles per month based on ${monthKeys.length} month(s) of data, with ${totalRoles} roles in total.`
        }
        return `Across all clients there is an average of ${average.toFixed(
          1,
        )} roles per month based on ${monthKeys.length} month(s) of data, with ${totalRoles} roles in total.`
      }
      if (asksForThisMonth) {
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(
          now.getMonth() + 1,
        ).padStart(2, '0')}`
        const value = perMonth[monthKey] || 0
        if (targetClient) {
          return `${targetClient.name} has ${value} roles opened in the current month so far.`
        }
        return `In the current month so far you have ${value} roles opened across all clients.`
      }
      if (targetClient) {
        return `${targetClient.name} has ${totalRoles} roles in total on your desk.`
      }
      return `Across all clients you have ${totalRoles} roles in total on your desk.`
    }
    if (!recruiterEntity && !clientEntity) {
      if (asksForAverageMonthly || asksForHighestMonth || asksForThisMonth) {
        return answerGlobalMetricQuestion()
      }
      const metricLabel = labelForMetric(metric)
      const totalAllTime = buildTotalForMetricAllTime(metric)
      return `Across your desk you have ${totalAllTime} ${metricLabel} in total across all time.`
    }
    if (recruiterEntity) {
      const relevantEntries = entries.filter(
        (entry) => entry.recruiterId === recruiterEntity.id,
      )
      const relevantDealsLog = dealsLog.filter(
        (record) => record.recruiterId === recruiterEntity.id,
      )
      if (!relevantEntries.length && !relevantDealsLog.length) {
        return `I do not have any activity logged for ${recruiterEntity.name} yet.`
      }
      const metricLabel = labelForMetric(metric)
      if (asksForHighestMonth) {
        const perMonth = {}
        relevantEntries.forEach((entry) => {
          const key = monthKeyFromDate(entry.date)
          if (!key) {
            return
          }
          const value = entry[metric] || 0
          perMonth[key] = (perMonth[key] || 0) + value
        })
        if (metric === 'deals' || metric === 'pullouts') {
          relevantDealsLog.forEach((record) => {
            const key = monthKeyFromDate(record.date)
            if (!key) {
              return
            }
            if (metric === 'deals' && record.status !== 'deal') {
              return
            }
            if (metric === 'pullouts' && record.status !== 'pulled-out') {
              return
            }
            perMonth[key] = (perMonth[key] || 0) + 1
          })
        }
        const monthKeys = Object.keys(perMonth)
        if (!monthKeys.length) {
          return `I have entries for ${recruiterEntity.name}, but not enough date information to calculate monthly peaks.`
        }
        let bestKey = monthKeys[0]
        let bestValue = perMonth[bestKey]
        monthKeys.slice(1).forEach((key) => {
          if (perMonth[key] > bestValue) {
            bestKey = key
            bestValue = perMonth[key]
          }
        })
        const label = formatMonthKeyLabel(bestKey)
        return `${recruiterEntity.name}'s highest ${metricLabel} month was ${label} with ${bestValue} ${metricLabel}.`
      }
      if (asksForAverageMonthly) {
        const perMonth = {}
        relevantEntries.forEach((entry) => {
          const key = monthKeyFromDate(entry.date)
          if (!key) {
            return
          }
          const value = entry[metric] || 0
          perMonth[key] = (perMonth[key] || 0) + value
        })
        if (metric === 'deals' || metric === 'pullouts') {
          relevantDealsLog.forEach((record) => {
            const key = monthKeyFromDate(record.date)
            if (!key) {
              return
            }
            if (metric === 'deals' && record.status !== 'deal') {
              return
            }
            if (metric === 'pullouts' && record.status !== 'pulled-out') {
              return
            }
            perMonth[key] = (perMonth[key] || 0) + 1
          })
        }
        const monthKeys = Object.keys(perMonth)
        if (!monthKeys.length) {
          return `I have entries for ${recruiterEntity.name}, but not enough date information to calculate monthly averages.`
        }
        const total = monthKeys.reduce((sum, key) => sum + perMonth[key], 0)
        const average = total / monthKeys.length
        return `${recruiterEntity.name} averages ${average.toFixed(
          1,
        )} ${metricLabel} per month based on ${monthKeys.length} month(s) of data.`
      }
      const now = new Date()
      const monthKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`
      const totalThisMonth = relevantEntries.reduce((sum, entry) => {
        const key = monthKeyFromDate(entry.date)
        if (asksForThisMonth && key !== monthKey) {
          return sum
        }
        const value = entry[metric] || 0
        return sum + value
      }, 0)
      let totalThisMonthWithDealsLog = totalThisMonth
      if (metric === 'deals' || metric === 'pullouts') {
        relevantDealsLog.forEach((record) => {
          const key = monthKeyFromDate(record.date)
          if (asksForThisMonth && key !== monthKey) {
            return
          }
          if (metric === 'deals' && record.status !== 'deal') {
            return
          }
          if (metric === 'pullouts' && record.status !== 'pulled-out') {
            return
          }
          totalThisMonthWithDealsLog += 1
        })
      }
      if (asksForThisMonth) {
        return `${recruiterEntity.name} has ${totalThisMonthWithDealsLog} ${metricLabel} in the current month so far.`
      }
      if (metric === 'deals' || metric === 'pullouts') {
        const baseTotal = relevantEntries.reduce(
          (sum, entry) => sum + (entry[metric] || 0),
          0,
        )
        const extraFromDealsLog = relevantDealsLog.reduce((sum, record) => {
          if (metric === 'deals' && record.status === 'deal') {
            return sum + 1
          }
          if (metric === 'pullouts' && record.status === 'pulled-out') {
            return sum + 1
          }
          return sum
        }, 0)
        const totalAllTimeRecruiter = baseTotal + extraFromDealsLog
        return `${recruiterEntity.name} has ${totalAllTimeRecruiter} ${metricLabel} in total across all time.`
      }
      const totalAllTime = relevantEntries.reduce(
        (sum, entry) => sum + (entry[metric] || 0),
        0,
      )
      return `${recruiterEntity.name} has ${totalAllTime} ${metricLabel} in total across all time.`
    }
    if (clientEntity) {
      const rolesForClient = roles.filter(
        (role) => role.client === clientEntity.name,
      )
      const hasRoles = rolesForClient.length > 0
      if (metric === 'roles') {
        return buildClientSummary()
      }
      const metricLabel = labelForMetric(metric)
      if (asksForAverageMonthly || asksForHighestMonth || asksForThisMonth) {
        const perMonth = {}
        entries.forEach((entry) => {
          const key = monthKeyFromDate(entry.date)
          if (!key) {
            return
          }
          const value = entry[metric] || 0
          if (!value) {
            return
          }
          perMonth[key] = (perMonth[key] || 0) + value
        })
        if (metric === 'deals' || metric === 'pullouts') {
          dealsLog.forEach((record) => {
            const key = monthKeyFromDate(record.date)
            if (!key) {
              return
            }
            if (metric === 'deals' && record.status !== 'deal') {
              return
            }
            if (metric === 'pullouts' && record.status !== 'pulled-out') {
              return
            }
            if (record.clientName !== clientEntity.name) {
              return
            }
            perMonth[key] = (perMonth[key] || 0) + 1
          })
        }
        const monthKeys = Object.keys(perMonth)
        if (!monthKeys.length) {
          if (hasRoles) {
            return `${clientEntity.name} has roles on your desk, but not enough dated activity to calculate monthly ${metricLabel}.`
          }
          return `I have some data for your desk, but not enough date information to calculate monthly ${metricLabel} for ${clientEntity.name}.`
        }
        if (asksForHighestMonth) {
          let bestKey = monthKeys[0]
          let bestValue = perMonth[bestKey]
          monthKeys.slice(1).forEach((key) => {
            if (perMonth[key] > bestValue) {
              bestKey = key
              bestValue = perMonth[key]
            }
          })
          const label = formatMonthKeyLabel(bestKey)
          return `${clientEntity.name}'s highest ${metricLabel} month on your desk was ${label} with ${bestValue} ${metricLabel}.`
        }
        if (asksForAverageMonthly) {
          const total = monthKeys.reduce((sum, key) => sum + perMonth[key], 0)
          const average = total / monthKeys.length
          return `${clientEntity.name} averages ${average.toFixed(
            1,
          )} ${metricLabel} per month on your desk based on ${monthKeys.length} month(s) of data.`
        }
        if (asksForThisMonth) {
          const now = new Date()
          const monthKey = `${now.getFullYear()}-${String(
            now.getMonth() + 1,
          ).padStart(2, '0')}`
          const value = perMonth[monthKey] || 0
          return `${clientEntity.name} has ${value} ${metricLabel} in the current month so far on your desk.`
        }
      }
      if (metric === 'deals' || metric === 'pullouts') {
        const baseTotal = entries.reduce(
          (sum, entry) => sum + (entry[metric] || 0),
          0,
        )
        const extraFromDealsLog = dealsLog.reduce((sum, record) => {
          if (record.clientName !== clientEntity.name) {
            return sum
          }
          if (metric === 'deals' && record.status === 'deal') {
            return sum + 1
          }
          if (metric === 'pullouts' && record.status === 'pulled-out') {
            return sum + 1
          }
          return sum
        }, 0)
        const totalAllTimeClient = baseTotal + extraFromDealsLog
        if (!totalAllTimeClient && !hasRoles) {
          return `I do not have enough data yet to answer this for ${clientEntity.name}.`
        }
        return `${clientEntity.name} has ${totalAllTimeClient} ${metricLabel} in total across your desk, with ${rolesForClient.length} roles associated with this client.`
      }
      const totalAllTime = entries.reduce(
        (sum, entry) => sum + (entry[metric] || 0),
        0,
      )
      if (!totalAllTime && !hasRoles) {
        return `I do not have enough data yet to answer this for ${clientEntity.name}.`
      }
      return `${clientEntity.name} has ${totalAllTime} ${metricLabel} in total across your desk, with ${rolesForClient.length} roles associated with this client.`
    }
    return 'I could not understand this question. Try asking about submissions, interviews, deals, pull outs, or roles with a recruiter, client, or your overall desk.'
  }

  const handleOpenModal = (key) => {
    if (key === 'new-role') {
      setNewRoleForm({
        name: '',
        client: '',
        releasedDate: '',
        remarks: '',
      })
    }

    if (key === 'daily-submission') {
      setSubmissionDrafts(
        activeRecruiters.reduce(
          (acc, recruiter) => ({
            ...acc,
            [recruiter.id]:
              submissionDrafts[recruiter.id] || {
                submissions: '',
                interviews: '',
              },
          }),
          {},
        ),
      )
    }

    if (key === 'status-update') {
      setActiveStatusTab('role')
      setStatusRoleForm({
        roleId: '',
        status: 'Active',
        subStatus: ROLE_SUB_STATUS_OPTIONS.Active[0],
        remarks: '',
      })
      setStatusMetricForm({
        recruiterId: '',
        date: selectedDateKey,
        quantity: '',
        candidateName: '',
        clientName: '',
        roleId: '',
        selectedDealId: '',
      })
    }

    if (key === 'analyze') {
      setAnalyzeTargetType('recruiter')
      setAnalyzeRecruiterId('')
      setAnalyzeClientName('')
      setAnalyzeRange('week')
      setAnalyzeCustomRangeStart('')
      setAnalyzeCustomRangeEnd('')
    }

    setActiveModal(key)
  }

  const handleCloseModal = () => {
    setActiveModal(null)
  }

  const handleOpenManagePassword = () => {
    setManagePassword('')
    setManagePasswordError('')
    setActiveModal('manage-password')
  }

  const handleManagePasswordSubmit = (event) => {
    event.preventDefault()

    if (managePassword === '9977') {
      setManagePassword('')
      setManagePasswordError('')
      setActiveModal('manage-people')
      return
    }

    setManagePasswordError('Incorrect password. Try again.')
  }

  const handleNewRoleSave = () => {
    if (
      !newRoleForm.name ||
      !newRoleForm.client ||
      !newRoleForm.releasedDate ||
      !newRoleForm.recruiterId
    ) {
      return
    }

    const role = {
      id: `role-${Date.now()}`,
      name: newRoleForm.name,
      client: newRoleForm.client,
      recruiterId: newRoleForm.recruiterId,
      releasedDate: newRoleForm.releasedDate,
      remarks: newRoleForm.remarks,
      status: 'Active',
      subStatus: ROLE_SUB_STATUS_OPTIONS.Active[0],
    }

    setRoles((prev) => [...prev, role])
    setActiveModal(null)
  }

  const handleSubmissionChange = (recruiterId, field, value) => {
    setSubmissionDrafts((prev) => ({
      ...prev,
      [recruiterId]: {
        ...prev[recruiterId],
        [field]: value.replace(/[^0-9]/g, ''),
      },
    }))
  }

  const handleSubmissionSave = () => {
    const newEntries = Object.entries(submissionDrafts)
      .map(([recruiterId, values]) => {
        const submissions = parseInt(values.submissions || '0', 10)
        const interviews = parseInt(values.interviews || '0', 10)

        if (
          submissions === 0 &&
          interviews === 0
        ) {
          return null
        }

        return {
          id: `entry-${recruiterId}-${selectedDateKey}-${Date.now()}`,
          date: selectedDateKey,
          recruiterId,
          submissions,
          interviews,
          deals: 0,
          pullouts: 0,
        }
      })
      .filter(Boolean)

    if (newEntries.length === 0) {
      return
    }

    setEntries((prev) => [...prev, ...newEntries])
    setActiveModal(null)
  }

  const handleStatusRoleSave = () => {
    if (!statusRoleForm.roleId) {
      return
    }

    const allowedSubStatuses = ROLE_SUB_STATUS_OPTIONS[statusRoleForm.status]
    if (allowedSubStatuses && !allowedSubStatuses.includes(statusRoleForm.subStatus)) {
      return
    }

    setRoles((prev) =>
      prev.map((role) =>
        role.id === statusRoleForm.roleId
          ? {
              ...role,
              status: statusRoleForm.status,
              subStatus: statusRoleForm.subStatus,
              remarks: statusRoleForm.remarks || role.remarks,
            }
          : role,
      ),
    )

    if (statusRoleForm.remarks && statusRoleForm.remarks.trim()) {
      const analysis = analyzeRoleRemark(statusRoleForm.remarks)
      const selectedRole = roles.find(
        (role) => role.id === statusRoleForm.roleId,
      )

      setRoleIssueInsights((prev) => [
        ...prev,
        {
          id: `issue-${statusRoleForm.roleId}-${prev.length + 1}`,
          roleId: statusRoleForm.roleId,
          client: selectedRole ? selectedRole.client : '',
          status: statusRoleForm.status,
          subStatus: statusRoleForm.subStatus,
          date: todayKey,
          categories: analysis.categories,
          tags: analysis.tags,
          severity: analysis.severity,
          isRisk: analysis.isRisk,
          remark: statusRoleForm.remarks.trim(),
        },
      ])
    }

    setActiveModal(null)
  }

  const handleSaveDealFromStatus = () => {
    if (
      !statusMetricForm.recruiterId ||
      !statusMetricForm.candidateName.trim() ||
      !statusMetricForm.clientName ||
      !statusMetricForm.roleId
    ) {
      return
    }

    const dateKey = statusMetricForm.date || selectedDateKey
    const role = roles.find((item) => item.id === statusMetricForm.roleId)

    if (!role) {
      return
    }

    const candidateNameTrimmed = statusMetricForm.candidateName.trim()

    setDealsLog((prev) => [
      ...prev,
      {
        id: `deal-${statusMetricForm.recruiterId}-${dateKey}-${prev.length + 1}`,
        recruiterId: statusMetricForm.recruiterId,
        candidateName: candidateNameTrimmed,
        clientName: statusMetricForm.clientName,
        roleId: statusMetricForm.roleId,
        roleName: role.name,
        date: dateKey,
        status: 'deal',
      },
    ])

    setRoles((prev) =>
      prev.map((item) =>
        item.id === statusMetricForm.roleId
          ? { ...item, status: 'Closed', subStatus: 'Deal' }
          : item,
      ),
    )

    setActiveModal(null)
  }

  const handleSavePulloutFromStatus = () => {
    if (!statusMetricForm.selectedDealId) {
      return
    }

    const selectedDeal = dealsLog.find(
      (record) => record.id === statusMetricForm.selectedDealId,
    )

    if (!selectedDeal) {
      return
    }

    setDealsLog((prev) =>
      prev.map((record) =>
        record.id === statusMetricForm.selectedDealId
          ? {
              ...record,
              status: 'pulled-out',
              pulledOutDate: selectedDateKey,
            }
          : record,
      ),
    )

    setRoles((prev) =>
      prev.map((item) =>
        item.id === selectedDeal.roleId
          ? { ...item, status: 'Active', subStatus: 'Open' }
          : item,
      ),
    )

    setActiveModal(null)
  }

  const handleStatusMetricSave = () => {
    if (activeStatusTab === 'deal') {
      handleSaveDealFromStatus()
      return
    }

    if (activeStatusTab === 'pullout') {
      handleSavePulloutFromStatus()
      return
    }

    if (!statusMetricForm.recruiterId || !statusMetricForm.quantity) {
      return
    }

    const quantity = parseInt(statusMetricForm.quantity || '0', 10)

    if (Number.isNaN(quantity) || quantity <= 0) {
      return
    }

    const dateKey = statusMetricForm.date || selectedDateKey

    setEntries((prev) => [
      ...prev,
      {
        id: `metric-${activeStatusTab}-${statusMetricForm.recruiterId}-${dateKey}-${prev.length + 1}`,
        date: dateKey,
        recruiterId: statusMetricForm.recruiterId,
        submissions: 0,
        interviews: quantity,
        deals: 0,
        pullouts: 0,
      },
    ])
    setActiveModal(null)
  }

  const handleOpenRoleStatusEditor = (role) => {
    const allowedSubStatuses = ROLE_SUB_STATUS_OPTIONS[role.status] || []
    const nextSubStatus = allowedSubStatuses.includes(role.subStatus)
      ? role.subStatus
      : allowedSubStatuses[0] || ''

    setActiveStatusTab('role')
    setStatusRoleForm({
      roleId: role.id,
      status: role.status,
      subStatus: nextSubStatus,
      remarks: '',
    })
    setActiveModal('status-update')
  }

  const handleAddRecruiter = () => {
    const trimmed = newRecruiterName.trim()
    if (!trimmed) {
      return
    }

    setRecruiters((prev) => {
      const nextIndex = prev.length + 1
      const id = `rec-${nextIndex}`

      setSubmissionDrafts((drafts) => ({
        ...drafts,
        [id]: drafts[id] || {
          submissions: '',
          interviews: '',
          deals: '',
          pullouts: '',
        },
      }))

      return [...prev, { id, name: trimmed, active: true }]
    })

    setNewRecruiterName('')
  }

  const handleAddClient = () => {
    const trimmed = newClientName.trim()
    if (!trimmed) {
      return
    }

    setClients((prev) => {
      if (prev.some((client) => client.name === trimmed)) {
        return prev
      }

      const nextIndex = prev.length + 1

      return [
        ...prev,
        { id: `client-${nextIndex}`, name: trimmed, active: true },
      ]
    })
    setNewClientName('')
  }

  const handleToggleRecruiterActive = (recruiterId) => {
    setRecruiters((prev) =>
      prev.map((recruiter) =>
        recruiter.id === recruiterId
          ? { ...recruiter, active: !recruiter.active }
          : recruiter,
      ),
    )
  }

  const handleRecruiterNameChange = (recruiterId, name) => {
    setRecruiters((prev) =>
      prev.map((recruiter) =>
        recruiter.id === recruiterId ? { ...recruiter, name } : recruiter,
      ),
    )
  }

  const handleDeleteRecruiter = (recruiterId) => {
    setRecruiters((prev) =>
      prev.filter((recruiter) => recruiter.id !== recruiterId),
    )
    setSubmissionDrafts((prev) => {
      const next = { ...prev }
      delete next[recruiterId]
      return next
    })
  }

  const handleToggleClientActive = (clientId) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId ? { ...client, active: !client.active } : client,
      ),
    )
  }

  const handleClientNameChange = (clientId, name) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId ? { ...client, name } : client,
      ),
    )
  }

  const handleDeleteClient = (clientId) => {
    setClients((prev) =>
      prev.filter((client) => client.id !== clientId),
    )
  }

  const activeRoles = roles.filter((role) => role.status === 'Active')

  const activeDeals = dealsLog.filter((record) => record.status === 'deal')

  const rolesSidebarFiltered = roles.filter((role) => {
    if (rolesSidebarStatus === 'Active' && role.status !== 'Active') {
      return false
    }

    if (rolesSidebarStatus === 'Closed' && role.status !== 'Closed') {
      return false
    }

    if (rolesSidebarClientFilter && role.client !== rolesSidebarClientFilter) {
      return false
    }

    return true
  })

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-badge">RD</div>
          <div className="sidebar-title">
            <span className="sidebar-title-main">Recruiter&apos;s Diary</span>
            <span className="sidebar-title-sub">Daily workflow hub</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            type="button"
            className={
              activeSidebarSection === 'home'
                ? 'sidebar-item sidebar-item-active'
                : 'sidebar-item'
            }
            onClick={() => setActiveSidebarSection('home')}
          >
            <span className="sidebar-item-dot" />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={
              activeSidebarSection === 'recruiters'
                ? 'sidebar-item sidebar-item-active'
                : 'sidebar-item'
            }
            onClick={() => setActiveSidebarSection('recruiters')}
          >
            <span className="sidebar-item-dot" />
            <span>Recruiters</span>
          </button>
          <button
            type="button"
            className={
              activeSidebarSection === 'clients'
                ? 'sidebar-item sidebar-item-active'
                : 'sidebar-item'
            }
            onClick={() => setActiveSidebarSection('clients')}
          >
            <span className="sidebar-item-dot" />
            <span>Clients</span>
          </button>
          <button
            type="button"
            className={
              activeSidebarSection === 'roles'
                ? 'sidebar-item sidebar-item-active'
                : 'sidebar-item'
            }
            onClick={() => setActiveSidebarSection('roles')}
          >
            <span className="sidebar-item-dot" />
            <span>Roles</span>
          </button>
          <button
            type="button"
            className={
              activeSidebarSection === 'deals'
                ? 'sidebar-item sidebar-item-active'
                : 'sidebar-item'
            }
            onClick={() => setActiveSidebarSection('deals')}
          >
            <span className="sidebar-item-dot" />
            <span>Deals</span>
          </button>
          <button
            type="button"
            className={
              activeSidebarSection === 'analytics'
                ? 'sidebar-item sidebar-item-active'
                : 'sidebar-item'
            }
            onClick={() => setActiveSidebarSection('analytics')}
          >
            <span className="sidebar-item-dot" />
            <span>Analytics</span>
          </button>
          <button
            type="button"
            className="sidebar-item sidebar-item-manage"
            onClick={handleOpenManagePassword}
          >
            <span className="sidebar-item-dot" />
            <span>Manage list</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-label">Today</span>
          <span className="sidebar-footer-date">
            {today.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </aside>

      <main className="main">
        <header className="main-header">
          <div className="main-header-text">
            <h1>Daily Recruitment Diary</h1>
            <p>
              Capture roles, submissions, and status updates in a single, calm workspace.
            </p>
          </div>

          <div className="week-calendar">
            <button
              type="button"
              className="week-nav-arrow week-nav-arrow-left"
              onClick={() =>
                setWeekOffset((previous) => previous - 1)
              }
            >
              <span aria-hidden="true">‹</span>
            </button>
            {weekDays.map((day) => {
              const summary = dateSummaries[day.key]
              const hasSummary =
                summary &&
                (summary.submissions ||
                  summary.interviews ||
                  summary.deals ||
                  summary.pullouts)

              const isSelected = day.key === selectedDateKey

              return (
                <div
                  key={day.key}
                  className={
                    isSelected ? 'week-day week-day-today' : 'week-day'
                  }
                  onClick={() => setSelectedDateKey(day.key)}
                >
                  <span className="week-day-label">{day.label}</span>
                  <span className="week-day-number">{day.day}</span>
                  {hasSummary && (
                    <span className="week-day-metric">
                      {[
                        summary.submissions
                          ? `${summary.submissions} sub`
                          : null,
                        summary.interviews
                          ? `${summary.interviews} int`
                          : null,
                        summary.deals ? `${summary.deals} deal` : null,
                        summary.pullouts ? `${summary.pullouts} pull` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              className="week-nav-arrow week-nav-arrow-right"
              onClick={() =>
                setWeekOffset((previous) => previous + 1)
              }
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </header>

        {activeSidebarSection === 'home' && (
          <section className="dashboard">
            <div className="dashboard-header">
              <span className="dashboard-chip">Today&apos;s Focus</span>
              <span className="dashboard-subtitle">
                Choose what you want to work on right now.
              </span>
            </div>

            <div className="dashboard-grid">
              {dashboardActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="dashboard-card"
                  onClick={() => handleOpenModal(action.key)}
                >
                  <span className="dashboard-card-title">{action.title}</span>
                  <span className="dashboard-card-description">
                    {action.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {activeSidebarSection === 'recruiters' && (
          <section className="people-list-section">
            <div className="people-list-header">
              <h2>Recruiters</h2>
              <p>Overview of all recruiters on your desk right now.</p>
            </div>
            <div className="people-stats-bar">
              <div className="people-stats-context">
                <span>
                  {focusedRecruiterId
                    ? `Showing: ${
                        recruiters.find(
                          (recruiter) => recruiter.id === focusedRecruiterId,
                        )?.name || 'Selected recruiter'
                      }`
                    : 'Showing: All recruiters'}
                </span>
                {focusedRecruiterId && (
                  <button
                    type="button"
                    onClick={() => setFocusedRecruiterId('')}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="people-stats-metrics">
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Roles assigned</span>
                <span className="people-stats-metric-value">
                  {recruiterAssignedRolesCount}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Submissions</span>
                <span className="people-stats-metric-value">
                  {recruiterStats.submissions}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Interviews</span>
                <span className="people-stats-metric-value">
                  {recruiterStats.interviews}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Deals</span>
                <span className="people-stats-metric-value">
                  {recruiterStats.deals}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Pull outs</span>
                <span className="people-stats-metric-value">
                  {recruiterStats.pullouts}
                </span>
              </div>
            </div>
            <div className="people-list-grid">
              {recruiters.length === 0 ? (
                <div className="people-list-empty">
                  No recruiters yet. Use Manage list to add your team.
                </div>
              ) : (
                recruiters.map((recruiter) => (
                  <div
                    key={recruiter.id}
                    className={
                      recruiter.active
                        ? 'people-list-card'
                        : 'people-list-card people-list-card-inactive'
                    }
                    onClick={() => {
                      setFocusedRecruiterId(recruiter.id)
                    }}
                  >
                    <div className="people-list-name">{recruiter.name}</div>
                    <div className="people-list-meta">
                      <span
                        className={
                          recruiter.active
                            ? 'people-status-pill people-status-pill-active'
                            : 'people-status-pill'
                        }
                      >
                        {recruiter.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
        {activeSidebarSection === 'clients' && (
          <section className="people-list-section">
            <div className="people-list-header">
              <h2>Clients</h2>
              <p>Clients you are currently supporting with roles.</p>
            </div>
            <div className="people-stats-bar">
              <div className="people-stats-context">
                <span>
                  {focusedClientName
                    ? `Showing: ${focusedClientName}`
                    : 'Showing: All clients'}
                </span>
                {focusedClientName && (
                  <button type="button" onClick={() => setFocusedClientName('')}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="people-stats-metrics">
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Active roles</span>
                <span className="people-stats-metric-value">
                  {clientActiveRoles.length}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Closed roles</span>
                <span className="people-stats-metric-value">
                  {clientClosedRoles.length}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Issue notes</span>
                <span className="people-stats-metric-value">
                  {filteredClientRoleIssueInsights.length}
                </span>
              </div>
              <div className="people-stats-metric">
                <span className="people-stats-metric-label">Risk notes</span>
                <span className="people-stats-metric-value">
                  {clientRiskNotes.length}
                </span>
              </div>
            </div>
            <div className="people-list-grid">
              {clients.length === 0 ? (
                <div className="people-list-empty">
                  No clients yet. Use Manage list to add your clients.
                </div>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    className={
                      client.active
                        ? 'people-list-card'
                        : 'people-list-card people-list-card-inactive'
                    }
                    onClick={() => {
                      setFocusedClientName(client.name)
                    }}
                  >
                    <div className="people-list-name">{client.name}</div>
                    <div className="people-list-meta">
                      <span
                        className={
                          client.active
                            ? 'people-status-pill people-status-pill-active'
                            : 'people-status-pill'
                        }
                      >
                        {client.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
        {activeSidebarSection === 'roles' && (
          <section className="people-list-section">
            <div className="people-list-header">
              <h2>Roles</h2>
              <p>View roles by status and client, and update their status.</p>
            </div>
            <div className="people-stats-bar">
              <div className="people-stats-context">
                <span>
                  {rolesSidebarStatus === 'Active'
                    ? 'Showing: Active roles'
                    : 'Showing: Closed roles'}
                  {rolesSidebarClientFilter
                    ? ` · Client: ${rolesSidebarClientFilter}`
                    : ''}
                </span>
              </div>
              <div className="people-stats-context">
                <select
                  value={rolesSidebarStatus}
                  onChange={(event) => setRolesSidebarStatus(event.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
                <select
                  value={rolesSidebarClientFilter}
                  onChange={(event) =>
                    setRolesSidebarClientFilter(event.target.value)
                  }
                >
                  <option value="">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="people-list-grid">
              {rolesSidebarFiltered.length === 0 ? (
                <div className="people-list-empty">
                  No roles match the selected filters.
                </div>
              ) : (
                rolesSidebarFiltered.map((role) => {
                  const assignedRecruiter = recruiters.find(
                    (recruiter) => recruiter.id === role.recruiterId,
                  )

                  return (
                    <div key={role.id} className="people-list-card">
                      <div className="people-list-name">{role.name}</div>
                      <div className="people-list-meta">
                        <span className="people-list-submeta">
                          Client · {role.client}
                        </span>
                        {assignedRecruiter && (
                          <span className="people-list-submeta">
                            Recruiter · {assignedRecruiter.name}
                          </span>
                        )}
                        <span
                          className={
                            role.status === 'Active'
                              ? 'people-status-pill people-status-pill-active'
                              : 'people-status-pill'
                          }
                        >
                          {role.status}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary btn-compact"
                          onClick={() => handleOpenRoleStatusEditor(role)}
                        >
                          Edit
                        </button>
                      </div>
                      {role.remarks && (
                        <div className="people-list-remark">
                          {role.remarks}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}
        {activeSidebarSection === 'deals' && (
          <section className="people-list-section">
            <div className="people-list-header">
              <h2>Deals</h2>
              <p>View recent deals and pull outs with candidate-level detail.</p>
            </div>
            {dealsLog.length === 0 ? (
              <div className="people-list-empty">No deals recorded yet.</div>
            ) : (
              <div className="submission-table">
                <div className="submission-row submission-row-header">
                  <div>Candidate</div>
                  <div>Role</div>
                  <div>Client</div>
                  <div>Recruiter</div>
                  <div>Date</div>
                  <div>Status</div>
                </div>
                {dealsLog
                  .slice()
                  .reverse()
                  .map((record) => {
                    const recruiter = recruiters.find(
                      (recruiter) => recruiter.id === record.recruiterId,
                    )
                    return (
                      <div
                        key={record.id}
                        className="submission-row submission-row-body"
                      >
                        <div className="submission-cell-name">
                          <span>{record.candidateName}</span>
                        </div>
                        <div>
                          <span>{record.roleName}</span>
                        </div>
                        <div>
                          <span>{record.clientName}</span>
                        </div>
                        <div>
                          <span>{recruiter ? recruiter.name : ''}</span>
                        </div>
                        <div>
                          <span>{record.date}</span>
                        </div>
                        <div>
                          <span>
                            {record.status === 'pulled-out' ? 'Pull out' : 'Deal'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>
        )}
        {activeSidebarSection === 'analytics' && (
          <section className="people-list-section analytics-section-main">
            <div className="people-list-header">
              <h2>Analytics</h2>
              <p>Full view of performance, roles, and risk with filters.</p>
            </div>
            <div className="analytics-overview-grid">
              <div className="people-list-card">
                <div className="people-list-name">Active roles</div>
                <div className="people-list-meta">
                  <span className="people-list-metric">
                    {activeRoles.length}
                  </span>
                </div>
              </div>
              <div className="people-list-card">
                <div className="people-list-name">Recruiters</div>
                <div className="people-list-meta">
                  <span className="people-list-metric">
                    {activeRecruiters.length} active
                  </span>
                </div>
              </div>
              <div className="people-list-card">
                <div className="people-list-name">Clients</div>
                <div className="people-list-meta">
                  <span className="people-list-metric">
                    {activeClients.length} active
                  </span>
                </div>
              </div>
            </div>
            <div className="analytics-layout">
              <div className="analytics-panel">
                <div className="analytics-panel-header">
                  <h3>Recruiter performance</h3>
                  <div className="analytics-panel-controls">
                    <select
                      value={focusedRecruiterId}
                      onChange={(event) =>
                        setFocusedRecruiterId(event.target.value)
                      }
                    >
                      <option value="">All recruiters</option>
                      {activeRecruiters.map((recruiter) => (
                        <option key={recruiter.id} value={recruiter.id}>
                          {recruiter.name}
                        </option>
                      ))}
                    </select>
                    <div className="analytics-range-toggle">
                      <button
                        type="button"
                        className={
                          recruiterStatsRange === 'today'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setRecruiterStatsRange('today')}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        className={
                          recruiterStatsRange === 'week'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setRecruiterStatsRange('week')}
                      >
                        This week
                      </button>
                      <button
                        type="button"
                        className={
                          recruiterStatsRange === 'month'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setRecruiterStatsRange('month')}
                      >
                        This month
                      </button>
                      <button
                        type="button"
                        className={
                          recruiterStatsRange === 'all'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setRecruiterStatsRange('all')}
                      >
                        All time
                      </button>
                      <button
                        type="button"
                        className={
                          recruiterStatsRange === 'custom'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => {
                          setRecruiterStatsRange('custom')
                          if (!recruiterCustomRangeStart && !recruiterCustomRangeEnd) {
                            const monthStart = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              1,
                            )
                            setRecruiterCustomRangeStart(
                              monthStart.toISOString().slice(0, 10),
                            )
                            setRecruiterCustomRangeEnd(todayKey)
                          }
                        }}
                      >
                        Custom
                      </button>
                    </div>
                    {recruiterStatsRange === 'custom' && (
                      <div className="analytics-custom-range">
                        <span>From</span>
                        <input
                          type="date"
                          value={recruiterCustomRangeStart}
                          onChange={(event) =>
                            setRecruiterCustomRangeStart(event.target.value)
                          }
                        />
                        <span>To</span>
                        <input
                          type="date"
                          value={recruiterCustomRangeEnd}
                          onChange={(event) =>
                            setRecruiterCustomRangeEnd(event.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="people-stats-metrics">
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Submissions</span>
                    <span className="people-stats-metric-value">
                      {recruiterStats.submissions}
                    </span>
                  </div>
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Interviews</span>
                    <span className="people-stats-metric-value">
                      {recruiterStats.interviews}
                    </span>
                  </div>
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Deals</span>
                    <span className="people-stats-metric-value">
                      {recruiterStats.deals}
                    </span>
                  </div>
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Pull outs</span>
                    <span className="people-stats-metric-value">
                      {recruiterStats.pullouts}
                    </span>
                  </div>
                </div>
              </div>
              <div className="analytics-panel">
                <div className="analytics-panel-header">
                  <h3>Client health</h3>
                  <div className="analytics-panel-controls">
                    <select
                      value={focusedClientName}
                      onChange={(event) =>
                        setFocusedClientName(event.target.value)
                      }
                    >
                      <option value="">All clients</option>
                      {activeClients.map((client) => (
                        <option key={client.id} value={client.name}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <div className="analytics-range-toggle">
                      <button
                        type="button"
                        className={
                          clientStatsRange === 'today'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setClientStatsRange('today')}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        className={
                          clientStatsRange === 'week'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setClientStatsRange('week')}
                      >
                        This week
                      </button>
                      <button
                        type="button"
                        className={
                          clientStatsRange === 'month'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setClientStatsRange('month')}
                      >
                        This month
                      </button>
                      <button
                        type="button"
                        className={
                          clientStatsRange === 'all'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => setClientStatsRange('all')}
                      >
                        All time
                      </button>
                      <button
                        type="button"
                        className={
                          clientStatsRange === 'custom'
                            ? 'analytics-range-chip analytics-range-chip-active'
                            : 'analytics-range-chip'
                        }
                        onClick={() => {
                          setClientStatsRange('custom')
                          if (!clientCustomRangeStart && !clientCustomRangeEnd) {
                            const monthStart = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              1,
                            )
                            setClientCustomRangeStart(
                              monthStart.toISOString().slice(0, 10),
                            )
                            setClientCustomRangeEnd(todayKey)
                          }
                        }}
                      >
                        Custom
                      </button>
                    </div>
                    {clientStatsRange === 'custom' && (
                      <div className="analytics-custom-range">
                        <span>From</span>
                        <input
                          type="date"
                          value={clientCustomRangeStart}
                          onChange={(event) =>
                            setClientCustomRangeStart(event.target.value)
                          }
                        />
                        <span>To</span>
                        <input
                          type="date"
                          value={clientCustomRangeEnd}
                          onChange={(event) =>
                            setClientCustomRangeEnd(event.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="people-stats-metrics">
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Active roles</span>
                    <span className="people-stats-metric-value">
                      {clientActiveRoles.length}
                    </span>
                  </div>
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Closed roles</span>
                    <span className="people-stats-metric-value">
                      {clientClosedRoles.length}
                    </span>
                  </div>
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Interviews</span>
                    <span className="people-stats-metric-value">
                      {clientDeskStats.interviews}
                    </span>
                  </div>
                  <div className="people-stats-metric">
                    <span className="people-stats-metric-label">Deals</span>
                    <span className="people-stats-metric-value">
                      {clientDeskStats.deals}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="analytics-issues-section">
              <div className="analytics-section-title">Recent notes</div>
              <div className="analytics-issue-list">
                {filteredClientRoleIssueInsights.length === 0 ? (
                  <div className="analytics-empty">
                    No insights for the selected filters.
                  </div>
                ) : (
                  filteredClientRoleIssueInsights
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .map((insight) => (
                      <div
                        key={insight.id}
                        className="analytics-issue-item"
                      >
                        <div className="analytics-issue-header">
                          <span className="analytics-issue-role">
                            {insight.client
                              ? `${insight.client} role`
                              : 'Role update'}
                          </span>
                          <span className="analytics-issue-date">
                            {insight.date}
                          </span>
                        </div>
                        <div className="analytics-issue-remark">
                          {insight.remark}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {activeModal === 'new-role' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal modal-glass"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>New Role</h2>
              <p>Add a new mandate to your active roles.</p>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="field">
                  <label>Role name</label>
                  <input
                    type="text"
                    value={newRoleForm.name}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Senior Product Manager"
                  />
                </div>
                <div className="field">
                  <label>Client</label>
                  <select
                    value={newRoleForm.client}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({
                        ...prev,
                        client: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select client</option>
                    {activeClients.map((client) => (
                      <option key={client.id} value={client.name}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Assign recruiter</label>
                  <select
                    value={newRoleForm.recruiterId}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({
                        ...prev,
                        recruiterId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select recruiter</option>
                    {activeRecruiters.map((recruiter) => (
                      <option key={recruiter.id} value={recruiter.id}>
                        {recruiter.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Role released date</label>
                  <input
                    type="date"
                    value={newRoleForm.releasedDate}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({
                        ...prev,
                        releasedDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field field-full">
                  <label>Remarks</label>
                  <textarea
                    rows="3"
                    value={newRoleForm.remarks}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({
                        ...prev,
                        remarks: event.target.value,
                      }))
                    }
                    placeholder="Priorities, key requirements, hiring manager notes..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleNewRoleSave}
              >
                Save role
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'daily-submission' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal modal-glass modal-wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Daily Submission</h2>
              <p>Log today&apos;s activity for each recruiter.</p>
            </div>
            <div className="modal-body">
              <div className="submission-date-label">
                {today.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="submission-table">
                <div className="submission-row submission-row-header">
                  <div>Recruiter</div>
                  <div>Submissions</div>
                  <div>Interviews</div>
                </div>
                {activeRecruiters.map((recruiter) => {
                  const values = submissionDrafts[recruiter.id] || {}
                  const rowClassName =
                    recruiter.id === focusedRecruiterId
                      ? 'submission-row submission-row-body submission-row-body-focused'
                      : 'submission-row submission-row-body'
                  return (
                    <div key={recruiter.id} className={rowClassName}>
                      <div className="submission-cell-name">
                        <span>{recruiter.name}</span>
                      </div>
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={values.submissions || ''}
                          onChange={(event) =>
                            handleSubmissionChange(
                              recruiter.id,
                              'submissions',
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={values.interviews || ''}
                          onChange={(event) =>
                            handleSubmissionChange(
                              recruiter.id,
                              'interviews',
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmissionSave}
              >
                Save activity
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'status-update' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal modal-glass modal-wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Status update</h2>
              <p>Capture quick updates across roles, deals, pull outs, and interviews.</p>
            </div>
            <div className="modal-tabs">
              <button
                type="button"
                className={
                  activeStatusTab === 'role'
                    ? 'modal-tab modal-tab-active'
                    : 'modal-tab'
                }
                onClick={() => setActiveStatusTab('role')}
              >
                Roles status update
              </button>
              <button
                type="button"
                className={
                  activeStatusTab === 'deal'
                    ? 'modal-tab modal-tab-active'
                    : 'modal-tab'
                }
                onClick={() => setActiveStatusTab('deal')}
              >
                Deal update
              </button>
              <button
                type="button"
                className={
                  activeStatusTab === 'pullout'
                    ? 'modal-tab modal-tab-active'
                    : 'modal-tab'
                }
                onClick={() => setActiveStatusTab('pullout')}
              >
                Pull out update
              </button>
              <button
                type="button"
                className={
                  activeStatusTab === 'interview'
                    ? 'modal-tab modal-tab-active'
                    : 'modal-tab'
                }
                onClick={() => setActiveStatusTab('interview')}
              >
                Interview update
              </button>
            </div>

            {activeStatusTab === 'role' && (
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="field">
                    <label>Role</label>
                    <select
                      value={statusRoleForm.roleId}
                      onChange={(event) =>
                        setStatusRoleForm((prev) => ({
                          ...prev,
                          roleId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} · {role.client}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Role status</label>
                    <select
                      value={statusRoleForm.status}
                      onChange={(event) =>
                        setStatusRoleForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                          subStatus:
                            ROLE_SUB_STATUS_OPTIONS[event.target.value]?.[0] || '',
                        }))
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Sub status</label>
                    <select
                      value={statusRoleForm.subStatus}
                      onChange={(event) =>
                        setStatusRoleForm((prev) => ({
                          ...prev,
                          subStatus: event.target.value,
                        }))
                      }
                    >
                      {(ROLE_SUB_STATUS_OPTIONS[statusRoleForm.status] || []).map(
                        (option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="field field-full">
                    <label>Remarks</label>
                    <textarea
                      rows="3"
                      value={statusRoleForm.remarks}
                      onChange={(event) =>
                        setStatusRoleForm((prev) => ({
                          ...prev,
                          remarks: event.target.value,
                        }))
                      }
                      placeholder="Notes about status change, context, client feedback..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStatusTab === 'deal' && (
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="field">
                    <label>Recruiter</label>
                    <select
                      value={statusMetricForm.recruiterId}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          recruiterId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select recruiter</option>
                      {activeRecruiters.map((recruiter) => (
                        <option key={recruiter.id} value={recruiter.id}>
                          {recruiter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input
                      type="date"
                      value={statusMetricForm.date}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field field-full">
                    <label>Candidate name</label>
                    <input
                      type="text"
                      value={statusMetricForm.candidateName}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          candidateName: event.target.value,
                        }))
                      }
                      placeholder="Candidate full name"
                    />
                  </div>
                  <div className="field">
                    <label>Client</label>
                    <select
                      value={statusMetricForm.clientName}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          clientName: event.target.value,
                          roleId: '',
                        }))
                      }
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.name}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Role</label>
                    <select
                      value={statusMetricForm.roleId}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          roleId: event.target.value,
                        }))
                      }
                      disabled={!statusMetricForm.clientName}
                    >
                      <option value="">
                        {statusMetricForm.clientName
                          ? 'Select active role'
                          : 'Select client first'}
                      </option>
                      {roles
                        .filter(
                          (role) =>
                            role.status === 'Active' &&
                            (!statusMetricForm.clientName ||
                              role.client === statusMetricForm.clientName),
                        )
                        .map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeStatusTab === 'pullout' && (
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="field field-full">
                    <label>Choose candidate to mark as pull out</label>
                    <select
                      value={statusMetricForm.selectedDealId}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          selectedDealId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select candidate</option>
                      {activeDeals.map((record) => {
                        const recruiter = recruiters.find(
                          (recruiter) => recruiter.id === record.recruiterId,
                        )
                        return (
                          <option key={record.id} value={record.id}>
                            {record.candidateName} · {record.roleName} ·{' '}
                            {record.clientName} · {recruiter ? recruiter.name : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  {statusMetricForm.selectedDealId && (
                    <div className="field field-full">
                      <label>Confirmation</label>
                      <div className="status-summary">
                        {(() => {
                          const record = activeDeals.find(
                            (item) => item.id === statusMetricForm.selectedDealId,
                          )
                          if (!record) {
                            return null
                          }
                          const recruiter = recruiters.find(
                            (recruiter) => recruiter.id === record.recruiterId,
                          )
                          return (
                            <span>
                              Mark {record.candidateName} for role {record.roleName} (
                              {record.clientName}) with recruiter{' '}
                              {recruiter ? recruiter.name : ''} as pull out?
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeStatusTab === 'interview' && (
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="field">
                    <label>Recruiter</label>
                    <select
                      value={statusMetricForm.recruiterId}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          recruiterId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select recruiter</option>
                      {activeRecruiters.map((recruiter) => (
                        <option key={recruiter.id} value={recruiter.id}>
                          {recruiter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input
                      type="date"
                      value={statusMetricForm.date}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={statusMetricForm.quantity}
                      onChange={(event) =>
                        setStatusMetricForm((prev) => ({
                          ...prev,
                          quantity: event.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              {activeStatusTab === 'role' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStatusRoleSave}
                >
                  Save role status
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStatusMetricSave}
                >
                  Save update
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'manage-password' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal modal-glass"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Enter password</h2>
              <p>Access to manage recruiters and clients is protected.</p>
            </div>
            <form className="modal-body" onSubmit={handleManagePasswordSubmit}>
              <div className="modal-grid">
                <div className="field field-full">
                  <label>Password</label>
                  <input
                    type="password"
                    value={managePassword}
                    onChange={(event) => setManagePassword(event.target.value)}
                    placeholder="Enter password"
                  />
                  {managePasswordError && (
                    <div className="field-error">{managePasswordError}</div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'manage-people' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal modal-glass modal-wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Manage recruiters &amp; clients</h2>
              <p>Keep your people and client list up to date.</p>
            </div>
            <div className="modal-body">
              <div className="manage-grid">
                <div className="manage-column">
                  <div className="manage-title">Recruiters</div>
                  <div className="manage-list">
                    {recruiters.map((recruiter) => (
                      <div key={recruiter.id} className="manage-item-row">
                        <button
                          type="button"
                          className={
                            recruiter.active
                              ? 'status-pill status-pill-active'
                              : 'status-pill'
                          }
                          onClick={() => handleToggleRecruiterActive(recruiter.id)}
                        >
                          {recruiter.active ? 'Active' : 'Inactive'}
                        </button>
                        <input
                          type="text"
                          className="manage-inline-input"
                          value={recruiter.name}
                          onChange={(event) =>
                            handleRecruiterNameChange(
                              recruiter.id,
                              event.target.value,
                            )
                          }
                        />
                        <button
                          type="button"
                          className="manage-delete"
                          onClick={() => handleDeleteRecruiter(recruiter.id)}
                          aria-label="Delete recruiter"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="manage-add-row">
                    <input
                      type="text"
                      value={newRecruiterName}
                      onChange={(event) =>
                        setNewRecruiterName(event.target.value)
                      }
                      placeholder="Add recruiter name"
                    />
                    <button
                      type="button"
                      className="btn-primary btn-compact"
                      onClick={handleAddRecruiter}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="manage-column">
                  <div className="manage-title">Clients</div>
                  <div className="manage-list">
                    {clients.map((client) => (
                      <div key={client.id} className="manage-item-row">
                        <button
                          type="button"
                          className={
                            client.active
                              ? 'status-pill status-pill-active'
                              : 'status-pill'
                          }
                          onClick={() => handleToggleClientActive(client.id)}
                        >
                          {client.active ? 'Active' : 'Inactive'}
                        </button>
                        <input
                          type="text"
                          className="manage-inline-input"
                          value={client.name}
                          onChange={(event) =>
                            handleClientNameChange(client.id, event.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="manage-delete"
                          onClick={() => handleDeleteClient(client.id)}
                          aria-label="Delete client"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="manage-add-row">
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(event) =>
                        setNewClientName(event.target.value)
                      }
                      placeholder="Add client name"
                    />
                    <button
                      type="button"
                      className="btn-primary btn-compact"
                      onClick={handleAddClient}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {activeModal === 'analyze' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal modal-glass modal-wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Run quick analysis</h2>
              <p>
                Choose whether to analyze a recruiter or client, then pick a
                time window to get feedback.
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-tabs">
                <button
                  type="button"
                  className={
                    analyzeTargetType === 'recruiter'
                      ? 'modal-tab modal-tab-active'
                      : 'modal-tab'
                  }
                  onClick={() => {
                    setAnalyzeTargetType('recruiter')
                    setAnalyzeClientName('')
                  }}
                >
                  Recruiter
                </button>
                <button
                  type="button"
                  className={
                    analyzeTargetType === 'client'
                      ? 'modal-tab modal-tab-active'
                      : 'modal-tab'
                  }
                  onClick={() => {
                    setAnalyzeTargetType('client')
                    setAnalyzeRecruiterId('')
                  }}
                >
                  Client
                </button>
              </div>
              <div className="modal-grid">
                {analyzeTargetType === 'recruiter' && (
                  <div className="field">
                    <label>Recruiter</label>
                    <select
                      value={analyzeRecruiterId}
                      onChange={(event) =>
                        setAnalyzeRecruiterId(event.target.value)
                      }
                    >
                      <option value="">Choose recruiter</option>
                      {activeRecruiters.map((recruiter) => (
                        <option key={recruiter.id} value={recruiter.id}>
                          {recruiter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {analyzeTargetType === 'client' && (
                  <div className="field">
                    <label>Client</label>
                    <select
                      value={analyzeClientName}
                      onChange={(event) =>
                        setAnalyzeClientName(event.target.value)
                      }
                    >
                      <option value="">Choose client</option>
                      {activeClients.map((client) => (
                        <option key={client.id} value={client.name}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Time window</label>
                  <div className="analytics-range-toggle">
                    <button
                      type="button"
                      className={
                        analyzeRange === 'today'
                          ? 'analytics-range-chip analytics-range-chip-active'
                          : 'analytics-range-chip'
                      }
                      onClick={() => setAnalyzeRange('today')}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className={
                        analyzeRange === 'week'
                          ? 'analytics-range-chip analytics-range-chip-active'
                          : 'analytics-range-chip'
                      }
                      onClick={() => setAnalyzeRange('week')}
                    >
                      This week
                    </button>
                    <button
                      type="button"
                      className={
                        analyzeRange === 'month'
                          ? 'analytics-range-chip analytics-range-chip-active'
                          : 'analytics-range-chip'
                      }
                      onClick={() => setAnalyzeRange('month')}
                    >
                      This month
                    </button>
                    <button
                      type="button"
                      className={
                        analyzeRange === 'all'
                          ? 'analytics-range-chip analytics-range-chip-active'
                          : 'analytics-range-chip'
                      }
                      onClick={() => setAnalyzeRange('all')}
                    >
                      Overall
                    </button>
                    <button
                      type="button"
                      className={
                        analyzeRange === 'custom'
                          ? 'analytics-range-chip analytics-range-chip-active'
                          : 'analytics-range-chip'
                      }
                      onClick={() => {
                        setAnalyzeRange('custom')
                        if (!analyzeCustomRangeStart && !analyzeCustomRangeEnd) {
                          const monthStart = new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            1,
                          )
                          setAnalyzeCustomRangeStart(
                            monthStart.toISOString().slice(0, 10),
                          )
                          setAnalyzeCustomRangeEnd(todayKey)
                        }
                      }}
                    >
                      Custom
                    </button>
                  </div>
                  {analyzeRange === 'custom' && (
                    <div className="analytics-custom-range">
                      <span>From</span>
                      <input
                        type="date"
                        value={analyzeCustomRangeStart}
                        onChange={(event) =>
                          setAnalyzeCustomRangeStart(event.target.value)
                        }
                      />
                      <span>To</span>
                      <input
                        type="date"
                        value={analyzeCustomRangeEnd}
                        onChange={(event) =>
                          setAnalyzeCustomRangeEnd(event.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="analytics-section">
                <div className="analytics-section-title">Analysis</div>
                {analyzeTargetType === 'recruiter' ? (
                  analyzeRecruiterId ? (
                    (() => {
                      const submissions = analyzeRecruiterStats.submissions
                      const interviews = analyzeRecruiterStats.interviews
                      const deals = analyzeRecruiterStats.deals
                      const pullouts = analyzeRecruiterStats.pullouts

                      if (
                        submissions === 0 &&
                        interviews === 0 &&
                        deals === 0 &&
                        pullouts === 0
                      ) {
                        return (
                          <div className="analytics-empty">
                            No activity logged for this recruiter in the selected
                            window.
                          </div>
                        )
                      }

                      const submissionToInterviewRate =
                        submissions > 0 ? interviews / submissions : 0
                      const interviewToDealRate =
                        interviews > 0 ? deals / interviews : 0

                      let summary = ''

                      if (submissions < 5 && deals === 0) {
                        summary =
                          'Low submission volume with no deals yet. Focus on building more top-of-funnel activity.'
                      } else if (submissionToInterviewRate < 0.2) {
                        summary =
                          'Submissions are not converting well to interviews. Review CV quality, role fit, and calibration with hiring managers.'
                      } else if (interviewToDealRate < 0.2 && deals === 0) {
                        summary =
                          'Good interview volume but weak conversion to deals. Check interview preparation, salary alignment, and offer handling.'
                      } else if (deals > 0) {
                        summary =
                          'Strong signs of effectiveness with deals closed in this window. Look for patterns to replicate across other roles.'
                      } else {
                        summary =
                          'Steady activity across submissions and interviews. Continue monitoring conversion and feedback quality.'
                      }

                      return (
                        <div className="analytics-issue-list">
                          <div className="analytics-issue-item">
                            <div className="analytics-issue-header">
                              <span className="analytics-issue-role">
                                Summary for recruiter
                              </span>
                            </div>
                            <div className="analytics-issue-remark">
                              {summary}
                            </div>
                            <div className="analytics-issue-footer">
                              <div className="analytics-issue-tags">
                                <span className="analytics-tag">
                                  {`${submissions} submissions`}
                                </span>
                                <span className="analytics-tag">
                                  {`${interviews} interviews`}
                                </span>
                                <span className="analytics-tag">
                                  {`${deals} deals`}
                                </span>
                                <span className="analytics-tag">
                                  {`${pullouts} pull outs`}
                                </span>
                              </div>
                              <span className="analytics-issue-severity">
                                {`Sub→Int ${(submissionToInterviewRate * 100).toFixed(
                                  0,
                                )}% · Int→Deal ${(interviewToDealRate * 100).toFixed(
                                  0,
                                )}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="analytics-empty">
                      Choose a recruiter and time window to run analysis.
                    </div>
                  )
                ) : analyzeClientName ? (
                  (() => {
                    const noteCount = analyzeClientInsights.length
                    const riskCount = analyzeClientRiskNotes.length
                    const activeCount = analyzeClientActiveRoles.length
                    const closedCount = analyzeClientClosedRoles.length

                    if (
                      activeCount === 0 &&
                      closedCount === 0 &&
                      noteCount === 0
                    ) {
                      return (
                        <div className="analytics-empty">
                          No data yet for this client in the selected window.
                        </div>
                      )
                    }

                    let summary = ''

                    if (riskCount > 0) {
                      summary =
                        'There are risk signals on this client. Prioritise follow-ups, expectation setting, and stakeholder alignment.'
                    } else if (activeCount > 0 && closedCount === 0) {
                      summary =
                        'Roles are active but none closed yet. Focus on progressing interviews and addressing recurring blockers.'
                    } else if (closedCount > 0 && riskCount === 0) {
                      summary =
                        'Healthy client with closed roles and no major risks flagged recently.'
                    } else {
                      summary =
                        'Mixed signals. Review individual issue notes to decide next best actions.'
                    }

                    return (
                      <div className="analytics-issue-list">
                        <div className="analytics-issue-item">
                          <div className="analytics-issue-header">
                            <span className="analytics-issue-role">
                              Summary for client
                            </span>
                          </div>
                          <div className="analytics-issue-remark">{summary}</div>
                          <div className="analytics-issue-footer">
                            <div className="analytics-issue-tags">
                              <span className="analytics-tag">
                                {`${activeCount} active roles`}
                              </span>
                              <span className="analytics-tag">
                                {`${closedCount} closed roles`}
                              </span>
                              <span className="analytics-tag">
                                {`${noteCount} issue notes`}
                              </span>
                              <span className="analytics-tag">
                                {`${riskCount} risk notes`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="analytics-empty">
                    Choose a client and time window to run analysis.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={askMeOpen ? 'askme-widget askme-widget-open' : 'askme-widget'}>
        {askMeOpen && (
          <div className="askme-panel">
            <div className="askme-header">
              <div className="askme-title">Ask Me</div>
              <button
                type="button"
                className="askme-close"
                onClick={() => setAskMeOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="askme-body">
              {askMeMessages.length === 0 ? (
                <div className="askme-empty">
                  Ask questions like:
                  <br />
                  • How many roles a client gets on average monthly
                  <br />
                  • Kunal highest submission month and how many submissions he did
                </div>
              ) : (
                <div className="askme-messages">
                  {askMeMessages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.from === 'user'
                          ? 'askme-message askme-message-user'
                          : 'askme-message askme-message-bot'
                      }
                    >
                      <div className="askme-message-text">{message.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form
              className="askme-input-row"
              onSubmit={(event) => {
                event.preventDefault()
                const trimmed = askMeInput.trim()
                if (!trimmed) {
                  return
                }
                const userMessage = {
                  id: `user-${Date.now()}`,
                  from: 'user',
                  text: trimmed,
                }
                const answer = answerAskMeQuestion(trimmed)
                const botMessage = {
                  id: `bot-${Date.now()}`,
                  from: 'bot',
                  text: answer,
                }
                setAskMeMessages((previous) => [
                  ...previous,
                  userMessage,
                  botMessage,
                ])
                setAskMeInput('')
              }}
            >
              <input
                type="text"
                value={askMeInput}
                onChange={(event) => setAskMeInput(event.target.value)}
                placeholder="Type a question about your stats..."
              />
              <button type="submit" className="askme-send">
                Send
              </button>
            </form>
          </div>
        )}
        <button
          type="button"
          className="askme-fab"
          onClick={() => setAskMeOpen((previous) => !previous)}
        >
          <span className="askme-fab-icon">?</span>
          <span className="askme-fab-label">Ask Me</span>
        </button>
      </div>
    </div>
  )
}

export default App
