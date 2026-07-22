package com.yalcap.definition.workflow.step;

import java.util.List;

public record StepTypeClientAssets(
        List<String> designerJs,
        List<String> designerCss
) {
    public static final StepTypeClientAssets NONE = new StepTypeClientAssets(
            List.of(),
            List.of()
    );

    public static StepTypeClientAssets designerJsOnly(String... assets) {
        return new StepTypeClientAssets(
                sanitize(assets),
                List.of()
        );
    }

    public static StepTypeClientAssets designerCssOnly(String... assets) {
        return new StepTypeClientAssets(
                List.of(),
                sanitize(assets)
        );
    }

    public static StepTypeClientAssets designerAssets(String[] designerJs, String[] designerCss) {
        return new StepTypeClientAssets(
                sanitize(designerJs),
                sanitize(designerCss)
        );
    }

    private static List<String> sanitize(String[] assets) {
        if (assets == null || assets.length == 0) {
            return List.of();
        }

        return java.util.Arrays.stream(assets)
                .filter(item -> item != null && !item.trim().isEmpty())
                .map(String::trim)
                .distinct()
                .toList();
    }
}
