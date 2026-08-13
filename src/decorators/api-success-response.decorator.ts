import {
  applyDecorators,
  Type,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from "@nestjs/swagger";

import { ApiSuccessResponseDto } from "../common/interfaces/api-success.response.interface.js";

export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  description = "Request completed successfully.",
) {
  return applyDecorators(
    ApiExtraModels(
      ApiSuccessResponseDto,
      model,
    ),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          {
            $ref: getSchemaPath(
              ApiSuccessResponseDto,
            ),
          },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
            },
          },
        ],
      },
    }),
  );
}