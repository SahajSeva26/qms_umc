import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

const PaginationControls = ({ page, totalPages, onPageChange, disabled }: PaginationControlsProps) => {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          <FiChevronLeft size={14} />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
        >
          Next
          <FiChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}

export default PaginationControls
