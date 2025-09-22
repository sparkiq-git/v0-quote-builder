import type { AircraftModel, AircraftTail, EffectiveTail } from "@/lib/types"

export function computeEffectiveTail(model: AircraftModel, tail: AircraftTail): EffectiveTail {
  return {
    capacity: tail.capacityOverride ?? model.defaultCapacity ?? 0,
    rangeNm: tail.rangeNmOverride ?? model.defaultRangeNm ?? 0,
    speedKnots: tail.speedKnotsOverride ?? model.defaultSpeedKnots ?? 0,
    isCapOverridden: tail.capacityOverride !== undefined,
    isRangeOverridden: tail.rangeNmOverride !== undefined,
    isSpeedOverridden: tail.speedKnotsOverride !== undefined,
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
