import { Module } from "@nestjs/common";
import { PermissionMapper } from "./mapper/permission.mapper.js";
import { RoleMapper } from "./mapper/role.mapper.js";

@Module({
  controllers: [],
  providers: [RoleMapper, PermissionMapper]
  ,
  exports: [

  ],
})
export class RolesModule { }
