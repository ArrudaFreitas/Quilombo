import { afterEach, describe, expect, it } from 'vitest'
import { readThemeCookie, themeInitScript } from './theme'

function clearCookies() {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0].trim()
    if (name) document.cookie = `${name}=; max-age=0`
  }
}

afterEach(clearCookies)

describe('readThemeCookie', () => {
  it('lê o tema do cookie compartilhado mesmo entre outros cookies', () => {
    document.cookie = 'foo=bar'
    document.cookie = 'quilombo-theme=dark'
    expect(readThemeCookie()).toBe('dark')
  })

  it('retorna null quando o cookie está ausente', () => {
    expect(readThemeCookie()).toBeNull()
  })

  it('ignora valores inválidos', () => {
    document.cookie = 'quilombo-theme=neon'
    expect(readThemeCookie()).toBeNull()
  })
})

describe('themeInitScript', () => {
  it('lê do cookie (não do localStorage) e aplica data-theme', () => {
    const script = themeInitScript()
    expect(script).toContain('document.cookie')
    expect(script).not.toContain('localStorage')
    expect(script).toContain('data-theme')
  })
})
