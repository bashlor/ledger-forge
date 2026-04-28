/** Shared layout tokens: keep sidebar width and main column in sync (~15% narrower than 14rem). */
export const SHELL_SIDEBAR_WIDTH_CLASS = 'w-[11.9rem]'
export const SHELL_MAIN_PAD_LEFT_CLASS = 'lg:pl-[11.9rem]'
/** Full width of main column (edge to edge next to sidebar); horizontal padding only. */
export const SHELL_CONTENT_GUTTER_CLASS = 'w-full min-w-0 px-4 sm:px-6 lg:px-8' as const

/** Centered reading width inside the gutter (align with topbar content column). */
export const SHELL_MAIN_MAX_WIDTH_CLASS = 'mx-auto w-full max-w-6xl min-w-0' as const
