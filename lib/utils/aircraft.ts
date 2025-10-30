export interface EffectiveTail {
  capacity: number
  rangeNm: number
  speedKnots: number
  isCapOverridden: boolean
  isRangeOverridden: boolean
  isSpeedOverridden: boolean
}

export function computeEffectiveTail(model: any, tail: any): EffectiveTail {
  // Handle NaN values from database
  const safeCapacityPax = (tail.capacityPax && !isNaN(tail.capacityPax)) ? tail.capacityPax : null
  const safeRangeNm = (tail.rangeNm && !isNaN(tail.rangeNm)) ? tail.rangeNm : null
  const safeCruisingSpeed = (tail.cruisingSpeed && !isNaN(tail.cruisingSpeed)) ? tail.cruisingSpeed : null
  const safeDefaultCapacity = (model?.defaultCapacity && !isNaN(model.defaultCapacity)) ? model.defaultCapacity : 8
  const safeDefaultRangeNm = (model?.defaultRangeNm && !isNaN(model.defaultRangeNm)) ? model.defaultRangeNm : 2000
  const safeDefaultSpeedKnots = (model?.defaultSpeedKnots && !isNaN(model.defaultSpeedKnots)) ? model.defaultSpeedKnots : 400

  return {
    capacity: safeCapacityPax ?? safeDefaultCapacity ?? 8,
    rangeNm: safeRangeNm ?? safeDefaultRangeNm ?? 2000,
    speedKnots: safeCruisingSpeed ?? safeDefaultSpeedKnots ?? 400,
    isCapOverridden: safeCapacityPax !== null && safeCapacityPax !== undefined,
    isRangeOverridden: safeRangeNm !== null && safeRangeNm !== undefined,
    isSpeedOverridden: safeCruisingSpeed !== null && safeCruisingSpeed !== undefined,
  }
}

export function validateUniqueTailNumber(
  tailNumber: string,
  existingTails: AircraftTail[],
  excludeId?: string,
): boolean {
  return !existingTails.some(
    (tail) => tail.id !== excludeId && tail.tailNumber.toLowerCase() === tailNumber.toLowerCase(),
  )
}
