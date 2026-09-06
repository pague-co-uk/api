import {
  applyDecorators,
  Type,
} from "@nestjs/common";

import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from "@nestjs/swagger";

import {
  ApiSuccessResponseDto,
} from "../common/interfaces/api-success.response.interface.js";

export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  description = "Request completed successfully.",
  isArray = false,
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
              data: isArray
                ? {
                  type: "array",
                  items: {
                    $ref: getSchemaPath(
                      model,
                    ),
                  },
                }
                : {
                  $ref: getSchemaPath(
                    model,
                  ),
                },
            },
          },
        ],
      },
    }),
  );
}