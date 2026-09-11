import { Scenario } from './types'

function isFiniteNum(x: any): boolean {
  return typeof x === 'number' && Number.isFinite(x)
}

export function validateScenario(s: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!s || typeof s !== 'object') {
    return { valid: false, errors: ['Файл не содержит корректного JSON-объекта'] }
  }

  if (s.schema_version !== 'cosmo-A-1.0') {
    errors.push('Неподдерживаемая версия схемы: ожидается "cosmo-A-1.0"')
  }

  const e = s.environment
  const d = s.design

  if (!e) {
    errors.push('Отсутствует обязательная секция environment')
    return { valid: false, errors }
  }
  if (!d) {
    errors.push('Отсутствует обязательная секция design')
    return { valid: false, errors }
  }

  const envKeys = [
    'altitude_km',
    'inclination_deg',
    'earth_angle0_deg',
    'horizon_s',
    'step_s',
    'min_elevation_deg',
    'isl_range_km',
    'target_availability',
  ]
  for (const k of envKeys) {
    if (!isFiniteNum(e[k])) {
      errors.push(`Поле environment.${k} должно быть конечным числом`)
    }
  }

  if (isFiniteNum(e.altitude_km) && isFiniteNum(e.inclination_deg)) {
    if (e.altitude_km < 200 || e.altitude_km > 1200 || e.inclination_deg <= 0 || e.inclination_deg > 180) {
      errors.push('Параметры орбиты вне допустимого диапазона (высота 200..1200 км, наклонение 0..180°)')
    }
  }

  if (!Number.isInteger(e.step_s) || !Number.isInteger(e.horizon_s)) {
    errors.push('Шаг и горизонт расчета должны быть целыми положительными секундами')
  } else {
    if (e.step_s <= 0 || e.step_s > e.horizon_s || e.horizon_s > 172800 || e.horizon_s % e.step_s !== 0) {
      errors.push('Некорректная сетка времени: горизонт должен быть кратен шагу, не более 172800 с')
    }
  }

  if (isFiniteNum(e.min_elevation_deg) && (e.min_elevation_deg < 0 || e.min_elevation_deg >= 90)) {
    errors.push('Минимальный угол возвышения должен быть в диапазоне [0, 90) градусов')
  }
  if (isFiniteNum(e.isl_range_km) && (e.isl_range_km <= 0 || e.isl_range_km > 10000)) {
    errors.push('Предельная дальность ISL должна быть в диапазоне (0, 10000] км')
  }
  if (isFiniteNum(e.target_availability) && (e.target_availability < 0 || e.target_availability > 1)) {
    errors.push('Целевой уровень доступности должен быть в долях [0, 1]')
  }

  if (!Array.isArray(d.planes) || d.planes.length === 0) {
    errors.push('Секция design.planes пуста или не является массивом')
  } else {
    const planeIds = new Set<string>()
    for (const p of d.planes) {
      if (!p.id || typeof p.id !== 'string') {
        errors.push('Плоскость должна содержать строковый ID')
      } else if (planeIds.has(p.id)) {
        errors.push(`Дублирующийся идентификатор плоскости: ${p.id}`)
      } else {
        planeIds.add(p.id)
      }
      for (const k of ['raan_deg', 'phase_deg']) {
        if (!isFiniteNum(p[k]) || p[k] < 0 || p[k] >= 360) {
          errors.push(`Недопустимый угол ${p.id}.${k}: должен быть [0, 360) градусов`)
        }
      }
    }
  }

  const planeSet = new Set(d.planes?.map((p: any) => p.id) || [])
  const satIds = new Set<string>()

  if (!Array.isArray(d.satellites) || d.satellites.length === 0) {
    errors.push('Список спутников design.satellites пуст')
  } else {
    for (const sat of d.satellites) {
      if (!sat.id) {
        errors.push('Спутник не содержит ID')
      } else if (satIds.has(sat.id)) {
        errors.push(`Дублирующийся идентификатор спутника: ${sat.id}`)
      } else {
        satIds.add(sat.id)
      }
      if (!planeSet.has(sat.plane_id)) {
        errors.push(`Спутник ${sat.id} ссылается на несуществующую плоскость: ${sat.plane_id}`)
      }
      if (![1, 2, 3].includes(sat.launch_batch)) {
        errors.push(`Спутник ${sat.id} имеет неверный launch_batch: должен быть 1, 2 или 3`)
      }
      if (!isFiniteNum(sat.slot_deg)) {
        errors.push(`Спутник ${sat.id} имеет нечисловое значение slot_deg`)
      }
    }
  }

  if (![1, 2, 3].includes(d.launch_stage)) {
    errors.push('Параметр launch_stage должен быть 1, 2 или 3')
  }

  const ground = s.ground_sites
  if (!Array.isArray(ground) || ground.length === 0) {
    errors.push('Список ground_sites пуст')
  } else {
    const gids = new Set<string>()
    let hasClient = false
    let hasGateway = false

    for (const g of ground) {
      if (!g.id) {
        errors.push('Наземный пункт не содержит ID')
      } else if (gids.has(g.id)) {
        errors.push(`Дублирующийся идентификатор наземного пункта: ${g.id}`)
      } else if (satIds.has(g.id)) {
        errors.push(`Конфликт ID: ${g.id} используется и для спутника, и для наземного пункта`)
      } else {
        gids.add(g.id)
      }

      if (g.role === 'client') hasClient = true
      else if (g.role === 'gateway') hasGateway = true
      else errors.push(`Недопустимая роль наземного пункта ${g.id}: ${g.role}`)

      if (!isFiniteNum(g.lat_deg) || g.lat_deg < -90 || g.lat_deg > 90) {
        errors.push(`Недопустимая широта пункта ${g.id}: должна быть [-90, 90] градусов`)
      }
      if (!isFiniteNum(g.lon_deg) || g.lon_deg < -180 || g.lon_deg > 180) {
        errors.push(`Недопустимая долгота пункта ${g.id}: должна быть [-180, 180] градусов`)
      }
    }

    if (!hasClient || !hasGateway) {
      errors.push('В сценарии должен присутствовать минимум один client и один gateway')
    }

    for (const f of s.failures || []) {
      if (!satIds.has(f.satellite_id)) {
        errors.push(`Отказ указывает на несуществующий спутник: ${f.satellite_id}`)
      }
      if (!isFiniteNum(f.start_s) || !isFiniteNum(f.end_s) || f.start_s < 0 || f.start_s >= f.end_s || f.end_s > e.horizon_s) {
        errors.push(`Недопустимый интервал отказа спутника ${f.satellite_id}: [${f.start_s}, ${f.end_s})`)
      }
    }

    const gatewayIds = new Set(ground.filter((g: any) => g.role === 'gateway').map((g: any) => g.id))
    for (const f of s.gateway_outages || []) {
      if (!gatewayIds.has(f.gateway_id)) {
        errors.push(`Отказ шлюза указывает на несуществующий шлюз: ${f.gateway_id}`)
      }
      if (!isFiniteNum(f.start_s) || !isFiniteNum(f.end_s) || f.start_s < 0 || f.start_s >= f.end_s || f.end_s > e.horizon_s) {
        errors.push(`Недопустимый интервал отказа шлюза ${f.gateway_id}: [${f.start_s}, ${f.end_s})`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
