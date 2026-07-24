package com.yalcap.search;

import java.util.List;

public record IndexSchemaSpec(
    List<IndexFieldSpec> searchableFields,
    List<DisplayFieldSpec> displayFields
) {
}
