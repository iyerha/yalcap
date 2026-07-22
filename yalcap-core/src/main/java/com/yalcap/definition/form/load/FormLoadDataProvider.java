package com.yalcap.definition.form.load;

public interface FormLoadDataProvider {

    String id();

    default int order() {
        return 0;
    }

    default boolean supports(FormLoadDataContext context) {
        return true;
    }
}
