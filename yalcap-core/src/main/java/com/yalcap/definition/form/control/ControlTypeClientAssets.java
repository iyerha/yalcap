package com.yalcap.definition.form.control;

import java.util.List;

public record ControlTypeClientAssets(
        List<String> designerJs,
        List<String> runtimeJs,
        List<String> designerCss,
        List<String> runtimeCss
) {
    public static final ControlTypeClientAssets NONE = new ControlTypeClientAssets(
            List.of(),
            List.of(),
            List.of(),
            List.of()
    );

        public static ControlTypeClientAssets runtimeJsOnly(String... assets) {
                return new ControlTypeClientAssets(
                                List.of(),
                                sanitize(assets),
                                List.of(),
                                List.of()
                );
        }

        public static ControlTypeClientAssets runtimeCssOnly(String... assets) {
                return new ControlTypeClientAssets(
                                List.of(),
                                List.of(),
                                List.of(),
                                sanitize(assets)
                );
        }

        public static ControlTypeClientAssets designerJsOnly(String... assets) {
                return new ControlTypeClientAssets(
                                sanitize(assets),
                                List.of(),
                                List.of(),
                                List.of()
                );
        }

        public static ControlTypeClientAssets designerCssOnly(String... assets) {
                return new ControlTypeClientAssets(
                                List.of(),
                                List.of(),
                                sanitize(assets),
                                List.of()
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
