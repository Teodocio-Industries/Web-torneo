import './TeamBadge.css'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function TeamBadge({ team, size = 'md' }) {
  if (!team) return <div className={`team-badge team-badge--${size} team-badge--empty`}>?</div>
  if (team.flag_url) {
    return <img className={`team-badge team-badge--${size}`} src={team.flag_url} alt={team.name} />
  }
  return <div className={`team-badge team-badge--${size}`}>{initials(team.name)}</div>
}
