export interface EffectiveTail {
  capacity: number
  rangeNm: number
  speedKnots: number
  isCapOverridden: boolean
  isRangeOverridden: boolean
  isSpeedOverridden: boolean
}

export function computeEffectiveTail(model: any, tail: any): EffectiveTail {
  return {
    capacity: tail.capacityPax ?? model?.defaultCapacity ?? 0,
    rangeNm: tail.rangeNm ?? model?.defaultRangeNm ?? 0,
    speedKnots: tail.cruisingSpeed ?? model?.defaultSpeedKnots ?? 0,
    isCapOverridden: tail.capacityPax !== null && tail.capacityPax !== undefined,
    isRangeOverridden: tail.rangeNm !== null && tail.rangeNm !== undefined,
    isSpeedOverridden: tail.cruisingSpeed !== null && tail.cruisingSpeed !== undefined,
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
