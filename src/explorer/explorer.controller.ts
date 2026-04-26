import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Type,
} from '@nestjs/common';
import { ArchitectureScanner } from './architecture-scanner';
import {
  EXPLORER_OPTIONS,
  type ExplorerModuleOptions,
} from './explorer-options.interface';

export function createExplorerController(apiPath: string): Type<unknown> {
  @Controller(apiPath)
  class ExplorerController {
    constructor(
      private readonly scanner: ArchitectureScanner,
      @Inject(EXPLORER_OPTIONS) private readonly options: ExplorerModuleOptions,
    ) {}

    @Get()
    getExplorerData() {
      const guardFn = this.options.guardFn ?? (() => true);
      if (!guardFn()) throw new ForbiddenException();
      return this.scanner.getArchitectureMap();
    }
  }

  return ExplorerController;
}
