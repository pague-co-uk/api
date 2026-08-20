import {
  Module,
  OnModuleInit,
} from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module.js";
import { DatabaseModule } from "../../database/database.module.js";
import { PermissionRepository } from "../../repositories/PermissionRepository.js";
import { RolePermissionRepository } from "../../repositories/RolePermissionRepository.js";
import { RoleRepository } from "../../repositories/RoleRepository.js";
import { RoleMapper } from "./mapper/role.mapper.js";
import { PermissionMapper } from "./permission.mapper.js";
import { PermissionService } from "./services/permission.service.js";
import { RoleService } from "./services/roles.service.js";

@Module({
  imports: [DatabaseModule,
    AuditModule
  ],
  providers: [
    PermissionRepository,
    PermissionService,
    PermissionMapper,
    RoleRepository,
    RolePermissionRepository,
    RoleService,
    RoleMapper,
  ],
  exports: [
    PermissionRepository,
    PermissionService,
    RoleService
  ],
})
export class RolesModule implements OnModuleInit {
  constructor(
    private readonly permissions: PermissionService,
  ) { }

  async onModuleInit(): Promise<void> {
    await this.permissions.synchronizeRegistry();
  }
}