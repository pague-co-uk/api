import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../../common/authorization/authorization.module.js";
import { DatabaseModule } from "../../database/database.module.js";

import { UserMapper } from "./user.mapper.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

import { RoleRepository } from "../../repositories/RoleRepository.js";
import { UserRepository } from "../../repositories/userRepository.js";
import { UserRoleRepository } from "../../repositories/UserRoleRepository.js";
import { PasswordService } from "../auth/services/password.service.js";
import { PermissionMapper } from "../roles/mapper/permission.mapper.js";
import { RoleMapper } from "../roles/mapper/role.mapper.js";

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
  ],
  controllers: [
    UsersController,
  ],
  providers: [
    UsersService,
    UserMapper,
    PasswordService,
    RoleMapper,
    PermissionMapper,
    UserRepository,
    RoleRepository,
    UserRoleRepository,
  ],
  exports: [
    UsersService,
    UserMapper,
  ],
})
export class UsersModule { }