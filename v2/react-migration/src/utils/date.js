export const computeDaysLeft = (dateStr) => {
  if (!dateStr) return 0
  const eventDate = new Date(dateStr)
  const today = new Date()
  eventDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const raw = Math.round((eventDate - today) / (1000 * 60 * 60 * 24))
  return Object.is(raw, -0) ? 0 : raw
}


