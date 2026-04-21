import type { ArchitectureMap, SelectedNode } from '../types';
interface Props {
    map: ArchitectureMap;
    onSelect: (node: SelectedNode | null) => void;
}
export declare function ArchGraph({ map, onSelect }: Props): import("react").JSX.Element;
export {};
