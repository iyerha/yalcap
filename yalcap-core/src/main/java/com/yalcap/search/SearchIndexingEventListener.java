package com.yalcap.search;

import com.yalcap.definition.WorkflowDefinitionPublishedEvent;
import com.yalcap.engine.WorkflowInstanceSavedEvent;

import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class SearchIndexingEventListener {

    private final SearchIndexService searchIndexService;

    public SearchIndexingEventListener(SearchIndexService searchIndexService) {
        this.searchIndexService = searchIndexService;
    }

    @ApplicationModuleListener
    public void onWorkflowDefinitionPublished(WorkflowDefinitionPublishedEvent event) {
        searchIndexService.indexWorkflowDefinitionEvent(event);
    }

    @ApplicationModuleListener
    public void onWorkflowInstanceSaved(WorkflowInstanceSavedEvent event) {
        searchIndexService.indexWorkflowInstanceEvent(event);
    }  
}