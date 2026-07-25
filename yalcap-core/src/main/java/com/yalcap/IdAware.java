package com.yalcap;

import java.util.UUID;

public interface IdAware {
    UUID getId();
    void setId(UUID id);
}
