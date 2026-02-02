export const truncateText = (text, maxLength = 60) => {
  if (!text) return ''
  const str = String(text)
  return str.length <= maxLength ? str : `${str.slice(0, maxLength - 1)}…`
}


