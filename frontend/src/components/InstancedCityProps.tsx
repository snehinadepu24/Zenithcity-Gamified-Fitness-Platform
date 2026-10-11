import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CityBuilding {
    id: string;
    type: string;
    level: number;
    position_x: number;
    position_y: number;
    position_z: number;
}

interface InstancedCityPropsProps {
    buildings: CityBuilding[];
    timeOfDay: number;
}

interface TreePosition {
    x: number;
    z: number;
    scale: number;
}

const TREE_POSITIONS: TreePosition[] = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const radius = 38 + (index % 4) * 4;
    return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.85 + (index % 3) * 0.12,
    };
});

const LAMP_POSITIONS = [-30, -10, 10, 30].flatMap((coordinate) => [
    [coordinate + 1.2, coordinate + 1.2],
    [coordinate + 1.2, -coordinate - 1.2],
] as [number, number][]);

function setInstanceMatrices(
    mesh: THREE.InstancedMesh,
    matrices: THREE.Matrix4[],
) {
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
}

function InstancedTrees({ timeOfDay }: { timeOfDay: number }) {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const foliageRef = useRef<THREE.InstancedMesh>(null);
    const matrices = useMemo(() => TREE_POSITIONS.map((tree) => {
        const trunk = new THREE.Matrix4().compose(
            new THREE.Vector3(tree.x, 1.2 * tree.scale, tree.z),
            new THREE.Quaternion(),
            new THREE.Vector3(tree.scale, tree.scale, tree.scale),
        );
        const foliage = new THREE.Matrix4().compose(
            new THREE.Vector3(tree.x, 3.4 * tree.scale, tree.z),
            new THREE.Quaternion(),
            new THREE.Vector3(tree.scale, tree.scale, tree.scale),
        );
        return { trunk, foliage };
    }), []);

    useLayoutEffect(() => {
        if (trunkRef.current) setInstanceMatrices(trunkRef.current, matrices.map(({ trunk }) => trunk));
        if (foliageRef.current) setInstanceMatrices(foliageRef.current, matrices.map(({ foliage }) => foliage));
    }, [matrices]);

    const foliageColor = timeOfDay >= 6 && timeOfDay < 18 ? '#228B22' : '#1a5a1a';
    return (
        <>
            <instancedMesh ref={trunkRef} args={[undefined, undefined, TREE_POSITIONS.length]} castShadow>
                <cylinderGeometry args={[0.2, 0.3, 2, 7]} />
                <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </instancedMesh>
            <instancedMesh ref={foliageRef} args={[undefined, undefined, TREE_POSITIONS.length]} castShadow>
                <sphereGeometry args={[1.6, 8, 6]} />
                <meshStandardMaterial color={foliageColor} roughness={0.8} />
            </instancedMesh>
        </>
    );
}

function InstancedStreetLamps() {
    const poleRef = useRef<THREE.InstancedMesh>(null);
    const bulbRef = useRef<THREE.InstancedMesh>(null);
    const matrices = useMemo(() => LAMP_POSITIONS.map(([x, z]) => ({
        pole: new THREE.Matrix4().compose(
            new THREE.Vector3(x, 2.5, z),
            new THREE.Quaternion(),
            new THREE.Vector3(1, 1, 1),
        ),
        bulb: new THREE.Matrix4().compose(
            new THREE.Vector3(x + 0.6, 4.8, z),
            new THREE.Quaternion(),
            new THREE.Vector3(1, 1, 1),
        ),
    })), []);

    useLayoutEffect(() => {
        if (poleRef.current) setInstanceMatrices(poleRef.current, matrices.map(({ pole }) => pole));
        if (bulbRef.current) setInstanceMatrices(bulbRef.current, matrices.map(({ bulb }) => bulb));
    }, [matrices]);

    return (
        <>
            <instancedMesh ref={poleRef} args={[undefined, undefined, LAMP_POSITIONS.length]} castShadow>
                <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
                <meshStandardMaterial color="#37474F" metalness={0.85} roughness={0.2} />
            </instancedMesh>
            <instancedMesh ref={bulbRef} args={[undefined, undefined, LAMP_POSITIONS.length]}>
                <boxGeometry args={[0.22, 0.04, 0.14]} />
                <meshStandardMaterial color="#FFF9C4" emissive="#FFF176" emissiveIntensity={3} roughness={0.1} />
            </instancedMesh>
        </>
    );
}

function InstancedWindowLights({ buildings, timeOfDay }: InstancedCityPropsProps) {
    const windowRef = useRef<THREE.InstancedMesh>(null);
    const instances = useMemo(() => buildings.flatMap((building) => {
        if (building.type !== 'apartment' && building.type !== 'office') return [];
        const floors = building.type === 'apartment' ? 5 + building.level * 3 : 10 + building.level * 5;
        const columns = building.type === 'apartment' ? 3 : 4;
        const height = building.type === 'apartment' ? floors * 0.5 : floors * 0.42;
        return Array.from({ length: Math.min(floors, 12) }, (_, floor) =>
            Array.from({ length: columns }, (_, column) => {
                const width = building.type === 'apartment' ? 2.3 : 2.5;
                return new THREE.Matrix4().compose(
                    new THREE.Vector3(
                        building.position_x + (column - (columns - 1) / 2) * (width / columns),
                        building.position_y + 0.55 + (floor / Math.min(floors, 12)) * height,
                        building.position_z + (building.type === 'apartment' ? 1.06 : 1.01),
                    ),
                    new THREE.Quaternion(),
                    new THREE.Vector3(0.22, 0.14, 1),
                );
            }),
        ).flat();
    }), [buildings]);

    useLayoutEffect(() => {
        if (windowRef.current) setInstanceMatrices(windowRef.current, instances);
    }, [instances]);

    const isNight = timeOfDay < 6 || timeOfDay >= 18;
    return (
        <instancedMesh ref={windowRef} args={[undefined, undefined, Math.max(instances.length, 1)]} count={instances.length}>
            <boxGeometry args={[1, 1, 0.02]} />
            <meshStandardMaterial
                color={isNight ? '#FFE39A' : '#9CCFE8'}
                emissive={isNight ? '#FFB300' : '#1A4C66'}
                emissiveIntensity={isNight ? 0.65 : 0.08}
                roughness={0.2}
            />
        </instancedMesh>
    );
}

export default function InstancedCityProps({ buildings, timeOfDay }: InstancedCityPropsProps) {
    return (
        <group>
            <InstancedTrees timeOfDay={timeOfDay} />
            <InstancedStreetLamps />
            <InstancedWindowLights buildings={buildings} timeOfDay={timeOfDay} />
        </group>
    );
}
