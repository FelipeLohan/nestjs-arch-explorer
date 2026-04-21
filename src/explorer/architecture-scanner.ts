import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, ModuleRef, ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { ArchitectureMap, ComponentNode, ModuleNode } from './explorer.types';

const INTERNAL_NAMES = new Set([
  'ModuleRef',
  'InternalCoreModule',
  'MetadataScanner',
  'DiscoveryService',
  'Reflector',
  'HttpAdapterHost',
  'LazyModuleLoader',
  'ExternalContextCreator',
  'ApplicationConfig',
  'ModulesContainer',
  'metatype',
]);

const INTERNAL_PATTERNS = /^(noop|useFactory|useClass|useValue|lazyModuleLoader)/;

@Injectable()
export class ArchitectureScanner implements OnModuleInit {
  private architectureMap: ArchitectureMap = {
    modules: [],
    controllers: [],
    providers: [],
  };

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit(): void {
    this.architectureMap = this.scan();
    console.log(
      '[ArchitectureScanner] Architecture map:\n',
      JSON.stringify(this.architectureMap, null, 2),
    );
  }

  getArchitectureMap(): ArchitectureMap {
    return this.architectureMap;
  }

  private scan(): ArchitectureMap {
    const controllers = this.discovery
      .getControllers()
      .filter((w) => this.isUserDefined(w))
      .map((w) => this.buildComponentNode(w, 'controller'));

    const providers = this.discovery
      .getProviders()
      .filter((w) => this.isUserDefined(w))
      .filter((w) => !this.isModuleToken(w))
      .map((w) => this.buildComponentNode(w, 'provider'));

    const modules = this.buildModuleNodes();

    return { modules, controllers, providers };
  }

  private isUserDefined(wrapper: InstanceWrapper): boolean {
    if (!wrapper.metatype) return false;

    const name = wrapper.metatype.name ?? '';
    if (!name) return false;
    if (INTERNAL_NAMES.has(name)) return false;
    if (INTERNAL_PATTERNS.test(name)) return false;

    const token = wrapper.token;
    if (typeof token === 'string' && token.startsWith('__')) return false;

    return true;
  }

  private isModuleToken(wrapper: InstanceWrapper): boolean {
    return wrapper.metatype?.name?.endsWith('Module') ?? false;
  }

  private buildComponentNode(
    wrapper: InstanceWrapper,
    type: 'controller' | 'provider',
  ): ComponentNode {
    const metatype = wrapper.metatype!;
    const paramTypes: Function[] =
      Reflect.getMetadata('design:paramtypes', metatype) ?? [];

    const dependencies = paramTypes
      .filter((dep): dep is Function => !!dep && typeof dep === 'function' && !!dep.name && dep.name !== 'Object')
      .map((dep) => dep.name);

    return {
      name: metatype.name,
      type,
      scope: this.resolveScopeName(wrapper.scope),
      dependencies,
    };
  }

  private resolveScopeName(scope: number | symbol | undefined): string {
    const scopes: Record<number, string> = {
      0: 'DEFAULT',
      1: 'TRANSIENT',
      2: 'REQUEST',
    };
    return typeof scope === 'number' ? (scopes[scope] ?? 'DEFAULT') : 'DEFAULT';
  }

  private buildModuleNodes(): ModuleNode[] {
    const modulesContainer = this.moduleRef.get(ModulesContainer, { strict: false });
    const nodes: ModuleNode[] = [];

    const INTERNAL_MODULES = new Set(['InternalCoreModule']);

    for (const [, mod] of modulesContainer) {
      const moduleName = mod.metatype?.name;
      if (!moduleName) continue;
      if (INTERNAL_MODULES.has(moduleName)) continue;

      const controllers = [...mod.controllers.values()]
        .filter((w) => this.isUserDefined(w))
        .map((w) => w.metatype!.name);

      const providers = [...mod.providers.values()]
        .filter((w) => this.isUserDefined(w))
        .filter((w) => !this.isModuleToken(w))
        .map((w) => w.metatype!.name);

      nodes.push({ name: moduleName, controllers, providers });
    }

    return nodes;
  }
}
