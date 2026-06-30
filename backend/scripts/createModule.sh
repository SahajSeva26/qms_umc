#!/bin/bash

# Check if entity name is provided
if [ -z "$1" ]; then
  echo "❌ Please provide an entity name (e.g. user, company)"
  exit 1
fi

ENTITY=$1
BASE_PATH="src/modules/$ENTITY"

# Create directory
mkdir -p $BASE_PATH

# Create files
touch $BASE_PATH/$ENTITY.controller.ts
touch $BASE_PATH/$ENTITY.model.ts
touch $BASE_PATH/$ENTITY.service.ts
touch $BASE_PATH/$ENTITY.routes.ts
touch $BASE_PATH/$ENTITY.dto.ts
touch $BASE_PATH/$ENTITY.types.ts
touch $BASE_PATH/$ENTITY.constants.ts
touch $BASE_PATH/$ENTITY.validators.ts

# Optional: add basic boilerplate
echo "// ${ENTITY^} Controller" > $BASE_PATH/$ENTITY.controller.ts
echo "// ${ENTITY^} Model" > $BASE_PATH/$ENTITY.model.ts
echo "// ${ENTITY^} Service" > $BASE_PATH/$ENTITY.service.ts
echo "// ${ENTITY^} Routes" > $BASE_PATH/$ENTITY.routes.ts
echo "// ${ENTITY^} DTO" > $BASE_PATH/$ENTITY.dto.ts
echo "// ${ENTITY^} Types" > $BASE_PATH/$ENTITY.types.ts
echo "// ${ENTITY^} Constants" > $BASE_PATH/$ENTITY.constants.ts
echo "// ${ENTITY^} Validators" > $BASE_PATH/$ENTITY.validators.ts

echo "✅ Module '$ENTITY' created at $BASE_PATH"