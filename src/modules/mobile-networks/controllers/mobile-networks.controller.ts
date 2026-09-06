import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";
import { CreateMobileNetworkPrefixDto } from "../dto/create-mobile-network-prefix.dto.js";
import { CreateMobileNetworkDto } from "../dto/create-mobile-network.dto.js";
import { FindMobileNetworkPrefixesDto } from "../dto/find-mobile-network-prefixes.dto.js";
import { FindMobileNetworksDto } from "../dto/find-mobile-networks.dto.js";
import { MobileNetworkPrefixResponseDto, MobileNetworkResponseDto } from "../dto/mobile-network.response.dto.js";
import { UpdateMobileNetworkPrefixDto } from "../dto/update-mobile-network-prefix.dto.js";
import { UpdateMobileNetworkDto } from "../dto/update-mobile-network.dto.js";
import { MobileNetworkMapper } from "../mobile-network.mapper.js";
import { MobileNetworkService } from "../services/mobile-network.service.js";

@ApiTags("Mobile Networks")
@Controller("mobile-networks")
export class MobileNetworksController {
  constructor(
    private readonly mobileNetworks: MobileNetworkService,
    private readonly mapper: MobileNetworkMapper,
  ) { }

  @Get()
  @Authorize(Permissions.MOBILE_NETWORKS_READ)
  @ApiOperation({ summary: "Retrieve a paginated list of mobile networks." })
  @ApiPaginatedResponse(MobileNetworkResponseDto)
  async findMany(@Query() dto: FindMobileNetworksDto): Promise<PaginatedResponse<MobileNetworkResponseDto>> {
    const page = await this.mobileNetworks.findMany({
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
      status: dto.status,
      countryCode: dto.countryCode,
      search: dto.search,
    });

    return new PaginatedResponse(this.mapper.toResponses(page.items), page);
  }

  @Get(":id")
  @Authorize(Permissions.MOBILE_NETWORKS_READ)
  @ApiOperation({ summary: "Retrieve a mobile network." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiSuccessResponse(MobileNetworkResponseDto)
  @ApiNotFoundResponse({ description: "Mobile network not found." })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(await this.mobileNetworks.findById(id));
  }

  @Post()
  @Authorize(Permissions.MOBILE_NETWORKS_CREATE)
  @ApiOperation({ summary: "Create a mobile network." })
  @ApiSuccessResponse(MobileNetworkResponseDto)
  async create(@Body() dto: CreateMobileNetworkDto): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(await this.mobileNetworks.create(dto));
  }

  @Put(":id")
  @Authorize(Permissions.MOBILE_NETWORKS_UPDATE)
  @ApiOperation({ summary: "Update a mobile network." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiSuccessResponse(MobileNetworkResponseDto)
  @ApiNotFoundResponse({ description: "Mobile network not found." })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMobileNetworkDto,
  ): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(await this.mobileNetworks.update(id, dto));
  }

  @Delete(":id")
  @Authorize(Permissions.MOBILE_NETWORKS_DELETE)
  @ApiOperation({ summary: "Delete a mobile network." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.mobileNetworks.delete(id);
  }

  @Post(":id/enable")
  @Authorize(Permissions.MOBILE_NETWORKS_ENABLE)
  @ApiOperation({ summary: "Enable a mobile network." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiSuccessResponse(MobileNetworkResponseDto)
  async enable(@Param("id", ParseUUIDPipe) id: string): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(await this.mobileNetworks.enable(id));
  }

  @Post(":id/disable")
  @Authorize(Permissions.MOBILE_NETWORKS_DISABLE)
  @ApiOperation({ summary: "Disable a mobile network." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiSuccessResponse(MobileNetworkResponseDto)
  async disable(@Param("id", ParseUUIDPipe) id: string): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(await this.mobileNetworks.disable(id));
  }

  @Get(":id/prefixes")
  @Authorize(Permissions.MOBILE_NETWORKS_READ)
  @ApiOperation({ summary: "Retrieve mobile network prefixes for a mobile network." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiPaginatedResponse(MobileNetworkPrefixResponseDto)
  async findManyPrefixes(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() dto: FindMobileNetworkPrefixesDto,
  ): Promise<PaginatedResponse<MobileNetworkPrefixResponseDto>> {
    const page = await this.mobileNetworks.findManyPrefixes(id, {
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });

    return new PaginatedResponse(this.mapper.toPrefixResponses(page.items), page);
  }

  @Post(":id/prefixes")
  @Authorize(Permissions.MOBILE_NETWORKS_CREATE)
  @ApiOperation({ summary: "Create a mobile network prefix." })
  @ApiSuccessResponse(MobileNetworkPrefixResponseDto)
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  async createPrefix(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMobileNetworkPrefixDto,
  ): Promise<MobileNetworkPrefixResponseDto> {
    return this.mapper.toPrefixResponse(await this.mobileNetworks.createPrefix(id, dto));
  }

  @Get(":id/prefixes/:prefixId")
  @Authorize(Permissions.MOBILE_NETWORKS_READ)
  @ApiOperation({ summary: "Retrieve a mobile network prefix." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiParam({ name: "prefixId", description: "Mobile network prefix identifier." })
  @ApiSuccessResponse(MobileNetworkPrefixResponseDto)
  async findPrefixById(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("prefixId", ParseUUIDPipe) prefixId: string,
  ): Promise<MobileNetworkPrefixResponseDto> {
    return this.mapper.toPrefixResponse(await this.mobileNetworks.findPrefixById(id, prefixId));
  }

  @Put(":id/prefixes/:prefixId")
  @Authorize(Permissions.MOBILE_NETWORKS_UPDATE)
  @ApiOperation({ summary: "Update a mobile network prefix." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiParam({ name: "prefixId", description: "Mobile network prefix identifier." })
  @ApiSuccessResponse(MobileNetworkPrefixResponseDto)
  async updatePrefix(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("prefixId", ParseUUIDPipe) prefixId: string,
    @Body() dto: UpdateMobileNetworkPrefixDto,
  ): Promise<MobileNetworkPrefixResponseDto> {
    return this.mapper.toPrefixResponse(await this.mobileNetworks.updatePrefix(id, prefixId, dto));
  }

  @Delete(":id/prefixes/:prefixId")
  @Authorize(Permissions.MOBILE_NETWORKS_DELETE)
  @ApiOperation({ summary: "Delete a mobile network prefix." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiParam({ name: "prefixId", description: "Mobile network prefix identifier." })
  async deletePrefix(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("prefixId", ParseUUIDPipe) prefixId: string,
  ): Promise<void> {
    await this.mobileNetworks.deletePrefix(id, prefixId);
  }

  @Post(":id/prefixes/:prefixId/enable")
  @Authorize(Permissions.MOBILE_NETWORKS_ENABLE)
  @ApiOperation({ summary: "Enable a mobile network prefix." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiParam({ name: "prefixId", description: "Mobile network prefix identifier." })
  @ApiSuccessResponse(MobileNetworkPrefixResponseDto)
  async enablePrefix(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("prefixId", ParseUUIDPipe) prefixId: string,
  ): Promise<MobileNetworkPrefixResponseDto> {
    return this.mapper.toPrefixResponse(await this.mobileNetworks.enablePrefix(id, prefixId));
  }

  @Post(":id/prefixes/:prefixId/disable")
  @Authorize(Permissions.MOBILE_NETWORKS_DISABLE)
  @ApiOperation({ summary: "Disable a mobile network prefix." })
  @ApiParam({ name: "id", description: "Mobile network identifier." })
  @ApiParam({ name: "prefixId", description: "Mobile network prefix identifier." })
  @ApiSuccessResponse(MobileNetworkPrefixResponseDto)
  async disablePrefix(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("prefixId", ParseUUIDPipe) prefixId: string,
  ): Promise<MobileNetworkPrefixResponseDto> {
    return this.mapper.toPrefixResponse(await this.mobileNetworks.disablePrefix(id, prefixId));
  }
}
