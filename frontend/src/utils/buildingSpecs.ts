export interface BuildingFootprint {
    width: number;
    depth: number;
}

export interface BuildingPosition {
    id?: string;
    position_x: number;
    position_z: number;
    type: string;
}

const BUILDING_FOOTPRINTS: Record<string, BuildingFootprint> = {
    house: { width: 2.5, depth: 2.5 },
    apartment: { width: 2.5, depth: 2.5 },
    office: { width: 2.5, depth: 2.5 },
    park: { width: 5, depth: 5 },
    stadium: { width: 8, depth: 8 },
};

export function getBuildingFootprint(type: string): BuildingFootprint {
    return BUILDING_FOOTPRINTS[type] || BUILDING_FOOTPRINTS.house;
}

export function getTerritoryRadius(territorySize: number): number {
    return Math.min(Math.sqrt(Math.max(territorySize, 1)) * 0.82, 38);
}

export function isValidBuildingPosition(
    type: string,
    x: number,
    z: number,
    territorySize: number,
    existingBuildings: BuildingPosition[],
): boolean {
    const footprint = getBuildingFootprint(type);
    const radius = getTerritoryRadius(territorySize);
    const footprintRadius = Math.hypot(footprint.width / 2, footprint.depth / 2);

    if (Math.hypot(x, z) + footprintRadius > radius) return false;

    return !existingBuildings.some((building) => {
        if (!building) return false;

        const other = getBuildingFootprint(building.type);
        const gap = 0.35;
        return Math.abs(x - building.position_x) < (footprint.width + other.width) / 2 + gap
            && Math.abs(z - building.position_z) < (footprint.depth + other.depth) / 2 + gap;
    });
}