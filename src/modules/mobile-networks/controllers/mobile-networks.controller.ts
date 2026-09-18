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

import { CreateMobileNetworkDto } from "../dto/create-mobile-network.dto.js";
import { FindMobileNetworksDto } from "../dto/find-mobile-networks.dto.js";
import { MobileNetworkResponseDto } from "../dto/mobile-network.response.dto.js";
import { UpdateMobileNetworkDto } from "../dto/update-mobile-network.dto.js";

import { MobileNetworkMapper } from "../mobile-network.mapper.js";
import { MobileNetworkService } from "../services/mobile-network.service.js";

@ApiTags("Mobile Networks")
@Controller("mobile-networks")
export class MobileNetworksController {
  constructor(
    private readonly mobileNetworks:
      MobileNetworkService,

    private readonly mapper:
      MobileNetworkMapper,
  ) { }

  // =========================================================================
  // Find Many
  // =========================================================================

  @Get()
  @Authorize(
    Permissions.MOBILE_NETWORKS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve a paginated list of mobile networks.",
  })
  @ApiPaginatedResponse(
    MobileNetworkResponseDto,
  )
  async findMany(
    @Query()
    dto: FindMobileNetworksDto,
  ): Promise<
    PaginatedResponse<MobileNetworkResponseDto>
  > {
    const page =
      await this.mobileNetworks.findMany({
        page:
          dto.page ?? 1,

        pageSize:
          dto.pageSize ?? 20,

        status:
          dto.status,

        countryCode:
          dto.countryCode,

        search:
          dto.search,
      });

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  // =========================================================================
  // Find By ID
  // =========================================================================

  @Get(":id")
  @Authorize(
    Permissions.MOBILE_NETWORKS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve a mobile network.",
  })
  @ApiParam({
    name: "id",
    description:
      "Mobile network identifier.",
  })
  @ApiSuccessResponse(
    MobileNetworkResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Mobile network not found.",
  })
  async findById(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,
  ): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(
      await this.mobileNetworks.findById(
        id,
      ),
    );
  }

  // =========================================================================
  // Create
  // =========================================================================

  @Post()
  @Authorize(
    Permissions.MOBILE_NETWORKS_CREATE,
  )
  @ApiOperation({
    summary:
      "Create a mobile network.",
  })
  @ApiSuccessResponse(
    MobileNetworkResponseDto,
  )
  async create(
    @Body()
    dto: CreateMobileNetworkDto,
  ): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(
      await this.mobileNetworks.create(
        dto,
      ),
    );
  }

  // =========================================================================
  // Update
  // =========================================================================

  @Put(":id")
  @Authorize(
    Permissions.MOBILE_NETWORKS_UPDATE,
  )
  @ApiOperation({
    summary:
      "Update a mobile network.",
  })
  @ApiParam({
    name: "id",
    description:
      "Mobile network identifier.",
  })
  @ApiSuccessResponse(
    MobileNetworkResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Mobile network not found.",
  })
  async update(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @Body()
    dto: UpdateMobileNetworkDto,
  ): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(
      await this.mobileNetworks.update(
        id,
        dto,
      ),
    );
  }

  // =========================================================================
  // Delete
  // =========================================================================

  @Delete(":id")
  @Authorize(
    Permissions.MOBILE_NETWORKS_DELETE,
  )
  @ApiOperation({
    summary:
      "Delete a mobile network.",
  })
  @ApiParam({
    name: "id",
    description:
      "Mobile network identifier.",
  })
  async delete(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,
  ): Promise<void> {
    await this.mobileNetworks.delete(
      id,
    );
  }

  // =========================================================================
  // Enable
  // =========================================================================

  @Post(":id/enable")
  @Authorize(
    Permissions.MOBILE_NETWORKS_ENABLE,
  )
  @ApiOperation({
    summary:
      "Enable a mobile network.",
  })
  @ApiParam({
    name: "id",
    description:
      "Mobile network identifier.",
  })
  @ApiSuccessResponse(
    MobileNetworkResponseDto,
  )
  async enable(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,
  ): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(
      await this.mobileNetworks.enable(
        id,
      ),
    );
  }

  // =========================================================================
  // Disable
  // =========================================================================

  @Post(":id/disable")
  @Authorize(
    Permissions.MOBILE_NETWORKS_DISABLE,
  )
  @ApiOperation({
    summary:
      "Disable a mobile network.",
  })
  @ApiParam({
    name: "id",
    description:
      "Mobile network identifier.",
  })
  @ApiSuccessResponse(
    MobileNetworkResponseDto,
  )
  async disable(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,
  ): Promise<MobileNetworkResponseDto> {
    return this.mapper.toResponse(
      await this.mobileNetworks.disable(
        id,
      ),
    );
  }
}