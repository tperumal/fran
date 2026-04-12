import { Users } from 'lucide-react'
import useHousehold from '../hooks/useHousehold'

/**
 * Small toggle button that flips an item between private and shared.
 * - Outlined people icon = private (household_id is null)
 * - Filled people icon = shared (household_id is set)
 */
export default function ShareToggle({ shared, onToggle, size = 14 }) {
  const { householdId } = useHousehold()

  // Don't render if user isn't in a household
  if (!householdId) return null

  return (
    <button
      className={`share-toggle ${shared ? 'share-toggle--on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(!shared)
      }}
      title={shared ? 'Shared with household' : 'Private — tap to share'}
      aria-label={shared ? 'Shared' : 'Private'}
    >
      <Users size={size} />
    </button>
  )
}
