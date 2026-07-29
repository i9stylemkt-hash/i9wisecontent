/**
 * Calendar Service — generates publication calendar slots based on blog frequency.
 *
 * Pure functions (no Supabase dependency) — easy to test.
 */

export interface CalendarSlot {
  date: string // ISO date YYYY-MM-DD
  blogId: string
  articleId?: string
  status: 'filled' | 'gap' | 'overdue'
}

export interface CalendarBlog {
  id: string
  publicationFrequency: 'daily' | 'twice_weekly' | 'weekly' | 'biweekly' | 'monthly'
}

export interface CalendarArticle {
  id: string
  scheduledDate: string | null // YYYY-MM-DD or null
}

/**
 * Generate expected publication dates for a blog based on its frequency.
 *
 * Mapping:
 * - daily: 7 per week (every day)
 * - twice_weekly: 2 per week (Monday and Thursday)
 * - weekly: 1 per week (Monday)
 * - biweekly: 1 every 2 weeks (Monday)
 * - monthly: ~1 per month (1st day of month)
 */
export function generateCalendarSlots(
  blog: CalendarBlog,
  articles: CalendarArticle[],
  weeksAhead: number,
  referenceDate?: Date
): CalendarSlot[] {
  const today = referenceDate ?? new Date()
  const todayStr = formatDate(today)

  // Generate expected publication dates
  const expectedDates = generateExpectedDates(blog.publicationFrequency, today, weeksAhead)

  // Build lookup map: date -> article
  const articlesByDate = new Map<string, CalendarArticle>()
  for (const article of articles) {
    if (article.scheduledDate) {
      articlesByDate.set(article.scheduledDate, article)
    }
  }

  // Build slots
  const slots: CalendarSlot[] = []

  for (const date of expectedDates) {
    const article = articlesByDate.get(date)

    if (article) {
      slots.push({
        date,
        blogId: blog.id,
        articleId: article.id,
        status: 'filled',
      })
    } else if (date < todayStr) {
      slots.push({
        date,
        blogId: blog.id,
        status: 'overdue',
      })
    } else {
      slots.push({
        date,
        blogId: blog.id,
        status: 'gap',
      })
    }
  }

  return slots
}

/**
 * Generate expected publication dates based on frequency.
 */
function generateExpectedDates(
  frequency: CalendarBlog['publicationFrequency'],
  startDate: Date,
  weeksAhead: number
): string[] {
  const dates: string[] = []
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + weeksAhead * 7)

  switch (frequency) {
    case 'daily':
      return generateDailyDates(startDate, endDate)
    case 'twice_weekly':
      return generateTwiceWeeklyDates(startDate, endDate)
    case 'weekly':
      return generateWeeklyDates(startDate, endDate)
    case 'biweekly':
      return generateBiweeklyDates(startDate, endDate)
    case 'monthly':
      return generateMonthlyDates(startDate, endDate)
  }

  return dates
}

function generateDailyDates(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function generateTwiceWeeklyDates(start: Date, end: Date): string[] {
  const dates: string[] = []
  // Find next Monday or Thursday from start
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    // Monday = 1, Thursday = 4
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      dates.push(formatDate(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function generateWeeklyDates(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  // Advance to next Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1)
  }

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 7)
  }

  return dates
}

function generateBiweeklyDates(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  // Advance to next Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1)
  }

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 14)
  }

  return dates
}

function generateMonthlyDates(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  // Start from the 1st of current or next month
  if (current.getDate() > 1) {
    current.setMonth(current.getMonth() + 1)
  }
  current.setDate(1)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setMonth(current.getMonth() + 1)
    current.setDate(1) // ensure we stay on the 1st
  }

  return dates
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
