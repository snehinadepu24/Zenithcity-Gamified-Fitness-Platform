import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface BuildingPlacerProps {
  buildingType: string;
  onPlace: (position: { x: number, z: number }) => void;
  onCancel: () => void;
  territorySize: number;
  existingBuildings: Array<{ position_x: number; position_z: number; type: string }>;
}

export default function BuildingPlacer({ 
  buildingType, 
  onPlace, 
  onCancel, 
  territorySize,
  existingBuildings
}: BuildingPlacerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isValidPosition, setIsValidPosition] = useState(true);
  const { camera, raycaster, pointer } = useThree();

  // Simplified territory boundary - much more lenient
  const territoryRadius = 50; // Fixed large radius

  // Simplified building sizes - smaller for easier placement
  const getBuildingSize = (type: string) => {
    switch (type) {
      case 'house': return { width: 1.5, depth: 1.5 };
      case 'apartment': return { width: 2, depth: 2 };
      case 'office': return { width: 2.5, depth: 2.5 };
      case 'park': return { width: 3, depth: 3 };
      case 'stadium': return { width: 5, depth: 5 };
      default: return { width: 1.5, depth: 1.5 };
    }
  };

  // Much simpler collision detection
  const checkCollision = (x: number, z: number) => {
    if (!existingBuildings || existingBuildings.length === 0) {
      return false;
    }

    const currentSize = getBuildingSize(buildingType);
    const minDistance = Math.max(currentSize.width, currentSize.depth) + 1; // Simple minimum distance

    return existingBuildings.some(building => {
      if (!building || typeof building.position_x !== 'number' || typeof building.position_z !== 'number') {
        return false;
      }

      // Simple distance check
      const distance = Math.sqrt(
        Math.pow(x - building.position_x, 2) + 
        Math.pow(z - building.position_z, 2)
      );

      return distance < minDistance;
    });
  };

  useFrame(() => {
    if (!groupRef.current) return;

    // Update raycaster
    raycaster.setFromCamera(pointer, camera);
    
    // Create a ground plane for intersection
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      // Snap to grid
      const gridSize = 2;
      const snappedX = Math.round(intersectionPoint.x / gridSize) * gridSize;
      const snappedZ = Math.round(intersectionPoint.z / gridSize) * gridSize;
      
      // Very simple territory check
      const distance = Math.sqrt(snappedX * snappedX + snappedZ * snappedZ);
      const withinBounds = distance <= territoryRadius;
      
      // Simple collision check
      const hasCollision = checkCollision(snappedX, snappedZ);
      
      const isValid = withinBounds && !hasCollision;
      
      setPosition(new THREE.Vector3(snappedX, 0.1, snappedZ));
      setIsValidPosition(isValid);
      
      groupRef.current.position.set(snappedX, 0.1, snappedZ);
    }
  });

  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    console.log('Click detected:', { isValidPosition, position: { x: position.x, z: position.z } });
    
    // Always allow placement for now - we'll add validation back gradually
    onPlace({ x: position.x, z: position.z });
  }, [position, onPlace]);

  const handleRightClick = useCallback((event: any) => {
    event.stopPropagation();
    event.preventDefault();
    onCancel();
  }, [onCancel]);

  // Add keyboard support for canceling
  useFrame(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Get building preview based on type
  const getBuildingPreview = () => {
    const color = '#00ff00'; // Always green for now
    const opacity = 0.6;

    switch (buildingType) {
      case 'house':
        return (
          <group>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[2, 1, 2]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <coneGeometry args={[1.5, 0.8, 4]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
          </group>
        );
      case 'apartment':
        return (
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[2.5, 3, 2.5]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      case 'office':
        return (
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[3, 4, 3]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      case 'park':
        return (
          <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <circleGeometry args={[2.5, 16]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.3, 1, 6]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
          </group>
        );
      case 'stadium':
        return (
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[4, 4, 2, 16]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      default:
        return (
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[2, 1, 2]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onContextMenu={handleRightClick}
    >
      {getBuildingPreview()}
      
      {/* Grid indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Position indicator lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -1, 0.01, 0, 1, 0.01, 0,  // X axis
              0, 0.01, -1, 0, 0.01, 1   // Z axis
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" />
      </lineSegments>

      {/* Debug: Show building footprint */}
      {(() => {
        const size = getBuildingSize(buildingType);
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <planeGeometry args={[size.width, size.depth]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent 
              opacity={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })()}
    </group>
  );
}