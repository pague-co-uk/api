import {
  applyDecorators,
  Type,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from "@nestjs/swagger";

import { ApiCollectionResponseDto } from "../common/interfaces/api-collection.response.interface.js";

export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
  description = "Request completed successfully.",
) {
  return applyDecorators(
    ApiExtraModels(
      ApiCollectionResponseDto,
      model,
    ),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          {
            $ref: getSchemaPath(
              ApiCollectionResponseDto,
            ),
          },
          {
            properties: {
              data: {
                type: "array",
                items: {
                  $ref: getSchemaPath(model),
                },
              },
            },
          },
        ],
      },
    }),
  );
}