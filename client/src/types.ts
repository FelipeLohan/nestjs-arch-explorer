export interface ComponentNode {
  name: string;
  type: 'controller' | 'provider';
  scope: string;
  dependencies: string[];
}

export interface ModuleNode {
  name: string;
  controllers: string[];
  providers: string[];
}

export interface ArchitectureMap {
  modules: ModuleNode[];
  controllers: ComponentNode[];
  providers: ComponentNode[];
}

export type SelectedNode =
  | { kind: 'module'; data: ModuleNode }
  | { kind: 'component'; data: ComponentNode };
