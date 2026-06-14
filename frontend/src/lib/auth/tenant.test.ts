import { describe, expect, it } from 'vitest'
import { safeReturnTo, tenantFromHost } from './tenant'

const base = 'quilombo.localhost'

describe('tenantFromHost', () => {
  it('extrai o slug de um subdomínio de um nível', () => {
    expect(tenantFromHost('kalunga.quilombo.localhost', base)).toBe('kalunga')
  })

  it('ignora a porta', () => {
    expect(tenantFromHost('kalunga.quilombo.localhost:8080', base)).toBe(
      'kalunga',
    )
  })

  it('a raiz do domínio base não tem tenant', () => {
    expect(tenantFromHost('quilombo.localhost', base)).toBeNull()
  })

  it('subdomínio aninhado não resolve', () => {
    expect(tenantFromHost('a.b.quilombo.localhost', base)).toBeNull()
  })

  it('host fora do domínio base não resolve', () => {
    expect(tenantFromHost('example.com', base)).toBeNull()
    expect(tenantFromHost('localhost', base)).toBeNull()
  })

  it('host vazio ou nulo retorna null', () => {
    expect(tenantFromHost('', base)).toBeNull()
    expect(tenantFromHost(null, base)).toBeNull()
  })
})

describe('safeReturnTo', () => {
  it('mantém caminhos internos', () => {
    expect(safeReturnTo('/admin/x')).toBe('/admin/x')
  })

  it('bloqueia hosts externos e esquemas (open redirect)', () => {
    expect(safeReturnTo('//evil.com')).toBe('/admin')
    expect(safeReturnTo('https://evil.com')).toBe('/admin')
    expect(safeReturnTo('javascript:alert(1)')).toBe('/admin')
    expect(safeReturnTo('/x\\y')).toBe('/admin')
  })

  it('usa o fallback quando ausente', () => {
    expect(safeReturnTo(undefined)).toBe('/admin')
    expect(safeReturnTo('', '/painel')).toBe('/painel')
  })
})
