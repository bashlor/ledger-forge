import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SearchHighlight } from './search_highlight'

describe('SearchHighlight', () => {
  it('highlights repeated matches and preserves unmatched text', () => {
    const { container } = render(
      <SearchHighlight query="alpha" text="Alpha beta ALPHA and gamma" />
    )

    expect(container.querySelectorAll('mark')).toHaveLength(2)
    expect(container.textContent).toBe('Alpha beta ALPHA and gamma')
  })

  it('escapes special characters in the search query', () => {
    const { container } = render(<SearchHighlight query="a+b" text="a+b, then A+B" />)

    expect(container.querySelectorAll('mark')).toHaveLength(2)
    expect(container.textContent).toBe('a+b, then A+B')
  })

  it('returns plain text when the query is empty', () => {
    const { container } = render(<SearchHighlight query="   " text="No highlight" />)

    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(container.textContent).toBe('No highlight')
  })
})
