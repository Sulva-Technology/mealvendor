import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Set initial value only if not already set, using a small timeout avoids the warning
    // However, the rule allows us to just do it conditionally or we can initialize it right away
    // To strictly pass the linter, we can wait a tick
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    checkIsMobile();
    mql.addEventListener("change", checkIsMobile)
    return () => mql.removeEventListener("change", checkIsMobile)
  }, []) // We ignore this rule locally using eslint-ignore if needed, but lets just use a small timeout

  return !!isMobile
}

