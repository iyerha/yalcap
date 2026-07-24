package com.yalcap.security;

import com.yalcap.acl.GroupRepository;
import com.yalcap.acl.UserRepository;
import com.yalcap.acl.external.ExternalParticipantRepository;
import com.yalcap.security.adapter.AclSubjectProvider;

import tools.jackson.databind.ObjectMapper;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
@EnableConfigurationProperties(SubjectProviderProperties.class)
public class SubjectProviderConfiguration {

    @Bean(name = "acl")
    SubjectProvider aclSubjectProvider(UserRepository userRepository,
                                       GroupRepository groupRepository,
                                       ExternalParticipantRepository externalParticipantRepository,
                                       ObjectMapper objectMapper) {
        return new AclSubjectProvider(userRepository, groupRepository, externalParticipantRepository, objectMapper);
    }

    @Bean
    SubjectProviderRegistry subjectProviderRegistry(Map<String, SubjectProvider> providers) {
        return new SubjectProviderRegistry(providers);
    }

    @Bean
    TenantSubjectProviderResolver tenantSubjectProviderResolver(SubjectProviderRegistry registry,
                                                               SubjectProviderProperties properties) {
        return new DefaultTenantSubjectProviderResolver(registry, properties);
    }
}